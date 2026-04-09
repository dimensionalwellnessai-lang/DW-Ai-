import AppIntents
import Foundation

// MARK: - Base helper

private func openDeepLink(_ urlString: String) {
    guard let url = URL(string: urlString) else { return }
    UIApplication.shared.open(url, options: [:], completionHandler: nil)
}

// MARK: - StartDayIntent

struct StartDayIntent: AppIntent {
    static let title: LocalizedStringResource = "Start My Day in DW"
    static let description = IntentDescription(
        "Opens DW and shows your daily briefing — today's schedule, goals, and guidance.",
        categoryName: "Daily Routines"
    )
    static let openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        openDeepLink("dwai://action?type=day_start&source=siri&autoVoice=1")
        return .result()
    }
}

// MARK: - AskWhatsNextIntent

struct AskWhatsNextIntent: AppIntent {
    static let title: LocalizedStringResource = "Ask DW What's Next"
    static let description = IntentDescription(
        "Opens DW voice mode and immediately tells you your next scheduled item.",
        categoryName: "Daily Routines"
    )
    static let openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        openDeepLink("dwai://action?type=whats_next&source=siri&autoVoice=1")
        return .result()
    }
}

// MARK: - LogMoodIntent

struct LogMoodIntent: AppIntent {
    static let title: LocalizedStringResource = "Log My Mood in DW"
    static let description = IntentDescription(
        "Opens DW to quickly log how you're feeling right now.",
        categoryName: "Wellness Check-Ins"
    )
    static let openAppWhenRun: Bool = true

    @Parameter(title: "Mood", description: "How are you feeling? (e.g. calm, anxious, energised)")
    var mood: String?

    @Parameter(title: "Energy Level", description: "Your energy level from 1 to 10")
    var energyLevel: Int?

    func perform() async throws -> some IntentResult {
        var urlString = "dwai://action?type=mood_log&source=siri"
        if let mood = mood { urlString += "&mood=\(mood.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? mood)" }
        if let energy = energyLevel { urlString += "&energy=\(energy)" }
        openDeepLink(urlString)
        return .result()
    }
}

// MARK: - AddTaskIntent

struct AddTaskIntent: AppIntent {
    static let title: LocalizedStringResource = "Add a Task in DW"
    static let description = IntentDescription(
        "Quickly add a task or note to DW.",
        categoryName: "Tasks & Planning"
    )
    static let openAppWhenRun: Bool = true

    @Parameter(title: "Task Title", description: "What do you need to do?")
    var taskTitle: String?

    func perform() async throws -> some IntentResult {
        var urlString = "dwai://action?type=task_add&source=siri"
        if let title = taskTitle {
            urlString += "&title=\(title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? title)"
        }
        openDeepLink(urlString)
        return .result()
    }
}

// MARK: - StartWorkoutIntent

struct StartWorkoutIntent: AppIntent {
    static let title: LocalizedStringResource = "Start a Workout in DW"
    static let description = IntentDescription(
        "Opens DW to browse or start a workout.",
        categoryName: "Wellness Check-Ins"
    )
    static let openAppWhenRun: Bool = true

    @Parameter(title: "Workout Type", description: "e.g. strength, cardio, yoga, stretch")
    var workoutType: String?

    func perform() async throws -> some IntentResult {
        var urlString = "dwai://action?type=workout_start&source=siri"
        if let type_ = workoutType {
            urlString += "&workoutType=\(type_.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? type_)"
        }
        openDeepLink(urlString)
        return .result()
    }
}

// MARK: - OpenVoiceModeIntent

struct OpenVoiceModeIntent: AppIntent {
    static let title: LocalizedStringResource = "Talk to DW"
    static let description = IntentDescription(
        "Opens DW's voice conversation mode — speak directly with your AI wellness guide.",
        categoryName: "Daily Routines"
    )
    static let openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        openDeepLink("dwai://action?type=voice&source=siri&autoVoice=1")
        return .result()
    }
}
