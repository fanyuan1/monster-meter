import { encodeWav } from "./wav";
import { playAlert } from "./alert";
import type { SoundSpec } from "./alert";

export interface RecordedClip {
  blob: Blob;
  durationSec: number;
  peakDb: number;
  sampleRate: number;
  createdAt: number;
}

export interface EngineConfig {
  thresholdDb: number;
  preRollSec: number;
  postRollSec: number;
  calibrationDb: number;
  alertEnabled: boolean;
  alertPhrase: string;
  alertVolume: number;
  alertSounds: SoundSpec[];
}

type LevelListener = (db: number) => void;
type RecStateListener = (recording: boolean) => void;
type ClipListener = (clip: RecordedClip) => void;
type ThresholdListener = (db: number) => void;

const PROCESSOR_BUFFER = 4096;
const ALERT_COOLDOWN_SEC = 1.2;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private mutedGain: GainNode | null = null;

  private cfg: EngineConfig;

  private ring = new Float32Array(0);
  private ringWrite = 0;
  private ringFilled = false;

  private recording = false;
  private captureChunks: Float32Array[] = [];
  private recordUntil = 0;
  private capturePeakDb = -Infinity;

  private wasAbove = false;
  private lastAlertAt = -Infinity;

  private measuring: { sumSq: number; n: number } | null = null;

  private rafId = 0;
  private analyserBuf = new Float32Array(0);
  private smoothedDb = 0;

  private levelListeners = new Set<LevelListener>();
  private recStateListeners = new Set<RecStateListener>();
  private clipListeners = new Set<ClipListener>();
  private thresholdListeners = new Set<ThresholdListener>();

  running = false;

  constructor(cfg: EngineConfig) {
    this.cfg = cfg;
  }

  onLevel(fn: LevelListener) {
    this.levelListeners.add(fn);
    return () => {
      this.levelListeners.delete(fn);
    };
  }
  onRecStateChange(fn: RecStateListener) {
    this.recStateListeners.add(fn);
    return () => {
      this.recStateListeners.delete(fn);
    };
  }
  onClip(fn: ClipListener) {
    this.clipListeners.add(fn);
    return () => {
      this.clipListeners.delete(fn);
    };
  }
  onThreshold(fn: ThresholdListener) {
    this.thresholdListeners.add(fn);
    return () => {
      this.thresholdListeners.delete(fn);
    };
  }

  updateConfig(cfg: EngineConfig) {
    const preRollChanged = cfg.preRollSec !== this.cfg.preRollSec;
    this.cfg = cfg;
    if (preRollChanged && this.ctx) this.allocateRing();
  }

  private allocateRing() {
    if (!this.ctx) return;
    const len = Math.max(1, Math.ceil(this.cfg.preRollSec * this.ctx.sampleRate));
    this.ring = new Float32Array(len);
    this.ringWrite = 0;
    this.ringFilled = false;
  }

  async start() {
    if (this.running) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") await this.ctx.resume();

    this.source = this.ctx.createMediaStreamSource(this.stream);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.4;
    this.analyserBuf = new Float32Array(this.analyser.fftSize);
    this.source.connect(this.analyser);

    this.allocateRing();

    this.processor = this.ctx.createScriptProcessor(PROCESSOR_BUFFER, 1, 1);
    this.processor.onaudioprocess = this.handleAudioProcess;
    this.mutedGain = this.ctx.createGain();
    this.mutedGain.gain.value = 0;
    this.source.connect(this.processor);
    this.processor.connect(this.mutedGain);
    this.mutedGain.connect(this.ctx.destination);

    this.wasAbove = false;
    this.lastAlertAt = -Infinity;
    this.running = true;
    this.loop();
  }

  async stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    if (this.recording) this.finalizeClip();
    this.processor?.disconnect();
    this.analyser?.disconnect();
    this.source?.disconnect();
    this.mutedGain?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.ctx && this.ctx.state !== "closed") await this.ctx.close();
    this.ctx = null;
    this.processor = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
  }

  async measureDbfs(sec: number): Promise<number> {
    if (!this.running) throw new Error("Microphone is not running");
    this.measuring = { sumSq: 0, n: 0 };
    await new Promise((r) => setTimeout(r, sec * 1000));
    const m = this.finishMeasuring();
    if (!m || m.n === 0 || m.sumSq === 0) throw new Error("No audio captured");
    return 10 * Math.log10(m.sumSq / m.n);
  }

  private finishMeasuring() {
    const m = this.measuring;
    this.measuring = null;
    return m;
  }

  private rmsToDb(rms: number): number {
    if (rms <= 0) return 0;
    const db = 20 * Math.log10(rms) + this.cfg.calibrationDb;
    return Math.max(0, db);
  }

  private writeToRing(input: Float32Array) {
    const ring = this.ring;
    if (ring.length === 0) return;
    for (const sample of input) {
      ring[this.ringWrite] = sample;
      this.ringWrite++;
      if (this.ringWrite >= ring.length) {
        this.ringWrite = 0;
        this.ringFilled = true;
      }
    }
  }

  private notifyThreshold(ctx: AudioContext, db: number) {
    this.lastAlertAt = ctx.currentTime;
    this.thresholdListeners.forEach((fn) => fn(db));
    if (this.cfg.alertEnabled) {
      playAlert(ctx, {
        phrase: this.cfg.alertPhrase,
        volume: this.cfg.alertVolume,
        sounds: this.cfg.alertSounds,
      });
    }
  }

  private captureChunk(input: Float32Array, db: number, now: number) {
    this.captureChunks.push(new Float32Array(input));
    if (db > this.capturePeakDb) this.capturePeakDb = db;
    if (now >= this.recordUntil) this.finalizeClip();
  }

  private handleAudioProcess = (e: AudioProcessingEvent) => {
    const ctx = this.ctx;
    if (!ctx) return;
    const input = e.inputBuffer.getChannelData(0);
    const n = input.length;

    this.writeToRing(input);

    let sum = 0;
    for (const sample of input) sum += sample * sample;
    const db = this.rmsToDb(Math.sqrt(sum / n));
    if (this.measuring) {
      this.measuring.sumSq += sum;
      this.measuring.n += n;
    }

    const now = ctx.currentTime;
    const above = db >= this.cfg.thresholdDb;

    if (above) {
      if (!this.recording) this.startRecording();
      this.recordUntil = now + this.cfg.postRollSec;
    }

    if (above && !this.wasAbove && now - this.lastAlertAt >= ALERT_COOLDOWN_SEC) {
      this.notifyThreshold(ctx, db);
    }
    this.wasAbove = above;

    if (this.recording) this.captureChunk(input, db, now);
  };

  private startRecording() {
    this.recording = true;
    this.captureChunks = [];
    this.capturePeakDb = -Infinity;

    const ring = this.ring;
    if (ring.length > 0) {
      if (this.ringFilled) {
        this.captureChunks.push(ring.slice(this.ringWrite));
        this.captureChunks.push(ring.slice(0, this.ringWrite));
      } else {
        this.captureChunks.push(ring.slice(0, this.ringWrite));
      }
    }

    this.recStateListeners.forEach((fn) => fn(true));
  }

  private finalizeClip() {
    if (!this.recording || !this.ctx) return;
    this.recording = false;

    const total = this.captureChunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of this.captureChunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    this.captureChunks = [];

    const sampleRate = this.ctx.sampleRate;
    const clip: RecordedClip = {
      blob: encodeWav(merged, sampleRate),
      durationSec: merged.length / sampleRate,
      peakDb: this.capturePeakDb === -Infinity ? 0 : this.capturePeakDb,
      sampleRate,
      createdAt: Date.now(),
    };

    this.recStateListeners.forEach((fn) => fn(false));
    this.clipListeners.forEach((fn) => fn(clip));
  }

  private loop = () => {
    if (!this.running || !this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.analyserBuf);
    let sum = 0;
    for (const sample of this.analyserBuf) {
      sum += sample * sample;
    }
    const db = this.rmsToDb(Math.sqrt(sum / this.analyserBuf.length));
    const k = db > this.smoothedDb ? 0.6 : 0.15;
    this.smoothedDb += (db - this.smoothedDb) * k;
    this.levelListeners.forEach((fn) => fn(this.smoothedDb));
    this.rafId = requestAnimationFrame(this.loop);
  };
}
