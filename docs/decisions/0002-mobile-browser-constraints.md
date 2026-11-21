# 0002. Mobile browser constraints

## Context
The meter runs on phones that listen for a long time.

## Decision
- Request a screen wake lock while listening. A locked screen usually kills the microphone. The browser drops the lock when the page is hidden, so the app acquires it again on return. If the request is denied (for example by battery saver), the meter still works.
- Ignore rejections from `WakeLockSentinel.release()`. The lock is already gone or the page is closing, and nothing is left to recover. The acquire function already handles request failures, so its promise is marked ignored.
- Detect the Vibration API at runtime and hide the vibrate toggle when it is missing. iOS Safari has no Vibration API.
- Clear the file input value after each upload in `Settings.tsx`. Browsers fire no change event when the user picks the same file again.

## Consequences
- The wake lock request can fail silently. Do not rely on it.
- The vibrate setting has no effect on iOS.
