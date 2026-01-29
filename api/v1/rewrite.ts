// api/v1/rewrite.ts
// FIXED: Allows Clone/Echo to use the Dashboard, but blocks them from external API.

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

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

    // --- EXECUTE AI ---
    const { reference_text, draft_text } = req.body;
    const systemPrompt = `You are a Ghostwriter. Style: "${reference_text || 'Professional'}". Rewrite the user's draft. Return ONLY the text.`;
    
    const aiResponse = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ghostnote.site',
        'X-Title': 'GhostNote API',
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: draft_text }
        ]
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
    return res.status(500).json({ error: error.message });
  }
}
