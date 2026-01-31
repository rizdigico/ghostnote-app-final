// api/v1/rewrite.ts
// FIXED: Allows Clone/Echo to use the Dashboard, but blocks them from external API.
// ENHANCED: Security measures for API protection

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

// --- SECURITY: RATE LIMITING ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// --- SECURITY: INPUT SANITIZATION ---
function sanitizeInput(input: string, maxLength: number = 10000): string {
  if (!input || typeof input !== 'string') return '';
  // Remove null bytes and control characters
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.slice(0, maxLength);
}

// --- RETRY LOGIC ---
async function fetchWithRetry(url: string, options: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.ok) return response;
    if (response.status !== 429) return response;
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("Server is busy. Please try again.");
}

// --- VALIDATE KEY ---
async function validateApiKey(token: string) {
  const snapshot = await db.collection('users')
    .where('apiKey', '==', token)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const userDoc = snapshot.docs[0];
  return { 
    valid: true, 
    docId: userDoc.id,
    plan: userDoc.data().plan || 'free', 
    credits: userDoc.data().credits || 0 
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Basic token validation
    if (!token || token.length < 10) {
      return res.status(401).json({ error: 'Invalid token format.' });
    }
    
    // --- SECURITY: RATE LIMIT CHECK ---
    const clientId = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     'unknown';
    
    if (!checkRateLimit(clientId)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }
    
    const user = await validateApiKey(token);

    if (!user) return res.status(403).json({ error: 'Invalid API Key.' });

    // --- THE NEW BOUNCER LOGIC ---
    
    // 1. Identify if the request is coming from YOUR Dashboard
    const referer = req.headers.referer || "";
    const isInternalRequest = referer.includes("ghostnote.site") || referer.includes("localhost");

    // 2. The Rule: 
    // If they are NOT Syndicate AND they are NOT on the dashboard -> BLOCK THEM.
    if (user.plan !== 'syndicate' && !isInternalRequest) {
      return res.status(403).json({ error: 'External API access is restricted to Syndicate Plan.' });
    }

    // 3. Check Credits (Applies to everyone)
    if (user.credits <= 0) {
      return res.status(402).json({ error: 'Insufficient credits.' });
    }

    // 4. Validate and sanitize input
    const { reference_text, draft_text } = req.body || {};
    
    if (!reference_text || !draft_text) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    
    const sanitizedReference = sanitizeInput(reference_text, 5000);
    const sanitizedDraft = sanitizeInput(draft_text, 5000);
    
    if (!sanitizedReference || !sanitizedDraft) {
      return res.status(400).json({ error: 'Invalid input after sanitization.' });
    }

    const systemPrompt = `You are a Ghostwriter. Style: "${sanitizedReference || 'Professional'}". Rewrite the user's draft. Return ONLY the text.`;
    
    const aiResponse = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ghostnote.site',
        'X-Title': 'GhostNote API',
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: sanitizedDraft }
        ],
        max_tokens: 2000, // Prevent excessive output
      }),
    });

    if (!aiResponse.ok) throw new Error(`AI Error: ${aiResponse.statusText}`);
    const aiData = await aiResponse.json();
    const rewrittenText = aiData.choices[0]?.message?.content || "";

    // Deduct Credit
    await db.collection('users').doc(user.docId).update({
      credits: FieldValue.increment(-1)
    });

    return res.status(200).json({ 
      status: 'success', 
      data: { rewritten_text: rewrittenText, credits_remaining: user.credits - 1 }
    });

  } catch (error: any) {
    console.error(error);
    // Don't leak error details in production
    return res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
}
