import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

// --- SECURITY & VALIDATION CONFIG ---
const MAX_DRAFT_LENGTH = 50000; // Limit draft size to prevent token exhaustion
const MAX_REF_TEXT_LENGTH = 20000;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB Strict Limit
const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain', 'text/csv'];
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per client session

// Simple in-memory rate limiter for the client session
let requestHistory: number[] = [];

const checkRateLimit = () => {
  const now = Date.now();
  // Filter out timestamps older than the window
  requestHistory = requestHistory.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (requestHistory.length >= MAX_REQUESTS_PER_WINDOW) {
    throw new Error(`Rate limit exceeded. You can only make ${MAX_REQUESTS_PER_WINDOW} requests per minute.`);
  }
  
  requestHistory.push(now);
};

// Strict Input Sanitization to prevent XSS and Injection vectors
const sanitizeInput = (input: string): string => {
  if (!input) return "";
  // Remove null bytes
  let safe = input.replace(/\0/g, '');
  // Strip script tags and their content to prevent stored XSS if reflected elsewhere
  safe = safe.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
  // Strip common event handlers
  safe = safe.replace(/ on\w+="[^"]*"/g, "");
  safe = safe.replace(/javascript:/gi, "");
  return safe.trim();
};

const validateInputs = (draft: string, referenceText: string | null, referenceFile: ReferenceFile | null) => {
  if (!draft || draft.length === 0) {
    throw new Error("Draft text is required.");
  }
  if (draft.length > MAX_DRAFT_LENGTH) {
    throw new Error(`Draft text exceeds maximum length.`);
  }

  if (referenceText && referenceText.length > MAX_REF_TEXT_LENGTH) {
    throw new Error(`Reference text exceeds maximum length.`);
  }

  if (referenceFile) {
    if (!ALLOWED_MIME_TYPES.includes(referenceFile.mimeType)) {
      throw new Error("Invalid file type. Only PDF, TXT, and CSV are allowed.");
    }
    // Basic base64 character set validation
    if (!/^[A-Za-z0-9+/=]+$/.test(referenceFile.data)) {
        throw new Error("File data is corrupted.");
    }
    // Strict Size Check (Base64 is ~1.33x binary size)
    const sizeInBytes = (referenceFile.data.length * 3) / 4;
    if (sizeInBytes > MAX_FILE_SIZE_BYTES) {
        throw new Error("File too large for security reasons. Max 5MB.");
    }
  }
};

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // Return generic error to avoid leaking env var status details if exposed
    throw new Error("Service configuration error.");
  }
  return new GoogleGenAI({ apiKey });
};

export interface ReferenceFile {
  data: string; // Base64 string (without prefix)
  mimeType: string;
}

export const rewriteContent = async (
  draft: string, 
  referenceText: string | null,
  referenceFile: ReferenceFile | null,
  intensity: number = 50,
  model: string = 'gemini-3-flash-preview' // Default to Flash (Standard)
): Promise<string> => {
  try {
    // 1. Rate Limiting Check
    checkRateLimit();

    // 2. Input Sanitization
    const cleanDraft = sanitizeInput(draft);
    const cleanRefText = referenceText ? sanitizeInput(referenceText) : null;

    // 3. Validation
    validateInputs(cleanDraft, cleanRefText, referenceFile);

    const ai = getGeminiClient();
    
    let contents;

    // Constrain intensity to valid range
    const safeIntensity = Math.max(0, Math.min(100, intensity));
    const intensityPrompt = `Style Match Intensity: ${safeIntensity}% (100% means exact mimicry, 0% means loose inspiration).`;

    if (referenceFile) {
      // File-based grounding strategy
      contents = {
        parts: [
          {
            inlineData: {
              data: referenceFile.data,
              mimeType: referenceFile.mimeType,
            },
          },
          {
            text: `Analyze this document's writing style and Brand DNA. Then rewrite the Draft to match it.\n${intensityPrompt}\n\nDraft:\n"""\n${cleanDraft}\n"""`
          },
        ],
      };
    } else if (cleanRefText) {
      // Text-based grounding strategy
      contents = `
Reference Material (Analyze this style):
"""
${cleanRefText}
"""

Draft to Rewrite (Apply the style above to this text):
"""
${cleanDraft}
"""

${intensityPrompt}`.trim();
    } else {
      throw new Error("No reference material provided. Please provide text or a file.");
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        // Safety settings updated for Content Policy
        safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      },
    });

    return response.text || "";
  } catch (error: any) {
    // Secure Logging: Do not log the full error object to console to avoid leaking API Key or payload
    console.error("Gemini API Error (Sanitized):", error.message);
    
    // User-facing generic errors
    if (error.message.includes("429")) {
        throw new Error("Service is currently overloaded. Please try again later.");
    }
    throw new Error("Something went wrong with the AI generation. Please try again.");
  }
};