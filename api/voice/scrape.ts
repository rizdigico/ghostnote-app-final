export const config = {
  runtime: 'edge',
};

// --- URL SCRAPER SERVICE ---
import { scrapeUrl, ScrapeResult } from '../lib/urlScraper';

// --- SECURITY: RATE LIMITING ---
// Rate limit: 5 scrapes per minute per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const SCRAPE_RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkScrapeRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= SCRAPE_RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// --- INPUT VALIDATION ---
interface ScrapeRequest {
  url: string;
}

function isValidScrapeRequest(data: any): data is ScrapeRequest {
  return data && typeof data.url === 'string' && data.url.length > 0;
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
    // Parse request body
    let body: any;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      // Try to parse as form data
      const formData = await req.formData();
      body = Object.fromEntries(formData);
    }
    
    // Validate input
    if (!isValidScrapeRequest(body)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request. URL is required.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get client identifier (user ID if authenticated, otherwise IP)
    // For now, we'll use a simple approach - in production, use proper auth
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Check rate limit
    if (!checkScrapeRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Please wait a moment before trying again.' 
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Scrape the URL
    const result: ScrapeResult = await scrapeUrl(body.url);
    
    // Return result
    return new Response(
      JSON.stringify(result),
      { status: result.success ? 200 : 400, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
