// api/v1/rewrite.ts
// FINAL STABLE VERSION: Includes "Auto-Retry" for better reliability.

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// --- DATABASE CONNECTION ---
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );
  
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// --- RETRY LOGIC ---
// If OpenRouter is busy, we wait and try again (up to 3 times)
async function fetchWithRetry(url: string, options: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    
    // If successful, return immediately
    if (response.ok) return response;
    
    // If it's NOT a rate limit error (429), fail immediately
    if (response.status !== 429) return response;

    // If it WAS a rate limit error, wait 1 second and try again
    console.log(`Rate limit hit. Retrying... (${i + 1}/${retries})`);
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("Server is busy (Rate Limit). Please try again later.");
}

// --- VALIDATE KEY ---
async function validateApiKey(token: string) {
  const snapshot = await db.collection('users')
    .where('apiKey', '==', token) // Ensuring camelCase match
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();

  return { 
    valid: true, 
    docId: userDoc.id,
    plan: userData.plan || 'free', 
    credits: userData.credits || 0 
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // 1. AUTHENTICATION
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    const user = await validateApiKey(token);

    if (!user) return res.status(403).json({ error: 'Invalid API Key.' });

    // 2. CHECK CREDITS (The "Safety Net")
    if (user.plan !== 'syndicate') {
      return res.status(403).json({ error: 'Plan restriction.' });
    }

    if (user.credits <= 0) {
      return res.status(402).json({ error: 'Insufficient credits. Contact Support.' });
    }

    // 3. CALL AI (With Retry)
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

    // 4. DEDUCT CREDIT
    // Only deduct if successful
    await db.collection('users').doc(user.docId).update({
      credits: FieldValue.increment(-1)
    });

    return res.status(200).json({ 
      status: 'success',
      data: { 
        rewritten_text: rewrittenText,
        credits_remaining: user.credits - 1 
      }
    });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
