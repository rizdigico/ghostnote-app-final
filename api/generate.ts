import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // 1. Method Check
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { prompt, plan, settings } = await req.json();

    // 2. Prompt Construction
    const fullPrompt = `
      You are a professional ghostwriter.
      Tone: ${settings?.tone || 'Professional'}
      Task: Rewrite the following text.
      
      Original Text:
      "${prompt}"
    `;

    // 3. Model Selection (Gemini 1.5 Pro - 002)
    const modelId = plan === 'syndicate' 
      ? 'gemini-1.5-pro-002' 
      : 'gemini-1.5-flash-002';

    // 4. Generate Stream
    const result = await streamText({
      model: google(modelId),
      prompt: fullPrompt,
    });

    // 5. RETURN RAW TEXT STREAM (Critical Fix)
    // We create a standard Response with the text stream
    return new Response(result.textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
