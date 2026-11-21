export type ThemePref = "system" | "light" | "dark";

const THEME_COLORS = { light: "#ffffff", dark: "#141c2f" } as const;

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function effective(pref: ThemePref): "light" | "dark" {
  if (pref === "system") return darkQuery.matches ? "dark" : "light";
  return pref;
}

function paint(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.dataset.theme = pref;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[effective(pref)]);
}

export function applyTheme(pref: ThemePref): () => void {
  paint(pref);
  if (pref !== "system") return () => {};
  const onChange = () => paint("system");
  darkQuery.addEventListener("change", onChange);
  return () => darkQuery.removeEventListener("change", onChange);
}
