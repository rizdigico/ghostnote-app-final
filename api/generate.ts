import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { prompt, plan, settings } = await req.json();

    // 1. Define the Prompt
    const fullPrompt = `
      You are a professional ghostwriter.
      Tone: ${settings?.tone || 'Professional'}
      Task: Rewrite the following text.
      
      Original Text:
      "${prompt}"
    `;

    // 2. Select Model (Using the @ai-sdk/google provider)
    // We use the '002' models which are the latest stable versions
    const modelId = plan === 'syndicate' 
      ? 'gemini-1.5-pro-002' 
      : 'gemini-1.5-flash-002';

    // 3. Generate Stream (Modern Syntax)
    const result = await streamText({
      model: google(modelId),
      prompt: fullPrompt,
    });

    // 4. Return Stream
    return result.toDataStreamResponse();

  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
