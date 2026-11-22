import { useCallback, useEffect, useRef, useState } from "react";
import { AudioEngine } from "./audio/AudioEngine";
import type { EngineConfig, RecordedClip } from "./audio/AudioEngine";
import { resolveSounds } from "./audio/sounds";
import { Monitor } from "./components/Monitor";
import { Clips } from "./components/Clips";
import { Settings } from "./components/Settings";
import { MONSTERS } from "./components/Monster";
import { addClip } from "./storage/clips";
import { applyTheme } from "./state/theme";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings as SettingsType,
} from "./state/settings";

type Tab = "monitor" | "clips" | "settings";

function toEngineConfig(s: SettingsType): EngineConfig {
  return {
    thresholdDb: s.thresholdDb,
    preRollSec: s.preRollSec,
    postRollSec: s.postRollSec,
    calibrationDb: s.calibrationDb,
    alertEnabled: s.alertEnabled,
    alertPhrase: s.alertPhrase,
    alertVolume: s.alertVolume,
    alertSounds: resolveSounds(s),
  };
}

function NavIcon({ name }: { name: Tab }) {
  const common = {
    className: "ico",
    viewBox: "0 0 24 24",
    width: 24,
    height: 24,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "monitor") {
    return (
      <svg {...common}>
        <path d="M4 15a8 8 0 0 1 16 0" />
        <path d="M12 15l4-4" />
        <circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === "clips") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M10 9.5l4.5 2.5-4.5 2.5z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <circle cx="9" cy="9" r="2.4" fill="var(--bg)" />
      <circle cx="15" cy="15" r="2.4" fill="var(--bg)" />
    </svg>
  );
}

function loadInitialSettings(): SettingsType {
  const s = loadSettings();
  if (!MONSTERS.some((m) => m.id === s.monsterId)) s.monsterId = DEFAULT_SETTINGS.monsterId;
  return s;
}

function logError(error: unknown) {
  console.error(error);
}

function micErrorMessage(e: unknown): string {
  const name = e instanceof Error ? e.name : undefined;
  if (name === "NotAllowedError") {
    return "Microphone permission denied. Enable it in your browser settings.";
  }
  if (name === "NotFoundError") return "No microphone found on this device.";
  return "Could not access the microphone. (Mic needs HTTPS or localhost.)";
}

async function storeClip(clip: RecordedClip): Promise<string> {
  const id = `${clip.createdAt}-${Math.random().toString(36).slice(2, 8)}`;
  await addClip({
    id,
    blob: clip.blob,
    durationSec: clip.durationSec,
    peakDb: clip.peakDb,
    createdAt: clip.createdAt,
  });
  return id;
}

function useEngineEvents(engine: AudioEngine, vibrateEnabled: boolean) {
  const [clipsKey, setClipsKey] = useState(0);
  const [mDb, setMDb] = useState<number | null>(null);
  const [mClipId, setMClipId] = useState<string | null>(null);
  const awaitingMClip = useRef(false);
  const vibrateRef = useRef(vibrateEnabled);
  vibrateRef.current = vibrateEnabled;

  useEffect(() => {
    return engine.onClip((clip: RecordedClip) => {
      void storeClip(clip)
        .then((id) => {
          if (awaitingMClip.current) {
            awaitingMClip.current = false;
            setMClipId(id);
          }
          setClipsKey((k) => k + 1);
        })
        .catch(logError);
    });
  }, [engine]);

  useEffect(() => {
    return engine.onThreshold((db) => {
      if (vibrateRef.current && "vibrate" in navigator) navigator.vibrate([200, 100, 200]);
      setMDb(Math.round(db));
      setMClipId(null);
      awaitingMClip.current = true;
    });
  }, [engine]);

  const bumpClipsKey = useCallback(() => setClipsKey((k) => k + 1), []);
  return { clipsKey, mDb, mClipId, bumpClipsKey };
}

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const l = await navigator.wakeLock.request("screen");
        if (cancelled) void l.release();
        else lock = l;
      } catch {
      }
    };
    const onVisibilityChange = () => {
      void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void lock?.release();
    };
  }, [active]);
}

function useMicControl(engine: AudioEngine, onStopped: () => void) {
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(() => {
    setError(null);
    setStarting(true);
    void engine
      .start()
      .then(() => setRunning(true))
      .catch((e: unknown) => setError(micErrorMessage(e)))
      .finally(() => setStarting(false));
  }, [engine]);

  const stop = useCallback(() => {
    void engine
      .stop()
      .then(() => {
        setRunning(false);
        onStopped();
      })
      .catch(logError);
  }, [engine, onStopped]);

  return { running, starting, error, start, stop };
}

function BottomNav({ tab, onSelect }: { tab: Tab; onSelect: (tab: Tab) => void }) {
  const items: { id: Tab; label: string }[] = [
    { id: "monitor", label: "Monitor" },
    { id: "clips", label: "Clips" },
    { id: "settings", label: "Settings" },
  ];
  return (
    <nav className="nav">
      {items.map((item) => (
        <button
          key={item.id}
          className={tab === item.id ? "active" : ""}
          onClick={() => onSelect(item.id)}
        >
          <NavIcon name={item.id} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function App() {
  const [settings, setSettings] = useState<SettingsType>(loadInitialSettings);
  const [tab, setTab] = useState<Tab>("monitor");
  const [highlightClipId, setHighlightClipId] = useState<string | null>(null);

  const engineRef = useRef<AudioEngine | null>(null);
  engineRef.current ??= new AudioEngine(toEngineConfig(settings));
  const engine = engineRef.current;

  const { clipsKey, mDb, mClipId, bumpClipsKey } = useEngineEvents(engine, settings.vibrateEnabled);
  const { running, starting, error, start, stop } = useMicControl(engine, bumpClipsKey);
  useWakeLock(running);

  useEffect(() => applyTheme(settings.theme), [settings.theme]);

  useEffect(() => {
    engine.updateConfig(toEngineConfig(settings));
    saveSettings(settings);
  }, [engine, settings]);

  useEffect(() => {
    return () => {
      void engine.stop();
    };
  }, [engine]);

  const updateSettings = useCallback((patch: Partial<SettingsType>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const handleOpenMClip = useCallback(() => {
    setTab("clips");
    if (mClipId) setHighlightClipId(mClipId);
  }, [mClipId]);

  return (
    <div className="app">
      <div className="topbar">
        <h1>
          Monster<span className="accent">Meter</span>
        </h1>
      </div>

      <div className="screen">
        {tab === "monitor" && (
          <Monitor
            engine={engine}
            running={running}
            starting={starting}
            error={error}
            monsterId={settings.monsterId}
            thresholdDb={settings.thresholdDb}
            mDb={mDb}
            mHasClip={mClipId !== null}
            onOpenMClip={handleOpenMClip}
            onStart={start}
            onStop={stop}
          />
        )}
        {tab === "clips" && (
          <Clips
            refreshKey={clipsKey}
            highlightClipId={highlightClipId}
            onHighlightDone={() => setHighlightClipId(null)}
          />
        )}
        {tab === "settings" && (
          <Settings
            settings={settings}
            onChange={updateSettings}
            engine={engine}
            running={running}
            starting={starting}
            onStart={start}
          />
        )}
      </div>

      <BottomNav tab={tab} onSelect={setTab} />
    </div>
  );
}
