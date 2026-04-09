import WidgetKit
import SwiftUI

// MARK: - Deep link helpers

private func deepLink(_ action: String) -> URL {
    URL(string: "dwai://action?type=\(action)&source=widget&autoVoice=1")!
}

// MARK: - Timeline entry

struct DWEntry: TimelineEntry {
    let date: Date
    let greeting: String
    let subtitle: String
}

// MARK: - Provider

struct DWProvider: TimelineProvider {
    func placeholder(in context: Context) -> DWEntry {
        DWEntry(date: Date(), greeting: "Good morning", subtitle: "Ready to build momentum?")
    }

    func getSnapshot(in context: Context, completion: @escaping (DWEntry) -> Void) {
        completion(makeEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DWEntry>) -> Void) {
        let entry = makeEntry()
        // Refresh every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func makeEntry() -> DWEntry {
        let hour = Calendar.current.component(.hour, from: Date())
        let greeting: String
        let subtitle: String
        switch hour {
        case 0..<12:
            greeting = "Good morning"
            subtitle = "Ready to start strong?"
        case 12..<17:
            greeting = "Good afternoon"
            subtitle = "How's your momentum?"
        default:
            greeting = "Good evening"
            subtitle = "Reflect and recharge."
        }
        return DWEntry(date: Date(), greeting: greeting, subtitle: subtitle)
    }
}

// MARK: - Small Widget View

struct DWSmallWidgetView: View {
    let entry: DWEntry

    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(Color(.systemBackground))

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 4) {
                    Image(systemName: "sparkles")
                        .font(.caption2.bold())
                        .foregroundColor(.purple)
                    Text("DW")
                        .font(.caption2.bold())
                        .foregroundColor(.purple)
                }

                Spacer()

                Text(entry.greeting)
                    .font(.subheadline.bold())
                    .foregroundColor(.primary)
                    .lineLimit(2)

                Text(entry.subtitle)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(2)

                Spacer()

                HStack(spacing: 8) {
                    Link(destination: deepLink("voice")) {
                        Label("Talk", systemImage: "mic.fill")
                            .font(.caption2.bold())
                            .foregroundColor(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.purple)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(14)
        }
    }
}

// MARK: - Medium Widget View

struct DWMediumWidgetView: View {
    let entry: DWEntry

    private let actions: [(String, String, String, String)] = [
        ("Talk to DW",    "mic.fill",       "voice",        "#7C3AED"),
        ("Start Day",     "sun.max.fill",   "day_start",    "#F59E0B"),
        ("Log Mood",      "heart.fill",     "mood_log",     "#EC4899"),
        ("Add Task",      "plus.circle",    "task_add",     "#3B82F6"),
        ("Workout",       "figure.run",     "workout_start","#10B981"),
        ("What's Next",   "calendar",       "whats_next",   "#6366F1"),
    ]

    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(Color(.systemBackground))

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "sparkles")
                            .font(.caption.bold())
                            .foregroundColor(.purple)
                        Text("DW · Dimensional Wellness")
                            .font(.caption.bold())
                            .foregroundColor(.purple)
                    }
                    Spacer()
                    Text(entry.greeting)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                    ForEach(actions, id: \.0) { action in
                        Link(destination: deepLink(action.2)) {
                            VStack(spacing: 4) {
                                Image(systemName: action.1)
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(Color(hex: action.3))
                                Text(action.0)
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(.primary)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.7)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color(hex: action.3).opacity(0.08))
                            .cornerRadius(10)
                        }
                    }
                }
            }
            .padding(14)
        }
    }
}

// MARK: - Color hex helper

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8) & 0xFF) / 255
            b = Double(int & 0xFF) / 255
        default:
            r = 0; g = 0; b = 0
        }
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Widget configuration

struct DWWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: DWEntry

    var body: some View {
        switch family {
        case .systemSmall:
            DWSmallWidgetView(entry: entry)
        case .systemMedium:
            DWMediumWidgetView(entry: entry)
        default:
            DWSmallWidgetView(entry: entry)
        }
    }
}

struct DWWidget: Widget {
    let kind: String = "DWWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DWProvider()) { entry in
            DWWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Dimensional Wellness")
        .description("Quick access to your DW wellness guide.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Preview

#if DEBUG
#Preview(as: .systemMedium) {
    DWWidget()
} timeline: {
    DWEntry(date: Date(), greeting: "Good morning", subtitle: "Ready to start strong?")
}
#endif
