# Monster Meter — Brand & Design Proposal: Arcade/Retro

## Vision

Transform Monster Meter from a clean, modern app into a **retro arcade machine experience** — as if the child is playing a classic coin-op game where their voice is the controller and the monster is the boss they must appease. Loud = bad score. Quiet = winning.

The core mechanic stays identical. The theme wraps it in nostalgia and excitement that kids (and parents) recognize from games.

---

## Brand DNA

| Dimension | Current | Proposed |
|---|---|---|
| Feeling | Clean utility app | Arcade cabinet you want to play |
| Voice | Neutral, functional | Playful, dramatic, game-like |
| Colors | White + purple | Deep scanline dark + neon accents |
| Typography | Fredoka / Nunito (soft, rounded) | Press Start 2P or VT323 (pixel font) |
| Motion | Smooth, polished | Punchy, snappy, pixel-style |
| Reward language | "No danger noise recorded yet" | "ALL CLEAR — KEEP IT DOWN, PLAYER 1" |

---

## Color Palette

```
Background (deep arcade dark):   #0a0a1a  — near-black with blue undertone
Panel (cabinet inset):           #12122a  — slightly lighter dark navy
Panel border (neon glow):        #3d2d6e  — muted purple outline
Accent / primary neon:           #c026d3  — hot magenta/pink (replaces purple #7c3aed)
Accent 2 (secondary neon):       #00e5ff  — cyan (used for dB number, ring)
Safe (green zone):               #39ff14  — neon green
Warning (yellow zone):           #ffd600  — arcade yellow
Danger (red zone):               #ff1744  — saturated red
Text primary:                    #e0e0ff  — soft white-blue
Text muted:                      #6060a0  — dim purple-grey
```

The gauge ring gradient shifts from neon green → arcade yellow → hot red — same logic, punchier colors.

---

## Typography

**Primary display font:** `Press Start 2P` (Google Fonts, free)
- Used for: app title, dB number, nav labels, section headers
- Feel: unmistakably 8-bit, high readability at large sizes

**Secondary body font:** `VT323` (Google Fonts, free)
- Used for: card body text, metadata, settings labels
- Feel: classic terminal/CRT, highly legible at 16px+, very low weight cost

**Fallback stack:** monospace

---

## Key UI Changes

### Top Bar
- Title becomes: `MONSTER METER` in all-caps pixel font, with magenta "METER"
- Optional: small blinking `INSERT COIN` or `PLAYER 1` badge beside it

### dB Number
- Displayed in cyan neon (`#00e5ff`) with a cyan glow `text-shadow`
- Scales up aggressively on loud levels (existing scale animation, just more dramatic)
- At "very mad" threshold: color switches to hot red and pulses

### Gauge Ring
- Same conic-gradient logic, colors replaced with the neon palette above
- The dimmed (unlit) section uses a very dark overlay — like unlit arcade bulbs
- Threshold tick becomes a bright white/cyan notch — "the danger line"

### Monster Stage
- Dark circle behind monster (like a CRT screen inset into the cabinet)
- Subtle scanline texture using CSS repeating linear gradient (pure CSS, no image)
- "VERY MAD" state: ring flashes neon red, monster shakes harder

### Alert Flash
- Instead of soft red radial gradient: full-screen scanline flicker in red, then snap back

### Bottom Nav
- Dark bar, active tab highlighted with neon magenta underline + label color
- Tab labels in pixel font

### Buttons
- `START LISTENING` → **`PRESS START`** — big, coin-yellow, pixel-font
- `STOP` stays red but styled as a cabinet button
- Ghost/secondary buttons: dark panel with neon border

### Last Danger Readout
- Styled as a score panel: `HIGH SCORE` label above, the dB value right-justified in pixel font
- When ready to tap: border glows cyan and pulses

### Rec Badge
- Replaced with: `● REC` in pixel font, blinking dot, red neon color
- Idle: `○ ARMED` in dim muted color

### Settings Cards
- Card headers in pixel font, rest in VT323
- Toggle switch: styled as a chunky arcade toggle (same HTML, different CSS)
- Slider track: dark channel with neon-colored fill
- Monster selection cards: dark with neon border when selected

### Clips Tab
- Each clip card is a "score entry" — timestamp left, peak dB right in red neon
- Delete button styled as `[ERASE]` in danger color

---

## Copywriting Changes (Arcade Voice)

| Current | Proposed |
|---|---|
| "Start listening" | "PRESS START" |
| "Grant microphone access to wake the monster." | "INSERT MIC TO PLAY" |
| "No danger noise recorded yet" | "ALL CLEAR — KEEP IT DOWN!" |
| "Last danger noise level recorded: X dB" | "DANGER LEVEL: X dB" |
| "Tap to hear clip ↗" | "► REPLAY" |
| "Recording clip…" | "● CAPTURING…" |
| "Armed" | "○ ARMED" |
| "Stop" | "GAME OVER" |
| "Pick your monster" | "SELECT CHARACTER" |
| "Trigger" | "ALARM ZONE" |
| "Threshold alert" | "ALARM SOUND" |
| "Calibration" | "SENSOR TUNE" |

---

## What stays the same

- All layout structure (topbar / screen / bottom nav)
- All component logic and animations (bob, shake, xfade)
- Monster artwork (the pixel-art aesthetic actually fits the retro theme well)
- Gauge geometry (ring, tick, threshold)
- Audio engine — zero changes

---

## Implementation scope

1. **CSS variables** (`styles.css` lines 1–9) — swap 6 values
2. **Font imports** (`index.html`) — add Press Start 2P + VT323 from Google Fonts
3. **CSS rules** — update colors, add scanline mixin, restyle buttons/nav/cards
4. **Copy strings** (`App.tsx`, `Monitor.tsx`, `Settings.tsx`) — ~10 string changes
5. **No logic changes** — pure presentation layer

Estimated: ~2–3 hours of focused CSS + string work.
