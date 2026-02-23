export const config = {
  runtime: 'edge',
};

// --- IMPORT REQUIRED MODULES ---
import { scrapeUrl, ScrapeResult } from '../lib/urlScraper';
import { verifyAuthToken } from '../lib/verifyAuthToken';

// --- RATE LIMITING ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const EXTRACT_RATE_LIMIT = 10; // 10 requests per minute per user
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= EXTRACT_RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// --- INPUT VALIDATION TYPES ---
interface ExtractRequest {
  text?: string;
  url?: string;
  file?: File;
}

// --- FILE PARSING ---
async function parseFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    // Parse TXT files
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return await file.text();
    }

    // Parse MD files
    if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
      return await file.text();
    }

    // Parse DOCX files (basic support)
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Simple extraction for DOCX - read as text (limited support)
      return buffer.toString('utf8').replace(/[^a-zA-Z0-9\s\p{L}]/gu, ' ').trim();
    }

    // Parse PDF files (basic support)
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Simple extraction for PDF - read as text (limited support)
      return buffer.toString('utf8').replace(/[^a-zA-Z0-9\s\p{L}]/gu, ' ').trim();
    }

    throw new Error(`Unsupported file type: ${fileType}`);
  } catch (error) {
    console.error('Error parsing file:', error);
    throw new Error(`Failed to parse file: ${(error as Error).message}`);
  }
}

// --- MAIN EXTRACTION FUNCTION ---
async function extractText(request: ExtractRequest): Promise<{ text: string; source: string; charCount: number }> {
  // Extract from direct text
  if (request.text && request.text.trim().length > 0) {
    const text = request.text.trim();
    return {
      text,
      source: 'direct',
      charCount: text.length
    };
  }

  // Extract from URL
  if (request.url && request.url.trim().length > 0) {
    const url = request.url.trim();
    const scrapeResult: ScrapeResult = await scrapeUrl(url);
    
    if (!scrapeResult.success) {
      throw new Error(scrapeResult.error || 'Failed to scrape URL');
    }
    
    return {
      text: scrapeResult.textContent,
      source: scrapeResult.sourceUrl,
      charCount: scrapeResult.charCount
    };
  }

  // Extract from file
  if (request.file) {
    const text = await parseFile(request.file);
    return {
      text,
      source: request.file.name,
      charCount: text.length
    };
  }

  throw new Error('No valid extraction source provided. Please provide text, URL, or file.');
}

// --- MAIN HANDLER ---
export default async function handler(req: Request): Promise<Response> {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization') || undefined;
    const userId = await verifyAuthToken(authHeader);
    
    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized. Please provide a valid authentication token.' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Please wait a minute before trying again.' 
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    let body: any;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      body = Object.fromEntries(formData);
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unsupported content type. Use application/json or multipart/form-data.' 
        }),
        { status: 415, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate request
    const hasText = body.text && typeof body.text === 'string' && body.text.trim().length > 0;
    const hasUrl = body.url && typeof body.url === 'string' && body.url.trim().length > 0;
    const hasFile = body.file && body.file instanceof File;

    if (!hasText && !hasUrl && !hasFile) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request. Please provide at least one extraction source: text, URL, or file.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract text
    const result = await extractText(body);

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          userId
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Extraction error:', error);
    
    // Handle specific error types
    let status = 500;
    let errorMessage = 'Internal server error';
    
    if (error.message.includes('Failed to parse file')) {
      status = 400;
      errorMessage = error.message;
    } else if (error.message.includes('No valid extraction source')) {
      status = 400;
      errorMessage = error.message;
    } else if (error.message.includes('Failed to scrape URL') || error.message.includes('All scraping methods failed')) {
      status = 400;
      // Provide user-friendly error message with alternative options
      errorMessage = 'Failed to extract content from URL. The site may be blocking scraping, or the content may be too short. Try pasting the text directly instead.';
    } else if (error.message.includes('Rate limit')) {
      status = 429;
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
