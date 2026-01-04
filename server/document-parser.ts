import mammoth from "mammoth";
import * as pdfParseModule from "pdf-parse";

const pdfParse = (pdfParseModule as unknown as { default: (buffer: Buffer) => Promise<{ text: string; numpages: number; info?: { Title?: string; Author?: string } }> }).default;

export interface ParsedDocumentResult {
  text: string;
  metadata?: {
    pages?: number;
    title?: string;
    author?: string;
  };
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParsedDocumentResult> {
  const type = mimeType.toLowerCase();
  
  if (type.includes("pdf")) {
    return extractFromPdf(buffer);
  }
  
  if (type.includes("word") || type.includes("docx") || type.includes("doc")) {
    return extractFromDocx(buffer);
  }
  
  if (type.includes("text") || type.includes("plain") || fileName.endsWith(".txt") || fileName.endsWith(".md")) {
    return { text: buffer.toString("utf-8") };
  }
  
  throw new Error(`Unsupported file type: ${mimeType}`);
}

async function extractFromPdf(buffer: Buffer): Promise<ParsedDocumentResult> {
  try {
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        title: data.info?.Title,
        author: data.info?.Author,
      },
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

async function extractFromDocx(buffer: Buffer): Promise<ParsedDocumentResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      metadata: {},
    };
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error("Failed to extract text from Word document");
  }
}

export interface DocumentAnalysisItem {
  id: string;
  itemType: "meal" | "workout" | "routine" | "calendar" | "plan";
  title: string;
  description: string;
  details: Record<string, unknown>;
  destinationSystem: string;
  confidence: number;
  isSelected: boolean;
}

export interface DocumentAnalysisResult {
  documentTitle: string;
  summary: string;
  confidence: number;
  items: DocumentAnalysisItem[];
  clarifyingQuestions?: string[];
}

export function generateDocumentAnalysisPrompt(text: string): string {
  return `You are a calm, helpful AI assistant that organizes life systems. Analyze this document and extract structured items that can be saved into the user's systems.

DOCUMENT TEXT:
${text.slice(0, 30000)}

INSTRUCTIONS:
1. Read the entire document carefully
2. Identify repeating patterns, schedules, or structured content
3. Extract items into the following categories:
   - meals: Recipes, meal plans, food preparation steps, portion rules
   - workouts: Exercise routines, workout days, movement types, rest days
   - routines: Step-by-step processes, morning/evening routines, prep flows
   - calendar: Specific dates, recurring events, reminders, scheduled blocks
   - plan: Overall system name if this is a named program (e.g., "4-Week Meal Prep")

4. For each item, provide:
   - title: Clear, concise name
   - description: 1-2 sentence summary
   - details: Specific information (ingredients, sets/reps, times, etc.)
   - destinationSystem: Where it should go (nutrition, workout, routines, calendar)
   - confidence: 0-100 how sure you are this extraction is correct

5. If confidence is below 60 for any major section, include clarifying questions.

RESPOND WITH VALID JSON ONLY:
{
  "documentTitle": "Name of this document/plan",
  "summary": "Brief 2-3 sentence overview of what this document contains",
  "confidence": 0-100,
  "items": [
    {
      "id": "unique-id-1",
      "itemType": "meal|workout|routine|calendar|plan",
      "title": "Item title",
      "description": "Brief description",
      "details": { "relevant": "details" },
      "destinationSystem": "nutrition|workout|routines|calendar",
      "confidence": 0-100,
      "isSelected": true
    }
  ],
  "clarifyingQuestions": ["Optional questions if confidence is low"]
}`;
}

export function validateAnalysisResult(data: unknown): DocumentAnalysisResult | null {
  if (!data || typeof data !== "object") return null;
  
  const obj = data as Record<string, unknown>;
  
  if (!obj.documentTitle || typeof obj.documentTitle !== "string") return null;
  if (!obj.summary || typeof obj.summary !== "string") return null;
  if (typeof obj.confidence !== "number") return null;
  if (!Array.isArray(obj.items)) return null;
  
  const validItems: DocumentAnalysisItem[] = [];
  
  for (const item of obj.items) {
    if (!item || typeof item !== "object") continue;
    const i = item as Record<string, unknown>;
    
    if (!i.id || !i.itemType || !i.title) continue;
    
    validItems.push({
      id: String(i.id),
      itemType: i.itemType as DocumentAnalysisItem["itemType"],
      title: String(i.title),
      description: String(i.description || ""),
      details: (i.details as Record<string, unknown>) || {},
      destinationSystem: String(i.destinationSystem || ""),
      confidence: Number(i.confidence) || 50,
      isSelected: i.isSelected !== false,
    });
  }
  
  return {
    documentTitle: obj.documentTitle,
    summary: obj.summary,
    confidence: obj.confidence,
    items: validItems,
    clarifyingQuestions: Array.isArray(obj.clarifyingQuestions) 
      ? obj.clarifyingQuestions.map(String) 
      : undefined,
  };
}
