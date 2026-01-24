import { GoogleGenAI } from "@google/genai";

// Note: Ensure your environment variables are configured in your deployment platform.
// In Next.js, this file executes on the server.

export async function POST(request: Request) {
  try {
    // 1. Authorization Check
    const authHeader = request.headers.get('Authorization');
    
    // Check if key is present and starts with expected prefix "gn_live_"
    if (!authHeader || !authHeader.startsWith('Bearer gn_live_')) {
      return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // In a real production app, you would verify the specific API key against your database here.
    // const apiKeyFromHeader = authHeader.split(' ')[1];
    
    // 2. Parse Body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Bad Request', message: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { reference_text, draft_text } = body;

    if (!draft_text) {
      return new Response(JSON.stringify({ error: 'Bad Request', message: 'draft_text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Call Gemini
    // Using the server-side environment key for the actual model call
    const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const intensityPrompt = `Style Match Intensity: 100% (Exact mimicry).`;
    let contents = "";
    
    if (reference_text) {
       contents = `
Reference Material (Analyze this style):
"""
${reference_text}
"""

Draft to Rewrite (Apply the style above to this text):
"""
${draft_text}
"""

${intensityPrompt}
Do not add filler conversational text.`.trim();
    } else {
        contents = `Rewrite the following draft to be more professional:\n\n${draft_text}`;
    }

    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        temperature: 0.7,
      },
    });

    return new Response(JSON.stringify({ 
        result: response.text,
        model: 'gemini-3-flash-preview',
        status: 'success'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}