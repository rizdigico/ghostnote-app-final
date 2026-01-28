// api/v1/rewrite.ts
// PRODUCTION MODE: Connected to Firebase Database

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- DATABASE CONNECTION ---
// We use the Master Key you just added to Vercel
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );
  
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// --- VALIDATE KEY FUNCTION ---
async function validateApiKey(token: string) {
  // FIX: Changed 'api_key' to 'apiKey' to match your database field
  const snapshot = await db.collection('users')
    .where('apiKey', '==', token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null; // Key not found in DB
  }

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();

  // 2. Return the user's plan info
  return { 
    valid: true, 
    plan: userData.plan || 'free', 
    credits: userData.credits || 0 
  };
}

export default async function handler(req: any, res: any) {
  // Method Check
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

    if (!user) {
      return res.status(403).json({ error: 'Invalid API Key. Check database.' });
    }

    if (user.plan !== 'syndicate') {
      return res.status(403).json({ error: 'Plan restriction. Upgrade to Syndicate Plan.' });
    }

    // 2. PARSE INPUT
    const { reference_text, draft_text } = req.body;

    // 3. CALL AI (Llama 3.3)
    const systemPrompt = `You are a Ghostwriter. Style: "${reference_text || 'Professional'}". Rewrite the user's draft. Return ONLY the text.`;
    
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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

    // 4. SUCCESS
    return res.status(200).json({ 
      status: 'success',
      data: { rewritten_text: rewrittenText }
    });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
