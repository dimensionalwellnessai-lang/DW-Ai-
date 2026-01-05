interface VisionOCRResult {
  text: string;
  confidence: number;
  method: "google_vision";
}

interface VisionError {
  code: string;
  message: string;
  isRetryable: boolean;
}

export class GoogleVisionService {
  private apiKey: string | undefined;
  private endpoint = "https://vision.googleapis.com/v1/images:annotate";

  constructor() {
    this.apiKey = process.env.GOOGLE_VISION_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async extractText(buffer: Buffer, mimeType: string): Promise<VisionOCRResult> {
    if (!this.apiKey) {
      throw this.createError(
        "NOT_CONFIGURED",
        "Google Vision API is not configured. Using fallback OCR.",
        false
      );
    }

    const base64Image = buffer.toString("base64");
    const requestBody = {
      requests: [
        {
          image: { content: base64Image },
          features: [
            { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 },
          ],
        },
      ],
    };

    try {
      const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
        
        if (response.status === 429) {
          throw this.createError("RATE_LIMITED", "Too many requests. Please try again later.", true);
        }
        if (response.status === 403) {
          throw this.createError("FORBIDDEN", "Google Vision API access denied. Check API key.", false);
        }
        
        throw this.createError("API_ERROR", errorMessage, response.status >= 500);
      }

      const data = await response.json();
      const annotations = data.responses?.[0];
      
      if (annotations?.error) {
        throw this.createError(
          "VISION_ERROR",
          annotations.error.message || "Vision API processing error",
          false
        );
      }

      const fullTextAnnotation = annotations?.fullTextAnnotation;
      if (!fullTextAnnotation?.text) {
        throw this.createError(
          "NO_TEXT_FOUND",
          "No text could be detected in this image.",
          false
        );
      }

      const confidence = this.calculateConfidence(annotations);
      
      return {
        text: fullTextAnnotation.text,
        confidence,
        method: "google_vision",
      };
    } catch (error) {
      if (this.isVisionError(error)) {
        throw error;
      }
      
      console.error("Google Vision API error:", error);
      throw this.createError(
        "NETWORK_ERROR",
        "Could not connect to Google Vision API. Using fallback.",
        true
      );
    }
  }

  private calculateConfidence(annotations: any): number {
    try {
      const pages = annotations?.fullTextAnnotation?.pages || [];
      if (pages.length === 0) return 50;

      let totalConfidence = 0;
      let blockCount = 0;

      for (const page of pages) {
        for (const block of page.blocks || []) {
          if (block.confidence !== undefined) {
            totalConfidence += block.confidence;
            blockCount++;
          }
        }
      }

      if (blockCount === 0) return 70;
      return Math.round((totalConfidence / blockCount) * 100);
    } catch {
      return 60;
    }
  }

  private createError(code: string, message: string, isRetryable: boolean): VisionError {
    return { code, message, isRetryable };
  }

  private isVisionError(error: unknown): error is VisionError {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      "message" in error &&
      "isRetryable" in error
    );
  }
}

export const googleVisionService = new GoogleVisionService();
