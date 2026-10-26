import { useState } from "react";
import type { AudioEngine } from "../audio/AudioEngine";
import { CALIBRATION_MAX_DB, CALIBRATION_MIN_DB } from "../state/settings";

interface Props {
  engine: AudioEngine;
  running: boolean;
  starting: boolean;
  calibrationDb: number;
  onStart: () => void;
  onCalibrate: (offsetDb: number) => void;
}

type Mode = "meter" | "quiet";

const MEASURE_SEC = 3;
/** Typical reading for a quiet room at night; good enough without a reference meter. */
const QUIET_ROOM_DB = 35;

/**
 * Guided calibration: measure the raw mic level, then pick the offset that
 * makes it read a known value (a reference meter's reading, or a quiet room).
 */
export function Calibrate({ engine, running, starting, calibrationDb, onStart, onCalibrate }: Props) {
  const [mode, setMode] = useState<Mode>("meter");
  const [refDb, setRefDb] = useState("");
  const [measuring, setMeasuring] = useState(false);
  const [result, setResult] = useState<{ offset: number; previous: number; clamped: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const target = mode === "meter" ? Number(refDb) : QUIET_ROOM_DB;
  const targetValid = mode === "quiet" || (refDb !== "" && target >= 20 && target <= 130);

  const measure = async () => {
    setError(null);
    setResult(null);
    setMeasuring(true);
    try {
      const dbfs = await engine.measureDbfs(MEASURE_SEC);
      const raw = Math.round(target - dbfs);
      const offset = Math.min(CALIBRATION_MAX_DB, Math.max(CALIBRATION_MIN_DB, raw));
      setResult({ offset, previous: calibrationDb, clamped: offset !== raw });
      onCalibrate(offset);
    } catch {
      setError("Measurement failed. Make sure the microphone is on, then try again.");
    } finally {
      setMeasuring(false);
    }
  };

  return (
    <div className="calibrate">
      <div className="sound-grid">
        <button
          className={`sound-chip ${mode === "meter" ? "selected" : ""}`}
          onClick={() => setMode("meter")}
        >
          Match a meter
        </button>
        <button
          className={`sound-chip ${mode === "quiet" ? "selected" : ""}`}
          onClick={() => setMode("quiet")}
        >
          Quiet room
        </button>
      </div>

      {mode === "meter" ? (
        <>
          <ol className="steps">
            <li>Hold this phone next to a sound-level meter or a meter app.</li>
            <li>Make a steady sound, such as a fan or running water.</li>
            <li>Type the meter's reading, then tap Measure. Keep the sound steady for {MEASURE_SEC} s.</li>
          </ol>
          <div className="field">
            <div className="label">
              <span>Reference reading</span>
            </div>
            <input
              type="number"
              inputMode="numeric"
              className="text-input"
              placeholder="e.g. 70"
              value={refDb}
              onChange={(e) => setRefDb(e.target.value)}
            />
          </div>
        </>
      ) : (
        <ol className="steps">
          <li>Go to a quiet room. Stay silent.</li>
          <li>Tap Measure. The current level is set to read {QUIET_ROOM_DB} dB.</li>
          <li>This is approximate. Use "Match a meter" for accuracy.</li>
        </ol>
      )}

      {running ? (
        <button className="btn" style={{ width: "100%" }} disabled={!targetValid || measuring} onClick={measure}>
          {measuring ? `Measuring… (${MEASURE_SEC} s)` : "Measure"}
        </button>
      ) : (
        <button className="btn ghost" style={{ width: "100%" }} disabled={starting} onClick={onStart}>
          {starting ? "Starting…" : "Turn on microphone to calibrate"}
        </button>
      )}

      {error && <p className="sub calibrate-msg">{error}</p>}
      {result && (
        <p className="sub calibrate-msg">
          Offset set to {result.offset} dB
          {result.clamped && " (limit reached; the reading may still be off)"}.{" "}
          <button className="link" onClick={() => { onCalibrate(result.previous); setResult(null); }}>
            Undo
          </button>
        </p>
      )}
    </div>
  );
}
