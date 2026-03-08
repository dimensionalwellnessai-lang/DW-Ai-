/**
 * Numerology Engine — in-house computation module for Cosmic Hub.
 *
 * All calculations are purely local (no API calls). Implements the Pythagorean
 * system and supports master numbers 11, 22, and 33.
 */

// ─── Pythagorean letter→digit map ─────────────────────────────────────────────
export const PYTHAGOREAN: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
};

export const MASTER_NUMBERS = new Set([11, 22, 33]);

// ─── Core reduction ────────────────────────────────────────────────────────────

/**
 * Reduces a number by digit-summing until it reaches a single digit or a
 * master number (11, 22, 33).
 */
export function reduceNumber(n: number): number {
  while (n > 9 && !MASTER_NUMBERS.has(n)) {
    n = String(n)
      .split("")
      .reduce((s, d) => s + Number(d), 0);
  }
  return n;
}

// ─── Core number computations ──────────────────────────────────────────────────

/**
 * Life Path — derived from the full birth date (YYYY-MM-DD).
 * All digits of the date are summed then reduced.
 */
export function calcLifePath(birthDate: string): number {
  const digits = birthDate.replace(/-/g, "").split("").map(Number);
  return reduceNumber(digits.reduce((s, d) => s + d, 0));
}

/**
 * Expression (Destiny) Number — derived from all letters of the full birth name
 * using the Pythagorean system.
 */
export function calcExpression(name: string): number {
  const total = name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .reduce((s, c) => s + (PYTHAGOREAN[c] ?? 0), 0);
  return reduceNumber(total);
}

/**
 * Soul Urge (Heart's Desire) Number — derived from the vowels of the full
 * birth name using the Pythagorean system.
 */
export function calcSoulUrge(name: string): number {
  const VOWELS = "AEIOU";
  const total = name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .filter(c => VOWELS.includes(c))
    .reduce((s, c) => s + (PYTHAGOREAN[c] ?? 0), 0);
  return reduceNumber(total || 1);
}

// ─── Cycle computations ────────────────────────────────────────────────────────

/**
 * Personal Year — sum of birth month + birth day + the given calendar year,
 * reduced to a single digit.
 *
 * @param birthDate  ISO date string "YYYY-MM-DD"
 * @param forYear    Calendar year to compute for; defaults to current year
 */
export function calcPersonalYear(birthDate: string, forYear?: number): number {
  const date = new Date(birthDate);
  const year = forYear ?? new Date().getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return reduceNumber(month + day + year);
}

/**
 * Personal Month — Personal Year + the given calendar month, reduced.
 *
 * @param birthDate  ISO date string "YYYY-MM-DD"
 * @param forYear    Calendar year; defaults to current year
 * @param forMonth   Calendar month (1–12); defaults to current month
 */
export function calcPersonalMonth(
  birthDate: string,
  forYear?: number,
  forMonth?: number,
): number {
  const personalYear = calcPersonalYear(birthDate, forYear);
  const month = forMonth ?? new Date().getMonth() + 1;
  return reduceNumber(personalYear + month);
}

/**
 * Personal Day — Personal Month + the given calendar day, reduced.
 *
 * @param birthDate  ISO date string "YYYY-MM-DD"
 * @param forYear    Calendar year; defaults to current year
 * @param forMonth   Calendar month (1–12); defaults to current month
 * @param forDay     Calendar day of month; defaults to current day
 */
export function calcPersonalDay(
  birthDate: string,
  forYear?: number,
  forMonth?: number,
  forDay?: number,
): number {
  const personalMonth = calcPersonalMonth(birthDate, forYear, forMonth);
  const day = forDay ?? new Date().getDate();
  return reduceNumber(personalMonth + day);
}

// ─── Meanings ──────────────────────────────────────────────────────────────────

export interface NumerologyMeaning {
  title: string;
  desc: string;
}

export const LIFE_PATH_MEANINGS: Record<number, NumerologyMeaning> = {
  1: { title: "The Leader", desc: "Independent, pioneering, original. You're here to lead and innovate." },
  2: { title: "The Diplomat", desc: "Cooperative, sensitive, intuitive. You thrive in partnership and bring balance." },
  3: { title: "The Creator", desc: "Expressive, joyful, imaginative. You're here to inspire through creativity." },
  4: { title: "The Builder", desc: "Practical, disciplined, dependable. You create lasting foundations." },
  5: { title: "The Explorer", desc: "Adventurous, versatile, freedom-loving. You're here to experience life fully." },
  6: { title: "The Nurturer", desc: "Responsible, caring, harmonious. You're here to serve and support." },
  7: { title: "The Seeker", desc: "Analytical, spiritual, introspective. You're here to seek deeper truth." },
  8: { title: "The Powerhouse", desc: "Ambitious, authoritative, material. You're here to master the material world." },
  9: { title: "The Humanitarian", desc: "Compassionate, wise, idealistic. You're here to serve humanity." },
  11: { title: "The Intuitive", desc: "Highly sensitive, visionary, illuminating. A master number — you inspire others." },
  22: { title: "The Master Builder", desc: "Practical visionary, capable of creating large-scale change. A master number." },
  33: { title: "The Master Teacher", desc: "Compassionate guide, devoted to uplifting others. A master number." },
};

