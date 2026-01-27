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

    // 3. Generate Stream (With Safety Filters Disabled)
    const modelId = plan === 'syndicate' 
      ? 'gemini-1.5-pro-002' 
      : 'gemini-1.5-flash-002';
    const result = await streamText({
      model: google(modelId),
      prompt: fullPrompt,
      // CRITICAL: Allow "Angry" content by disabling safety blocks
      providerOptions: {
        google: {
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        },
      },
    });

    // 4. Return Raw Text
    return new Response(result.textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
