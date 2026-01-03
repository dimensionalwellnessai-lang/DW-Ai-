export interface CrisisAnalysis {
  isPotentialCrisis: boolean;
  confidence: "low" | "medium" | "high";
  matchedPatterns: string[];
}

const HIGH_RISK_PATTERNS = [
  /\b(want|going|plan|decided|ready)\s+(to\s+)?(kill|end)\s+(myself|my\s+life)\b/i,
  /\b(i('m|\s+am)\s+going\s+to\s+)?(suicide|kill\s+myself)\b/i,
  /\bend\s+(it\s+all|my\s+life|everything)\b/i,
  /\b(can't|cannot)\s+(go\s+on|take\s+it\s+anymore|live\s+like\s+this)\b/i,
  /\bdon't\s+want\s+to\s+(live|be\s+alive|exist)\s*(anymore)?\b/i,
  /\bhurt\s+(myself|my\s+body)\b/i,
  /\bself[\s-]?harm\b/i,
  /\bcut(ting)?\s+(myself|my\s+(wrist|arm|body))\b/i,
];

const MEDIUM_RISK_PATTERNS = [
  /\bwish\s+i\s+(was|were)\s+(dead|gone|not\s+here)\b/i,
  /\beveryone\s+would\s+be\s+better\s+off\s+without\s+me\b/i,
  /\bno\s+point\s+(in\s+)?(living|going\s+on|trying)\b/i,
  /\bfeeling\s+(suicidal|like\s+ending\s+it)\b/i,
  /\bi('m|\s+am)\s+in\s+danger\b/i,
  /\bthinking\s+(about|of)\s+(ending|hurting)\b/i,
  /\bi('m|\s+am)\s+going\s+to\s+do\s+it\b/i,
  /\bgonna\s+do\s+it\s+(tonight|today|now|soon)\b/i,
  /\bmade\s+(up\s+)?my\s+(mind|decision)\b/i,
  /\bthis\s+is\s+(it|the\s+end|goodbye)\b/i,
];

const LOW_RISK_PATTERNS = [
  /\bdon't\s+see\s+(a\s+)?(way\s+out|hope)\b/i,
  /\bfeeling\s+(hopeless|worthless|like\s+a\s+burden)\b/i,
  /\bno\s+one\s+(cares|would\s+miss\s+me)\b/i,
];

const CASUAL_EXCLUSIONS = [
  /\bkilling\s+it\b/i,
  /\bkill(ing|ed)?\s+(time|the\s+vibe|the\s+mood)\b/i,
  /\bdying\s+(to|of)\s+(see|know|try|laughter|curiosity)\b/i,
  /\bdead(line|beat|pan|lock)\b/i,
  /\bi('m)?\s+dead\s+(serious|tired|wrong)\b/i,
  /\bto\s+die\s+for\b/i,
  /\bliterally\s+dying\b/i,
  /\bso\s+bored\s+i\s+could\s+die\b/i,
  /\bkill(ed|ing)?\s+(the\s+)?(game|test|exam|interview)\b/i,
];

export function analyzeCrisisRisk(message: string): CrisisAnalysis {
  const normalizedMessage = message.toLowerCase().trim();
  
  for (const exclusion of CASUAL_EXCLUSIONS) {
    if (exclusion.test(normalizedMessage)) {
      return {
        isPotentialCrisis: false,
        confidence: "low",
        matchedPatterns: [],
      };
    }
  }
  
  const matchedPatterns: string[] = [];
  let highestConfidence: "low" | "medium" | "high" = "low";
  
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(normalizedMessage)) {
      matchedPatterns.push(pattern.source);
      highestConfidence = "high";
    }
  }
  
  if (highestConfidence !== "high") {
    for (const pattern of MEDIUM_RISK_PATTERNS) {
      if (pattern.test(normalizedMessage)) {
        matchedPatterns.push(pattern.source);
        highestConfidence = "medium";
      }
    }
  }
  
  if (matchedPatterns.length === 0) {
    for (const pattern of LOW_RISK_PATTERNS) {
      if (pattern.test(normalizedMessage)) {
        matchedPatterns.push(pattern.source);
      }
    }
  }
  
  const isPotentialCrisis = highestConfidence === "high" || highestConfidence === "medium";
  
  return {
    isPotentialCrisis,
    confidence: highestConfidence,
    matchedPatterns,
  };
}

export const CRISIS_RESOURCES = {
  US: {
    name: "988 Suicide & Crisis Lifeline",
    phone: "988",
    text: "988",
    description: "Free, confidential support 24/7",
  },
  UK: {
    name: "Samaritans",
    phone: "116 123",
    description: "Free to call, 24 hours a day",
  },
  Canada: {
    name: "Talk Suicide Canada",
    phone: "1-833-456-4566",
    description: "Available 24/7",
  },
  Australia: {
    name: "Lifeline Australia",
    phone: "13 11 14",
    description: "24-hour crisis support",
  },
  international: {
    name: "International Association for Suicide Prevention",
    url: "https://www.iasp.info/resources/Crisis_Centres/",
    description: "Find help in your country",
  },
};
