import nileUrl from "../assets/nile-danger.m4a";
import type { Settings } from "../state/settings";
import type { SoundSpec } from "./alert";

export interface SoundOption {
  id: string;
  name: string;
}

export const BUILTIN_SOUNDS: SoundOption[] = [
  { id: "siren", name: "Siren" },
  { id: "beep", name: "Beep" },
  { id: "nile", name: "Nile" },
];

export function resolveSound(id: string, settings: Settings): SoundSpec | null {
  if (id === "siren") return { kind: "siren" };
  if (id === "beep") return { kind: "beep" };
  if (id === "nile") return { kind: "file", url: nileUrl };
  const custom = settings.customSounds.find((c) => c.id === id);
  return custom ? { kind: "file", url: custom.dataUrl } : null;
}

export function resolveSounds(settings: Settings): SoundSpec[] {
  return settings.alertSounds
    .map((id) => resolveSound(id, settings))
    .filter((s): s is SoundSpec => s !== null);
}
