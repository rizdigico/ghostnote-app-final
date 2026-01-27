
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // 1. Setup Headers for Streaming
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode("Initiating GhostNote (Free Tier)...\n\n"));

        if (req.method !== 'POST') {
          controller.close();
          return;
        }

        const { prompt, settings } = await req.json();
           // Use the provided OpenRouter API key directly for this session
           const apiKey = "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";

        const genAI = new GoogleGenerativeAI(apiKey);
        // STANDARD FREE MODEL
        // Works with new, unverified API keys.
        const modelName = 'gemini-1.5-flash'; 

        const model = genAI.getGenerativeModel({ 
          model: modelName,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
        });

        const fullPrompt = `
          You are a Ghostwriter. Rewrite this text to be ${settings?.tone || 'Professional'}.
          Text: "${prompt}"
        `;

        const result = await model.generateContentStream(fullPrompt);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }

      } catch (error: any) {
        console.error("Stream Error:", error);
        controller.enqueue(encoder.encode(`\n[Error: ${error.message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
