export const config = {
  runtime: 'edge',
  bodyParser: false, // Need to handle FormData manually
};

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
    // Get client identifier (user ID if authenticated, otherwise IP)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Check rate limit
    if (!checkTranscriptionRateLimit(clientIp)) {
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
    
    // Return result
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
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Transcription error:', error);
    
    let errorMessage = 'An unexpected error occurred. Please try again.';
    let status = 500;
    
    if (error.message && (error.message.includes('OpenAI') || error.message.includes('API'))) {
      errorMessage = error.message || 'Transcription service unavailable';
      status = 503;
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