export const EXPRESSION_MEANINGS: Record<number, NumerologyMeaning> = {
  1: { title: "The Innovator", desc: "Born to lead and originate. You have a natural drive toward independence and self-expression." },
  2: { title: "The Peacemaker", desc: "Your gift is bringing harmony. You excel in cooperative, supportive, and diplomatic roles." },
  3: { title: "The Communicator", desc: "Creative self-expression is your calling. Art, writing, speaking, and storytelling come naturally." },
  4: { title: "The Organizer", desc: "You build solid structures. Hard work, order, and dependability define your natural talents." },
  5: { title: "The Freedom-Seeker", desc: "Adaptable and versatile, you thrive on variety, change, and new experiences." },
  6: { title: "The Caregiver", desc: "Nurturing and responsible. You're gifted in healing, teaching, and nurturing others." },
  7: { title: "The Analyst", desc: "Deep thinker and researcher. You're drawn to mystery, philosophy, and spiritual inquiry." },
  8: { title: "The Executive", desc: "Natural authority and business acumen. You're here to achieve, lead, and master the material world." },
  9: { title: "The Visionary", desc: "Broad humanitarian vision. Your gifts are meant to serve and uplift the greater good." },
  11: { title: "The Inspirer", desc: "Highly intuitive and inspirational. You illuminate the path for others. A master expression." },
  22: { title: "The Architect", desc: "Master builder of dreams. You can manifest large-scale visions into lasting reality. A master expression." },
  33: { title: "The Healer", desc: "Master healer and teacher. You uplift and serve with unconditional love. A master expression." },
};

export const SOUL_URGE_MEANINGS: Record<number, NumerologyMeaning> = {
  1: { title: "To Lead", desc: "Your soul craves independence and the freedom to forge its own path." },
  2: { title: "To Connect", desc: "Deep partnerships and harmonious relationships fuel your inner life." },
  3: { title: "To Create", desc: "Creative expression and joyful living is the heartbeat of your soul." },
  4: { title: "To Build", desc: "Security, stability, and a solid foundation satisfy your deepest needs." },
  5: { title: "To Explore", desc: "Freedom, adventure, and new experiences light up your soul." },
  6: { title: "To Nurture", desc: "Love, family, and caring for others is your deepest heart's calling." },
  7: { title: "To Know", desc: "Wisdom, solitude, and deep understanding are what your soul seeks." },
  8: { title: "To Achieve", desc: "Material mastery, recognition, and abundance satisfy your inner drive." },
  9: { title: "To Serve", desc: "Your soul longs to give back and uplift the whole of humanity." },
  11: { title: "To Illuminate", desc: "Spiritual inspiration and visionary insight define your deepest desire." },
  22: { title: "To Transform", desc: "Large-scale creation and world-changing impact is your soul's ambition." },
  33: { title: "To Heal", desc: "Unconditional compassion and the healing of others is your soul's mission." },
};

export const PERSONAL_YEAR_MEANINGS: Record<number, string> = {
  1: "New beginnings. Plant seeds for the next 9-year cycle.",
  2: "Cooperation and patience. Nurture what you planted.",
  3: "Expression and joy. Let creativity flow freely.",
  4: "Hard work and foundation-building. Focus and discipline.",
  5: "Change and freedom. Embrace unexpected opportunities.",
  6: "Responsibility and love. Family and community focus.",
  7: "Reflection and inner growth. A time for solitude and study.",
  8: "Harvest and achievement. Material and career gains.",
  9: "Completion and release. Let go to prepare for renewal.",
};

export const PERSONAL_MONTH_MEANINGS: Record<number, string> = {
  1: "A month for starting fresh and asserting yourself.",
  2: "Focus on relationships and patience this month.",
  3: "Express yourself creatively — let joy in.",
  4: "A month for planning, building, and steady effort.",
  5: "Expect shifts — stay flexible and open to change.",
  6: "Home, family, and service take center stage.",
  7: "Introspection and inner work. Go inward.",
  8: "Material gains and career moves are favoured.",
  9: "Time to wrap up and release what is complete.",
};

export const PERSONAL_DAY_MEANINGS: Record<number, string> = {
  1: "Take the lead. Start something new today.",
  2: "Cooperate and listen. Small steps matter.",
  3: "Express yourself. A creative, social day.",
  4: "Be practical and organised. Work methodically.",
  5: "Stay flexible. Unexpected shifts may come.",
  6: "Show care for others. A day for giving.",
  7: "Reflect and research. Trust your intuition.",
  8: "Focus on goals and tangible outcomes.",
  9: "Complete tasks. Let go of what is done.",
};
