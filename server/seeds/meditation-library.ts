import { db } from "../db";
import { meditationLibrary, type InsertMeditationLibraryItem } from "@shared/schema";
import { sql } from "drizzle-orm";

// 30 starter meditations across themes/durations.
// Each script is concise, faith-neutral guided text under ~250 words.
// `slug` is the idempotency key — re-seeding never duplicates rows.

const SEED: InsertMeditationLibraryItem[] = [
  // ─── Calm (5 / 10 / 15 / 20 / 30) ───────────────────────────────────────────
  {
    slug: "calm-5-anchor-breath",
    title: "Anchor Breath",
    theme: "calm",
    durationMinutes: 5,
    description: "A short reset to settle a busy mind.",
    scriptText: "Find a comfortable seat. Let your eyes close softly. Take one deep breath in… and let it out fully. Notice the natural rhythm of your breath. Don't change it. Just observe. With each inhale, feel a small wave of calm enter. With each exhale, let any tightness dissolve. If thoughts arise, simply name them — thinking — and return to the breath. Stay here for the next few minutes. Your only job is to breathe and notice. When you're ready, gently open your eyes.",
  },
  {
    slug: "calm-10-body-soften",
    title: "Body Soften",
    theme: "calm",
    durationMinutes: 10,
    description: "Release tension from head to toe.",
    scriptText: "Settle in. Let your shoulders drop away from your ears. Take three slow breaths. Now, bring attention to the top of your head. Soften. Move to your forehead — soften. Jaw — let it hang. Neck and shoulders — release. Notice your chest, your belly, rising and falling. Soften your arms, your hands, your fingers. Move down through your hips, your legs, your feet. Anywhere you find tension, breathe into it and let it melt. Rest in the quiet field of the body. Stay for several breaths. When ready, return.",
  },
  {
    slug: "calm-15-stillness-pool",
    title: "Pool of Stillness",
    theme: "calm",
    durationMinutes: 15,
    description: "Drop beneath surface noise into deep stillness.",
    scriptText: "Sit comfortably. Imagine you are standing at the edge of a still pool. The surface ripples with thoughts and noise from your day. That's okay. Watch the ripples without trying to smooth them. Now, very slowly, imagine yourself sinking beneath the surface. Down past the ripples. Down into the deep, still water below. Here, it is quiet. Here, nothing is required of you. Rest here as long as you'd like. The surface ripples continue, but you are below them. You are the pool itself. Take your time. When ready, slowly rise to the surface and open your eyes.",
  },
  {
    slug: "calm-20-mountain",
    title: "Mountain Steadiness",
    theme: "calm",
    durationMinutes: 20,
    description: "Embody the unshakable calm of a mountain.",
    scriptText: "Sit upright. Imagine yourself as a mountain. Vast. Ancient. Rooted. Storms pass. Seasons change. Visitors come and go. The mountain remains. Feel the weight of your body settling into the earth. Feel your spine rising like a peak toward the sky. Breathe slowly. As thoughts arise — weather. As feelings arise — weather. You are not the weather. You are the mountain. Stay with this image. Each breath grounds you deeper. Nothing to do. Nowhere to be. Just be the mountain.",
  },
  {
    slug: "calm-30-deep-rest",
    title: "Deep Rest",
    theme: "calm",
    durationMinutes: 30,
    description: "An extended stillness practice for deep nervous-system reset.",
    scriptText: "Lie down or sit fully supported. Close your eyes. Take five slow breaths, each exhale longer than the inhale. Allow your body to feel heavy. Imagine sinking — into the floor, into the earth. With every breath, sink deeper. Your only task is to rest. Notice sounds, but don't follow them. Notice thoughts, but don't argue with them. Let everything be exactly as it is. Stay in this rest for as long as you can. Periodically, return to the breath. When you're ready, very slowly, begin to wiggle fingers and toes. Take your time returning.",
  },

  // ─── Focus (5 / 10 / 15 / 20) ───────────────────────────────────────────────
  {
    slug: "focus-5-one-point",
    title: "One Point of Focus",
    theme: "focus",
    durationMinutes: 5,
    description: "Sharpen attention with single-pointed awareness.",
    scriptText: "Sit upright. Choose one point — your breath at the nostrils, or a single word like 'here'. For the next few minutes, your only task is to keep attention on that one point. When the mind wanders — and it will — gently return. No frustration. The returning is the practice. Each return strengthens focus. Begin now.",
  },
  {
    slug: "focus-10-counting-breaths",
    title: "Counting Breaths",
    theme: "focus",
    durationMinutes: 10,
    description: "Build mental stamina by counting breath cycles.",
    scriptText: "Sit comfortably. Begin counting each exhale: one… two… three… up to ten. Then start over at one. If you lose count, simply begin again at one. No judgment. The mind will wander. Each return is a rep. Continue for the full session.",
  },
  {
    slug: "focus-15-clear-mind",
    title: "Clear Mind for Work",
    theme: "focus",
    durationMinutes: 15,
    description: "Prepare the mind for deep work.",
    scriptText: "Sit upright with feet on the floor. Take five sharp inhales and long slow exhales. Imagine your mind as a cluttered desk. With each breath, clear one item. Open browser tabs — closed. Worries about other tasks — set aside. The conversation from earlier — released. With each exhale, the desk gets cleaner. Until only one space remains: the work in front of you. Hold this clean space. When you open your eyes, move directly into the task.",
  },
  {
    slug: "focus-20-laser",
    title: "Laser Attention",
    theme: "focus",
    durationMinutes: 20,
    description: "Train sustained, narrow attention.",
    scriptText: "Sit with spine erect. Choose your anchor — the breath at the upper lip. Place 100% of your attention there. For 20 minutes, do not allow attention to leave this small spot. When it does, return immediately. This is a workout for the prefrontal cortex. Each return is a rep. Stay disciplined. The practice is the returning.",
  },

  // ─── Sleep (10 / 15 / 20 / 30) ──────────────────────────────────────────────
  {
    slug: "sleep-10-letting-go",
    title: "Letting Go for Sleep",
    theme: "sleep",
    durationMinutes: 10,
    description: "Release the day before bed.",
    scriptText: "Lie in bed comfortably. Close your eyes. Take three slow breaths. Now, mentally review your day — but don't analyze. Just acknowledge: this happened, that happened. With each acknowledgement, let it go. Anything left undone — release it. The day is over. There is nothing more to do tonight. Soften your face. Soften your jaw. Feel your body sinking into the mattress. Let sleep find you when it's ready.",
  },
  {
    slug: "sleep-15-body-scan-night",
    title: "Nighttime Body Scan",
    theme: "sleep",
    durationMinutes: 15,
    description: "A slow body scan to drift into sleep.",
    scriptText: "Lying in bed, begin at the crown of your head. Bring soft attention to it. Move to your forehead… eyes… cheeks… jaw. Each part softens. Move to neck, shoulders, arms, hands. Then chest, belly, lower back. Hips. Thighs. Calves. Feet. By the time you reach your toes, your whole body should feel heavy and warm. If you're still awake, return to the crown and begin again. You will likely sleep before you finish.",
  },
  {
    slug: "sleep-20-counting-down",
    title: "Counting Down to Sleep",
    theme: "sleep",
    durationMinutes: 20,
    description: "Use a slow countdown to enter sleep.",
    scriptText: "Lie down. Take a few deep breaths. Begin counting down from 50, slowly. With each number, feel yourself sinking deeper. 50… 49… 48… If you lose track, gently begin again at 50. Most people don't make it to one. Surrender to the count. Surrender to sleep.",
  },
  {
    slug: "sleep-30-yoga-nidra",
    title: "Yogic Sleep (Nidra)",
    theme: "sleep",
    durationMinutes: 30,
    description: "Deep restorative rest at the edge of sleep.",
    scriptText: "Lie flat on your back. Set a quiet intention for rest. Bring awareness to your right thumb… index finger… middle… ring… pinky. Now palm. Wrist. Forearm. Repeat with the left hand. Slowly move through both legs, the torso, the head. Now feel the whole body at once. Notice heaviness. Notice lightness. Notice warmth. Rest in pure awareness. If sleep comes, allow it. If not, the rest itself is restorative.",
  },

  // ─── Grief (10 / 15 / 20) ───────────────────────────────────────────────────
  {
    slug: "grief-10-soft-witness",
    title: "Soft Witness",
    theme: "grief",
    durationMinutes: 10,
    description: "Be with grief without trying to fix it.",
    scriptText: "Sit somewhere comfortable. Place a hand on your heart. Acknowledge: something hurts right now. You don't have to name it. You don't have to explain it. Just let it be here. Breathe slowly. Imagine yourself as a kind witness to your own pain — the way you would sit with a beloved friend who is hurting. No advice. No fixing. Just presence. Stay here as long as you need.",
  },
  {
    slug: "grief-15-tender-breath",
    title: "Tender Breath",
    theme: "grief",
    durationMinutes: 15,
    description: "Breathe gently with what hurts.",
    scriptText: "Sit or lie down. Place both hands on your chest. Take a slow breath — let it be tender, not deep. Notice the heaviness in your chest, your throat, behind your eyes. Don't push it away. Imagine each breath is a soft hand offering comfort. Whatever rises — sadness, anger, longing — let it move through. You are safe to feel it. After a while, simply rest. The grief doesn't leave, but it is held now.",
  },
  {
    slug: "grief-20-letting-the-tears",
    title: "Permission to Feel",
    theme: "grief",
    durationMinutes: 20,
    description: "An invitation to let grief move.",
    scriptText: "Find a private space. Sit comfortably. Take a few slow breaths. Now, silently say: 'I give myself permission to feel everything I'm feeling.' Repeat. Notice what arises. Tears may come. A heavy chest. A wave. Let it come. Do nothing to stop it. Grief moves through us when we stop blocking it. After the wave, rest. You may need a blanket, water. Be very gentle with yourself for the rest of the day.",
  },

  // ─── Gratitude (5 / 10 / 15) ────────────────────────────────────────────────
  {
    slug: "gratitude-5-three-thanks",
    title: "Three Thanks",
    theme: "gratitude",
    durationMinutes: 5,
    description: "A short practice to anchor in appreciation.",
    scriptText: "Sit comfortably. Close your eyes. Take three slow breaths. Now, bring to mind one thing from today you are grateful for. Feel the warmth of it. Linger. Now a second thing — perhaps small. Linger. Now a third. Let the warmth fill your chest. End with a silent 'thank you' — to whoever or whatever you wish to thank.",
  },
  {
    slug: "gratitude-10-loving-pause",
    title: "Loving Pause for Gratitude",
    theme: "gratitude",
    durationMinutes: 10,
    description: "A heart-opening gratitude practice.",
    scriptText: "Sit with your spine relaxed. Place a hand over your heart. Bring to mind one person who has loved you well. See their face. Feel the warmth they offer. Silently thank them. Now bring to mind one experience from your life that shaped you for the better. Thank it. Now your own body — for carrying you this far. Thank it. Sit in the warmth of this gratitude for several breaths.",
  },
  {
    slug: "gratitude-15-broad-thanks",
    title: "Wide-Field Gratitude",
    theme: "gratitude",
    durationMinutes: 15,
    description: "Expand gratitude to the unseen.",
    scriptText: "Sit comfortably. Begin by thanking something obvious — the chair, the air, the moment. Now widen. Thank the people who grew the food you ate today. Thank the strangers who built the road, made your clothes, kept the lights on. Thank ancestors you never met. Thank the planet. Thank the present moment for holding all of this together. Sit in this wide field of thanks.",
  },

  // ─── Energy (5 / 10) ────────────────────────────────────────────────────────
  {
    slug: "energy-5-bright-breath",
    title: "Bright Breath",
    theme: "energy",
    durationMinutes: 5,
    description: "Quick energizing breathwork.",
    scriptText: "Sit upright. Take 20 short, sharp inhales through the nose, with quick passive exhales. Then take one long deep breath in. Hold for 5 seconds. Exhale fully. Repeat the cycle three times. Feel your body wake up. End with one slow centering breath. Open your eyes.",
  },
  {
    slug: "energy-10-rise-up",
    title: "Rise Up",
    theme: "energy",
    durationMinutes: 10,
    description: "Build vitality from the ground up.",
    scriptText: "Stand tall, feet hip-width apart. Take a few breaths. Imagine roots extending from your feet into the earth, drawing up energy. Feel it travel through your legs, into your hips, up your spine, through your chest, your shoulders, into the crown of your head. Now imagine that energy radiating out from your skin. With each inhale, draw more in. With each exhale, radiate. Continue for several minutes. Open your eyes feeling alive.",
  },

  // ─── Release (10 / 15) ──────────────────────────────────────────────────────
  {
    slug: "release-10-let-it-go",
    title: "Let It Go",
    theme: "release",
    durationMinutes: 10,
    description: "Release something that's been holding you.",
    scriptText: "Sit quietly. Close your eyes. Bring to mind one thing you've been holding — a worry, a grudge, an outcome. Picture it as a small object in your hand. Notice its weight. Now imagine setting it down. You don't have to throw it away. Just set it down beside you for the duration of this practice. You can pick it up later if you want to. For now, sit with empty hands. Breathe. Notice the spaciousness.",
  },
  {
    slug: "release-15-river",
    title: "River of Letting Go",
    theme: "release",
    durationMinutes: 15,
    description: "Watch what no longer serves you flow downstream.",
    scriptText: "Sit comfortably and imagine yourself on a riverbank. The water flows steadily past. Bring to mind whatever you're ready to release — worry, an old story, a regret. Imagine placing it on a leaf and setting it on the water. Watch it drift downstream and out of sight. Bring up the next one. Place it on a leaf. Let it go. Continue with anything that arises. The river takes everything. When the bank is clear, simply sit and watch the water.",
  },

  // ─── Connection (10 / 15) ───────────────────────────────────────────────────
  {
    slug: "connection-10-loving-kindness",
    title: "Simple Loving-Kindness",
    theme: "connection",
    durationMinutes: 10,
    description: "Send kind wishes outward.",
    scriptText: "Sit with eyes closed. Bring to mind someone you love easily. Silently wish: 'May you be happy. May you be safe. May you be at peace.' Feel the warmth. Now wish the same for yourself: 'May I be happy. May I be safe. May I be at peace.' Now extend it to someone neutral — a stranger from today. Same wishes. Finally, extend it to all beings everywhere. Rest in the warmth.",
  },
  {
    slug: "connection-15-shared-breath",
    title: "Shared Breath",
    theme: "connection",
    durationMinutes: 15,
    description: "Feel connection through the simple act of breathing.",
    scriptText: "Sit comfortably. Begin to breathe naturally. Now, become aware: at this very moment, billions of people are breathing too. Babies. Elders. People in joy. People in pain. Each one breathing. Feel that you are part of this enormous, silent rhythm. With each breath, feel less alone. You belong to this. We are all breathing together right now.",
  },

  // ─── Clarity (10 / 15) ──────────────────────────────────────────────────────
  {
    slug: "clarity-10-blank-page",
    title: "Blank Page",
    theme: "clarity",
    durationMinutes: 10,
    description: "Empty the mind to make space for clarity.",
    scriptText: "Sit upright. Take three slow breaths. Imagine your mind as a chalkboard covered in scribbles — every thought, plan, worry. With each exhale, wipe one section clean. Keep going. Make the chalkboard completely blank. Sit with the blank space. Don't fill it. Just rest in the openness. Often, real clarity arises from emptiness — not effort.",
  },
  {
    slug: "clarity-15-question-holder",
    title: "Holding the Question",
    theme: "clarity",
    durationMinutes: 15,
    description: "Sit with an open question without rushing to answer.",
    scriptText: "Sit quietly. Bring to mind a question you've been wrestling with. Don't try to solve it. Just hold it gently — like holding a small bird. Breathe with it. When the mind tries to grab an answer, soften and just keep holding the question. The wisest answers often emerge when we stop chasing them. Sit. Hold. Breathe. Trust.",
  },
];

export async function seedMeditationLibrary(): Promise<void> {
  try {
    // Idempotent insert: ON CONFLICT on slug. We DO update audioUrl so
    // existing rows pick up the guided-audio endpoint added in this task
    // without requiring a destructive reseed.
    for (const item of SEED) {
      const audioUrl = `/api/meditations/audio/${item.slug}`;
      await db
        .insert(meditationLibrary)
        .values({ ...item, audioUrl })
        .onConflictDoUpdate({
          target: meditationLibrary.slug,
          set: { audioUrl },
        });
    }
    const result = await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM meditation_library`
    );
    const rows = (result as unknown as { rows?: Array<{ count: number }> }).rows ?? [];
    console.log(`[seed:meditation-library] ${rows[0]?.count ?? "?"} rows in meditation_library`);
  } catch (err) {
    console.warn("[seed:meditation-library] skipped:", (err as Error).message);
  }
}
