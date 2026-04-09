# DW Widget & App Intents — Xcode Setup

These files are ready to add to your Xcode project. Follow the steps below.

---

## 1. Add App Intents to the main app target

1. Open `ios/App/App.xcworkspace` in Xcode.
2. In the Project Navigator, right-click the **App** group → **Add Files to "App"**.
3. Select both:
   - `App/DWAppIntents.swift`
   - `App/DWAppShortcuts.swift`
4. Ensure **Target Membership** → **App** is checked.
5. In **Signing & Capabilities**, ensure `NSUserActivityTypes` or App Intents entitlement is present. For App Intents this is automatic with the framework import.
6. Minimum iOS target must be **16.0** for App Intents / App Shortcuts.

---

## 2. Create the Widget Extension target

1. **File → New → Target → Widget Extension**.
2. Name it `DWWidget`. Uncheck "Include Configuration Intent".
3. In the new target group, **delete** the default generated files and **add** (using Add Files):
   - `DWWidget/DWWidget.swift`
   - `DWWidget/DWWidgetBundle.swift`
4. In **Build Settings** for the widget target, set:
   - **SWIFT_VERSION** = 5.9
   - **IPHONEOS_DEPLOYMENT_TARGET** = 16.0
5. In the widget target's **Info.plist**, add:
   - `NSExtension → NSExtensionPointIdentifier` = `com.apple.widgetkit-extension`

---

## 3. App Group (optional but recommended for shared data)

To share data between the app and widget in future:
1. Add an **App Group** capability to both the App and DWWidget targets.
2. Use identifier `group.com.reilbrown.fliptheswitch`.
3. Access shared `UserDefaults` via `UserDefaults(suiteName: "group.com.reilbrown.fliptheswitch")`.

---

## 4. Siri / App Shortcuts

App Shortcuts are automatically available after adding `DWAppShortcuts.swift` to the app target. No additional setup needed — they appear in Siri suggestions and Shortcuts app automatically once the app is run on a real device.

---

## 5. Deep Link scheme

The `dwai://` URL scheme is already registered in `Info.plist`. All widget buttons and Siri intents open deep links in this format:

```
dwai://action?type=<action>&source=<siri|widget|shortcut>&autoVoice=1
```

Supported `type` values: `voice`, `day_start`, `whats_next`, `mood_log`, `task_add`, `workout_start`
