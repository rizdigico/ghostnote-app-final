export const config = {
  runtime: 'edge',
  bodyParser: false, // Need to handle FormData manually
};

// --- SECURITY: AUTHENTICATION ---
import { verifyAuthToken } from '../lib/verifyAuthToken';

// --- SECURITY: RATE LIMITING ---
// Rate limit: 5 transcriptions per minute per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const TRANSCRIPTION_RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkTranscriptionRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= TRANSCRIPTION_RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// --- INPUT VALIDATION ---
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/m4a'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/webm'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

interface TranscriptionRequest {
  file: File;
}

function isValidFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` };
  }
  
  const acceptedTypes = [...ACCEPTED_AUDIO_TYPES, ...ACCEPTED_VIDEO_TYPES];
  if (!acceptedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not supported' };
  }
  
  // Basic content validation (check file signature/magic numbers)
  const fileName = file.name.toLowerCase();
  const validExtensions = ['.mp3', '.wav', '.webm', '.m4a', '.mp4', '.mov'];
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    return { valid: false, error: 'File extension not supported' };
  }
  
  return { valid: true };
}

// --- WHISPER API INTEGRATION ---
async function transcribeFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'json');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error?.message || `Transcription failed with status ${response.status}`);
  }
  
  const data = await response.json();
  return data.text;
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
    const authHeader = req.headers.get('authorization') as string | undefined;
    const userId = await verifyAuthToken(authHeader);
    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication required' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check rate limit using user ID (more reliable than IP)
    if (!checkTranscriptionRateLimit(userId)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Please wait 60 seconds before trying again.' 
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    // Validate file
    const validationResult = isValidFile(file);
    if (!validationResult.valid) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: validationResult.error 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Transcribe the file
    const transcription = await transcribeFile(file);
    
    // Return result with security headers
    return new Response(
      JSON.stringify({
        success: true,
        text: transcription,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          type: file.type,
        },
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        } 
      }
    );
    
  } catch (error: any) {
    console.error('Transcription error:', error);
    
    // Security: Don't leak detailed error messages to clients
    let errorMessage = 'An unexpected error occurred. Please try again.';
    let status = 500;
    
    if (error.message && (error.message.includes('OpenAI') || error.message.includes('API'))) {
      errorMessage = 'Transcription service unavailable';
      status = 503;
    } else if (error.message && error.message.includes('File')) {
      errorMessage = error.message;
      status = 400;
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status, 
        headers: { 
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        } 
      }
    );
  }
}
