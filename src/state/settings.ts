import type { ThemePref } from "./theme";

export interface CustomSound {
  id: string;
  name: string;
  dataUrl: string;
}

export type Emotion = "happy" | "indifferent" | "mad" | "veryMad";

export function emotionForLevel(db: number, thresholdDb: number): Emotion {
  if (db >= thresholdDb) return "veryMad";
  const r = thresholdDb > 0 ? db / thresholdDb : 0;
  if (r >= 0.85) return "mad";
  if (r >= 0.6) return "indifferent";
  return "happy";
}

export interface Settings {
  thresholdDb: number;
  alertEnabled: boolean;
  alertPhrase: string;
  alertSounds: string[];
  customSounds: CustomSound[];
  vibrateEnabled: boolean;
  alertVolume: number;
  preRollSec: number;
  postRollSec: number;
  calibrationDb: number;
  monsterId: string;
  theme: ThemePref;
}

export const DEFAULT_SETTINGS: Settings = {
  thresholdDb: 100,
  alertEnabled: true,
  alertPhrase: "",
  alertSounds: ["nile"],
  customSounds: [],
  vibrateEnabled: true,
  alertVolume: 0.8,
  preRollSec: 3,
  postRollSec: 3,
  calibrationDb: 100,
  monsterId: "thunderpuff",
  theme: "system",
};

const KEY = "monster-meter-settings";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
  }
}

export const CALIBRATION_MIN_DB = 40;
export const CALIBRATION_MAX_DB = 140;

export const GAUGE_MIN_DB = 30;
export const GAUGE_MAX_DB = 120;

export function dbToFraction(db: number): number {
  const f = (db - GAUGE_MIN_DB) / (GAUGE_MAX_DB - GAUGE_MIN_DB);
  return Math.max(0, Math.min(1, f));
}
