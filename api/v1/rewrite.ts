// api/v1/rewrite.ts
// The Public API Endpoint for "Syndicate Plan" users.

export const config = {
  runtime: 'edge',
};

// --- DATABASE CONNECTION STUB ---
// You must connect this to your real database (Firebase/Supabase/Postgres)
async function validateApiKey(token: string) {
  // TODO: Replace this with your actual database query.
  // Example: const user = await db.users.find({ apiKey: token });
  
  // FOR TESTING ONLY: We accept this specific key from your screenshot
  const validKeys = ["key_355xvgvpo2y"]; 
  
  if (validKeys.includes(token)) {
    return { 
      valid: true, 
      plan: 'syndicate', 
      credits: 9999 
    };
  }
  
  return null; // Invalid key
}

export default async function handler(req: Request) {
  const encoder = new TextEncoder();

  // 1. Method Check (Only POST allowed)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 2. AUTHENTICATION (The Gatekeeper)
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header. Expected: Bearer YOUR_API_KEY' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.split(' ')[1];
    const user = await validateApiKey(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid API Key.' }), { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (user.plan !== 'syndicate') {
      return new Response(JSON.stringify({ error: 'Plan restriction. Upgrade to Syndicate Plan to use the API.' }), { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. PARSE INPUT (Match your documentation)
    const body = await req.json();
    const { reference_text, draft_text } = body;

    if (!draft_text) {
      return new Response(JSON.stringify({ error: 'Missing parameter: draft_text' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. CALL AI (Using your OpenRouter Llama 3.3 Setup)
    // We combine the reference style and the draft into one prompt.
    const systemPrompt = `You are a Ghostwriter engine. 
    Style Reference: "${reference_text || 'Professional'}"
    Task: Rewrite the user's draft to match the Style Reference perfectly.
    Output: Return ONLY the rewritten text. No preamble.`;

    const openRouterKey = process.env.OPENROUTER_API_KEY;

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
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

    if (!aiResponse.ok) {
      throw new Error(`AI Engine Error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const rewrittenText = aiData.choices[0]?.message?.content || "";

    // 5. SUCCESS RESPONSE
    return new Response(JSON.stringify({ 
      status: 'success',
      data: {
        rewritten_text: rewrittenText,
        credits_remaining: user.credits // Optional
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
