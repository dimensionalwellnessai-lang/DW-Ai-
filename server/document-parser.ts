import mammoth from "mammoth";
import Tesseract from "tesseract.js";
import { googleVisionService } from "./google-vision";

export interface ParsedDocumentResult {
  text: string;
  metadata?: {
    pages?: number;
    title?: string;
    author?: string;
  };
  extractionMethod: "native" | "tesseract" | "google_vision" | "hybrid";
  ocrConfidence?: number;
}

export interface DocumentProcessingError {
  code: string;
  message: string;
  userMessage: string;
  isRecoverable: boolean;
  suggestions: string[];
}

const MIN_VALID_TEXT_LENGTH = 30;
const TESSERACT_CONFIDENCE_THRESHOLD = 60;

async function parsePdf(buffer: Buffer): Promise<{ text: string; numpages: number; info?: { Title?: string; Author?: string } }> {
  const pdfParseLib = await import("pdf-parse") as any;
  const pdfParse = pdfParseLib.default || pdfParseLib;
  return pdfParse(buffer);
}

export function createProcessingError(
  code: string,
  message: string,
  userMessage: string,
  isRecoverable: boolean = false,
  suggestions: string[] = []
): DocumentProcessingError {
  return { code, message, userMessage, isRecoverable, suggestions };
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParsedDocumentResult> {
  const type = mimeType.toLowerCase();
  const startTime = Date.now();
  
  console.log(`[DocumentParser] Processing file: ${fileName} (${mimeType}, ${buffer.length} bytes)`);
  
  try {
    if (type.includes("pdf")) {
      return await extractFromPdf(buffer);
    }
    
    if (type.includes("word") || type.includes("docx") || type.includes("doc") || 
        fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      return await extractFromDocx(buffer);
    }
    
    if (type.includes("text") || type.includes("plain") || 
        fileName.endsWith(".txt") || fileName.endsWith(".md") || fileName.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      if (text.length < MIN_VALID_TEXT_LENGTH) {
        throw createProcessingError(
          "EMPTY_FILE",
          "Text file contains insufficient content",
          "This file appears to be empty or has very little text.",
          false,
          ["Try a different file", "Make sure the file has content"]
        );
      }
      return { text, extractionMethod: "native" };
    }
    
    if (type.includes("image") || type.includes("png") || type.includes("jpeg") || 
        type.includes("jpg") || type.includes("gif") || type.includes("webp") ||
        type.includes("bmp") || type.includes("tiff")) {
      return await extractFromImage(buffer);
    }

    if (type.includes("heic") || type.includes("heif")) {
      throw createProcessingError(
        "UNSUPPORTED_IMAGE_FORMAT",
        `HEIC/HEIF format not supported`,
        "This iPhone photo format isn't directly supported.",
        true,
        ["Take a screenshot of the image instead", "Convert to JPEG before uploading", "Use a different photo"]
      );
    }
    
    throw createProcessingError(
      "UNSUPPORTED_FILE_TYPE",
      `Unsupported file type: ${mimeType}`,
      `We can't read ${fileName.split('.').pop()?.toUpperCase() || 'this type of'} files yet.`,
      true,
      ["Try PDF, Word, or image files", "Take a photo of the document", "Copy and paste the text directly"]
    );
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[DocumentParser] Failed after ${elapsed}ms:`, error);
    
    if (isProcessingError(error)) {
      throw error;
    }
    
    throw createProcessingError(
      "EXTRACTION_FAILED",
      error instanceof Error ? error.message : "Unknown error",
      "Something went wrong while reading this file.",
      true,
      ["Try uploading again", "Try a different file format", "Take a photo of the document"]
    );
  }
}

async function extractFromImage(buffer: Buffer): Promise<ParsedDocumentResult> {
  console.log("[DocumentParser] Starting image OCR...");
  
  let tesseractResult: { text: string; confidence: number } | null = null;
  let tesseractError: Error | null = null;

  try {
    const result = await Tesseract.recognize(buffer, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`[Tesseract] Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    
    tesseractResult = {
      text: result.data.text?.trim() || "",
      confidence: result.data.confidence || 0,
    };
    
    console.log(`[Tesseract] Completed: ${tesseractResult.text.length} chars, ${tesseractResult.confidence}% confidence`);
  } catch (error) {
    tesseractError = error instanceof Error ? error : new Error("Tesseract failed");
    console.error("[Tesseract] Error:", tesseractError.message);
  }

  const tesseractGood = tesseractResult && 
    tesseractResult.text.length >= MIN_VALID_TEXT_LENGTH && 
    tesseractResult.confidence >= TESSERACT_CONFIDENCE_THRESHOLD;

  if (tesseractGood) {
    return {
      text: tesseractResult!.text,
      extractionMethod: "tesseract",
      ocrConfidence: tesseractResult!.confidence,
    };
  }

  if (googleVisionService.isConfigured()) {
    console.log("[DocumentParser] Trying Google Vision fallback...");
    try {
      const visionResult = await googleVisionService.extractText(buffer, "image");
      
      if (visionResult.text.length >= MIN_VALID_TEXT_LENGTH) {
        return {
          text: visionResult.text,
          extractionMethod: "google_vision",
          ocrConfidence: visionResult.confidence,
        };
      }
    } catch (error) {
      console.error("[GoogleVision] Fallback error:", error);
    }
  }

  if (tesseractResult && tesseractResult.text.length >= 10) {
    return {
      text: tesseractResult.text,
      extractionMethod: "tesseract",
      ocrConfidence: tesseractResult.confidence,
    };
  }

  throw createProcessingError(
    "OCR_FAILED",
    "Could not extract text from image",
    "We couldn't read the text in this image clearly.",
    true,
    ["Make sure the photo is well-lit and in focus", "Try taking a straighter photo", "Type the content directly instead"]
  );
}

async function extractFromPdf(buffer: Buffer): Promise<ParsedDocumentResult> {
  console.log("[DocumentParser] Processing PDF...");
  
  try {
    const data = await parsePdf(buffer);
    const cleanText = data.text?.trim() || "";
    
    console.log(`[PDF] Native extraction: ${cleanText.length} chars, ${data.numpages} pages`);
    
    if (cleanText.length >= MIN_VALID_TEXT_LENGTH) {
      return {
        text: data.text,
        metadata: {
          pages: data.numpages,
          title: data.info?.Title,
          author: data.info?.Author,
        },
        extractionMethod: "native",
      };
    }
    
    console.log("[PDF] Insufficient native text, attempting OCR...");
    return await ocrPdfFallback(buffer, data.numpages);
    
  } catch (error) {
    console.error("[PDF] Extraction error:", error);
    
    if (isProcessingError(error)) {
      throw error;
    }
    
    console.log("[PDF] Native extraction failed, trying OCR...");
    try {
      return await ocrPdfFallback(buffer, 1);
    } catch (ocrError) {
      throw createProcessingError(
        "PDF_EXTRACTION_FAILED",
        error instanceof Error ? error.message : "PDF parsing failed",
        "This PDF couldn't be read. It might be protected or corrupted.",
        true,
        ["Try taking a screenshot of each page", "Try a different PDF", "Copy and paste the text directly"]
      );
    }
  }
}

async function ocrPdfFallback(buffer: Buffer, numPages: number): Promise<ParsedDocumentResult> {
  const maxPages = Math.min(numPages, 10);
  console.log(`[PDF-OCR] Converting up to ${maxPages} pages to images...`);
  
  try {
    const { pdf } = await import("pdf-to-img");
    const pages: string[] = [];
    let pageNum = 0;
    let totalConfidence = 0;
    
    for await (const image of await pdf(buffer, { scale: 2 })) {
      pageNum++;
      console.log(`[PDF-OCR] Processing page ${pageNum}/${maxPages}...`);
      
      const imageBuffer = Buffer.from(image);
      
      let pageText = "";
      let pageConfidence = 0;
      
      try {
        const result = await Tesseract.recognize(imageBuffer, "eng");
        pageText = result.data.text?.trim() || "";
        pageConfidence = result.data.confidence || 0;
      } catch (tesseractError) {
        console.error(`[PDF-OCR] Tesseract failed on page ${pageNum}:`, tesseractError);
        
        if (googleVisionService.isConfigured()) {
          try {
            const visionResult = await googleVisionService.extractText(imageBuffer, "image/png");
            pageText = visionResult.text;
            pageConfidence = visionResult.confidence;
          } catch (visionError) {
            console.error(`[PDF-OCR] Google Vision failed on page ${pageNum}:`, visionError);
          }
        }
      }
      
      if (pageText) {
        pages.push(pageText);
        totalConfidence += pageConfidence;
      }
      
      if (pageNum >= maxPages) {
        console.log(`[PDF-OCR] Reached page limit (${maxPages})`);
        break;
      }
    }
    
    const fullText = pages.join("\n\n---\n\n");
    const avgConfidence = pages.length > 0 ? Math.round(totalConfidence / pages.length) : 0;
    
    console.log(`[PDF-OCR] Complete: ${fullText.length} chars from ${pages.length} pages, avg confidence ${avgConfidence}%`);
    
    if (fullText.length < MIN_VALID_TEXT_LENGTH) {
      throw createProcessingError(
        "PDF_OCR_FAILED",
        "Could not extract readable text from scanned PDF",
        "This PDF seems to be scanned but we couldn't read the text clearly.",
        true,
        ["Try taking clearer photos of each page", "Make sure the scan is high quality", "Type the content directly"]
      );
    }
    
    return {
      text: fullText,
      metadata: { pages: numPages },
      extractionMethod: pages.length > 0 ? "tesseract" : "hybrid",
      ocrConfidence: avgConfidence,
    };
  } catch (error) {
    if (isProcessingError(error)) {
      throw error;
    }
    
    console.error("[PDF-OCR] Fallback failed:", error);
    throw createProcessingError(
      "PDF_OCR_FAILED",
      error instanceof Error ? error.message : "PDF OCR failed",
      "We couldn't scan this PDF. It might have security restrictions.",
      true,
      ["Try taking screenshots of the pages", "Try a different PDF file", "Copy the text manually"]
    );
  }
}

async function extractFromDocx(buffer: Buffer): Promise<ParsedDocumentResult> {
  console.log("[DocumentParser] Processing Word document...");
  
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim() || "";
    
    if (text.length < MIN_VALID_TEXT_LENGTH) {
      throw createProcessingError(
        "EMPTY_DOCUMENT",
        "Word document contains insufficient content",
        "This document appears to be empty or has very little text.",
        false,
        ["Try a different file", "Make sure the document has content"]
      );
    }
    
    console.log(`[DOCX] Extracted ${text.length} characters`);
    return {
      text: result.value,
      metadata: {},
      extractionMethod: "native",
    };
  } catch (error) {
    if (isProcessingError(error)) {
      throw error;
    }
    
    console.error("[DOCX] Extraction error:", error);
    throw createProcessingError(
      "DOCX_EXTRACTION_FAILED",
      error instanceof Error ? error.message : "Word document parsing failed",
      "We couldn't read this Word document. It might be corrupted or an older format.",
      true,
      ["Try saving as .docx format", "Try exporting as PDF", "Copy and paste the text directly"]
    );
  }
}

