import AppIntents

// MARK: - App Shortcuts Provider
// This file registers all DW App Shortcuts so users can invoke them via Siri
// without setting anything up first. Phrases must include the app name "DW".

struct DWAppShortcutsProvider: AppShortcutsProvider {

    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenVoiceModeIntent(),
            phrases: [
                "Talk to \(.applicationName)",
                "Open \(.applicationName) voice mode",
                "Chat with \(.applicationName)",
            ],
            shortTitle: "Talk to DW",
            systemImageName: "mic.fill"
        )

        AppShortcut(
            intent: StartDayIntent(),
            phrases: [
                "Start my day in \(.applicationName)",
                "Open \(.applicationName) daily briefing",
                "Show my day in \(.applicationName)",
            ],
            shortTitle: "Start My Day",
            systemImageName: "sun.max.fill"
        )

        AppShortcut(
            intent: AskWhatsNextIntent(),
            phrases: [
                "Ask \(.applicationName) what's next",
                "What's next in \(.applicationName)",
                "What's coming up in \(.applicationName)",
            ],
            shortTitle: "What's Next",
            systemImageName: "calendar"
        )

        AppShortcut(
            intent: LogMoodIntent(),
            phrases: [
                "Log my mood in \(.applicationName)",
                "Check in with \(.applicationName)",
                "How am I feeling in \(.applicationName)",
            ],
            shortTitle: "Log Mood",
            systemImageName: "heart.fill"
        )

        AppShortcut(
            intent: AddTaskIntent(),
            phrases: [
                "Add a task in \(.applicationName)",
                "Add to \(.applicationName)",
                "Remind me in \(.applicationName)",
            ],
            shortTitle: "Add Task",
            systemImageName: "plus.circle.fill"
        )

        AppShortcut(
            intent: StartWorkoutIntent(),
            phrases: [
                "Start a workout in \(.applicationName)",
                "Start my workout in \(.applicationName)",
                "Open \(.applicationName) workout",
            ],
            shortTitle: "Start Workout",
            systemImageName: "figure.run"
        )
    }
}
