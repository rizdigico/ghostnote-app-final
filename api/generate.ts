import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIStream, StreamingTextResponse } from 'ai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { prompt, plan, settings } = await req.json();
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return new Response('Missing API Key', { status: 500 });
    }

    // 1. DEFINE THE PROMPT FIRST (Fixes the variable error)
    const fullPrompt = `
      You are a professional ghostwriter.
      Tone: ${settings?.tone || 'Professional'}
      Task: Rewrite the following text.
      
      Original Text:
      "${prompt}"
    `;

    // 2. SELECT THE MODEL (Using the stable 002 versions)
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use the "002" models to avoid 404 errors
    const modelName = plan === 'syndicate' 
      ? 'gemini-1.5-pro-002' 
      : 'gemini-1.5-flash-002';
      
    const model = genAI.getGenerativeModel({ model: modelName });

    // 3. GENERATE STREAM
    const geminiStream = await model.generateContentStream(fullPrompt);
    const stream = GoogleGenerativeAIStream(geminiStream);

    return new StreamingTextResponse(stream);

  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