export function isProcessingError(error: unknown): error is DocumentProcessingError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "userMessage" in error &&
    "suggestions" in error
  );
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
  primaryCategory: "meals" | "workouts" | "routines" | "calendar" | "mixed";
  clarifyingQuestions?: string[];
}

export function detectPrimaryCategory(items: DocumentAnalysisItem[]): "meals" | "workouts" | "routines" | "calendar" | "mixed" {
  if (items.length === 0) return "mixed";
  
  const counts: Record<string, number> = {
    meals: 0,
    workouts: 0,
    routines: 0,
    calendar: 0,
  };
  
  for (const item of items) {
    const type = item.itemType.toLowerCase();
    if (type === "meal" || item.destinationSystem === "nutrition") {
      counts.meals++;
    } else if (type === "workout" || item.destinationSystem === "workout") {
      counts.workouts++;
    } else if (type === "routine" || item.destinationSystem === "routines") {
      counts.routines++;
    } else if (type === "calendar" || item.destinationSystem === "calendar") {
      counts.calendar++;
    }
  }
  
  const total = items.length;
  const threshold = 0.6;
  
  for (const [category, count] of Object.entries(counts)) {
    if (count / total >= threshold) {
      return category as "meals" | "workouts" | "routines" | "calendar";
    }
  }
  
  return "mixed";
}

