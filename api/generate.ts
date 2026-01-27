import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge', // This is critical for streaming!
};

export default async function handler(req: Request) {
  // 1. Handle Method Security
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // 2. Parse the Input
    const { draft, referenceText, referenceFile, intensity, model, plan } = await req.json();
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return new Response('Missing API Key', { status: 500 });
    }

    if (!draft) {
      return new Response('Draft text is required', { status: 400 });
    }

    // 3. Select Model (Paid vs Free)
    const genAI = new GoogleGenAI({ apiKey });
    let modelName = plan === 'syndicate' ? 'gemini-1.5-pro-002' : 'gemini-1.5-flash-002';
    let result;
    try {
      console.log("Using Model:", modelName);
      result = await genAI.models.generateContentStream({
        model: modelName,
        contents: fullPrompt,
      });
    } catch (modelErr) {
      // Fallback to gemini-pro if 002 models fail
      modelName = 'gemini-pro';
      console.log("Model fallback. Using:", modelName);
      result = await genAI.models.generateContentStream({
        model: modelName,
        contents: fullPrompt,
      });
    }

    // 4. Build the prompt with reference material
    let fullPrompt = `Rewrite the following draft to match the specified style.\n`;
    fullPrompt += `Style Match Intensity: ${intensity || 50}%\n\n`;

    if (referenceText) {
      fullPrompt += `Reference Style:\n${referenceText}\n\n`;
    }

    if (referenceFile) {
      fullPrompt += `[Brand DNA Document Analysis - apply this style]\n`;
    }

    fullPrompt += `Draft to Rewrite:\n${draft}`;

    // 6. Extract text chunks and stream them
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    // 7. Return Stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      }
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Generation failed' }), { status: 500 });
  }
}
