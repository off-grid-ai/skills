---
name: oga-devices
description: How to run and drive the Off Grid AI apps on the Mac, iPhone and Android. Load before running an app, a build or a device check.
---

# Devices

1. **Verify live, by hand.** One tap, check the screen, next tap. No unattended tap scripts.
2. **Phones run the dev app.** `npm run android -- --active-arch-only` or `npm run ios:device`, Metro 8081. Never raw `gradlew` or `xcodebuild`.
3. **Drive them yourself:** iPhone via WebDriverAgent, Android via adb, desktop dev app via CDP. Ask Ali only to unlock, plug in or sign.
4. **One owner** per device, app and port.
5. **Mind the Mac.** `arch -arm64` for heavy commands. One heavy job at a time. Jest `--maxWorkers=2`, touched files. Check `df -h /` and swap first.
6. **Test data only.** Chats named `[test]`, app-made photos. Never Ali's chats, photos or contacts.
7. **Dev app ≠ signed build.** Never pass a signed-build check on the dev app.