export function generateDocumentAnalysisPrompt(text: string): string {
  return `You are a calm, helpful AI assistant that organizes life systems. Analyze this document and extract structured items that can be saved into the user's systems.

DOCUMENT TEXT:
${text.slice(0, 30000)}

INSTRUCTIONS:
1. Read the entire document carefully
2. Identify repeating patterns, schedules, or structured content
3. Extract items into the following categories:
   - meal: Recipes, meal plans, food preparation steps, portion rules, ingredients
   - workout: Exercise routines, workout days, movement types, sets/reps, rest periods
   - routine: Step-by-step processes, morning/evening routines, prep flows, habits
   - calendar: Specific dates, recurring events, reminders, scheduled blocks
   - plan: Overall system name if this is a named program (e.g., "4-Week Meal Prep")

4. For each item, provide:
   - id: unique identifier (use format: item_1, item_2, etc.)
   - itemType: meal, workout, routine, calendar, or plan
   - title: Clear, concise name
   - description: 1-2 sentence summary
   - details: Specific information (ingredients, sets/reps, times, etc.)
   - destinationSystem: nutrition, workout, routines, or calendar
   - confidence: 0-100 how sure you are this extraction is correct
   - isSelected: true (default to selecting all items)

5. If confidence is below 60 for any major section, include clarifying questions.

RESPOND WITH VALID JSON ONLY:
{
  "documentTitle": "Name of this document/plan",
  "summary": "Brief 2-3 sentence overview of what this document contains",
  "confidence": 0-100,
  "items": [
    {
      "id": "item_1",
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
  
  const primaryCategory = detectPrimaryCategory(validItems);
  
  return {
    documentTitle: obj.documentTitle,
    summary: obj.summary,
    confidence: obj.confidence,
    items: validItems,
    primaryCategory,
    clarifyingQuestions: Array.isArray(obj.clarifyingQuestions) 
      ? obj.clarifyingQuestions.map(String) 
      : undefined,
  };
}
