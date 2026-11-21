# 0003. Displayed dB scale, calibration, and moods

## Context
Web Audio has no absolute SPL reference. A raw dBFS reading is not a familiar loudness number.

## Decision
- Add `calibrationDb` to the raw dBFS reading to get the displayed dB. This maps the device level onto a familiar scale of about 0 to 120 dB.
- The calibration wizard measures the raw level and picks the offset that makes it read a known value. The known value is a reference meter reading, or 35 dB for a typical quiet room at night. The wizard works without a reference meter.
- Map the displayed dB to a mood in `emotionForLevel`. "veryMad" is reserved for breaching the threshold. The band below the threshold is split from happy to mad.

## Consequences
- Readings are estimates, not measured SPL.
- The offset range and the gauge range are constants in `src/state/settings.ts`.
