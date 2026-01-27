
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
        // A. Manual "Handshake" (Proves connection works)
        controller.enqueue(encoder.encode("Initiating GhostNote protocol...\n\n"));

        // B. Parse Input
        if (req.method !== 'POST') return;
        const { prompt, plan, settings } = await req.json();
        const apiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey) {
          controller.enqueue(encoder.encode("[System Error: Missing API Key]"));
          controller.close();
          return;
        }

        // C. Configure Google AI (Manual Mode)
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Use the reliable "001" version to avoid 404s
        const modelName = plan === 'syndicate' 
          ? 'gemini-1.5-pro-001' 
          : 'gemini-1.5-flash-001';

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

        // D. Generate Stream
        const result = await model.generateContentStream(fullPrompt);

        // E. Pump the Chunks
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
             controller.enqueue(encoder.encode(text));
          }
        }

      } catch (error: any) {
        console.error("Stream Error:", error);
        // Send the error to the frontend so we can see it!
        controller.enqueue(encoder.encode(`\n[Error: ${error.message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
