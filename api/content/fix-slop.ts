export const config = {
  runtime: 'edge',
};

// --- FIX SLOP ENDPOINT ---
// Uses LLM to rewrite text, removing AI jargon using the user's voice profile

// --- SECURITY: RATE LIMITING ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const FIX_RATE_LIMIT = 20; // requests per minute
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= FIX_RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// --- INPUT VALIDATION ---
interface FixSlopRequest {
  sentence: string;
  voiceProfileId?: string;
  referenceText?: string; // Optional direct reference text
}

function isValidRequest(data: any): data is FixSlopRequest {
  return data && typeof data.sentence === 'string' && data.sentence.length > 0;
}

// --- LLM CALL ---
async function callLLM(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://ghostnote.ai',
      'X-Title': 'GhostNote AI'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled editor who rewrites text to sound naturally human. Remove all corporate jargon, buzzwords, and AI patterns while keeping the meaning intact. Write in a conversational, authentic tone.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`LLM error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// --- MAIN HANDLER ---
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    let body: any;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const formData = await req.formData();
      body = Object.fromEntries(formData);
    }

    if (!isValidRequest(body)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request. Sentence is required.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Please wait a moment.' 
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { sentence, referenceText } = body;
    
    // Build prompt
    let prompt = `Rewrite this sentence to remove generic AI jargon and make it sound naturally human:\n\n"${sentence}"`;

    if (referenceText && referenceText.trim()) {
      prompt += `\n\nUse this voice style as reference:\n"${referenceText.trim()}"`;
    }

    prompt += `\n\nReturn only the rewritten sentence, nothing else. Make it imperfect, punchy, and conversational.`;

    // Call LLM
    const rewrittenText = await callLLM(prompt, apiKey);

    return new Response(
      JSON.stringify({ 
        success: true, 
        rewrittenText: rewrittenText.trim() 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Fix slop error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to rewrite text' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
