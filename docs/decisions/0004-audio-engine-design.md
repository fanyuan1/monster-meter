# 0004. Audio engine design

## Context
The app must save a clip that includes sound from before a trigger, alert without spam, and draw a smooth meter.

## Decision
- `AudioEngine` owns the microphone graph: source to analyser (smooth meter), and source to processor to a muted gain to destination (sample capture and trigger).
- The muted gain (value 0) keeps the processor node alive without audible feedback.
- Keep a continuous ring buffer of the last `preRollSec` of audio. A clip starts with that pre-roll.
- While recording, every threshold crossing pushes the post-roll deadline forward. Sustained noise extends the clip.
- Copy each input block before storing it in a clip, because the browser reuses the buffer.
- Test the alert sound in Settings with a lazily created `AudioContext`, so the Test button works before the mic engine runs.
- Ignore the rejection of `AudioContext.resume()` in the Test button. Browsers reject it when autoplay policy blocks audio, and the user hears nothing and can tap again.
- Ignore the rejection of `engine.stop()` when `App` unmounts. No UI is left to show an error, and the page is going away.

## Consequences
- The processor runs on the audio thread. Keep its callback cheap.
