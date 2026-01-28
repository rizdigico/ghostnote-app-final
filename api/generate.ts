

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const encoder = new TextEncoder();

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // 1. Get Key from environment variable
        const apiKey = process.env.OPENROUTER_API_KEY || "";
        
        if (!apiKey) {
          controller.enqueue(encoder.encode("\n[Error: OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.]"));
          controller.close();
          return;
        }

        // 2. Parse Input - match Dashboard payload
        const { draft, referenceText, intensity, model } = await req.json();
        
        // Validate input
        if (!draft || !draft.trim()) {
          controller.enqueue(encoder.encode("\n[Error: No text was provided for rewriting. Please enter some text to rewrite.]"));
          controller.close();
          return;
        }
        
        if (!referenceText || !referenceText.trim()) {
          controller.enqueue(encoder.encode("\n[Error: Reference text is required. Please provide a style reference.]"));
          controller.close();
          return;
        }
        
        // 3. Define the Model
        const modelId = model || "meta-llama/llama-3.3-70b-instruct:free";

        // This message proves you are running the NEW code
        controller.enqueue(encoder.encode(`Initiating GhostNote (Llama 3.3)...\n\n`));

        // 4. Send Request to OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://ghostnote.site',
            'X-Title': 'GhostNote',
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { 
                role: "system", 
                content: `You are a professional ghostwriter. Analyze the reference text to understand the writing style, tone, and voice. Then rewrite the user's draft to match that style. Intensity: ${intensity || 50}%. Return ONLY the rewritten text, no explanations.\n\nReference Style:\n${referenceText.slice(0, 1000)}` 
              },
              { 
                role: "user", 
                content: `Rewrite this text in the style of the reference:\n\n${draft}` 
              }
            ],
            stream: true, 
          }),
        });

        // Key Doctor: Diagnose key errors
        if (!response.ok) {
          const errText = await response.text();
          let diag = `OpenRouter Error: ${errText}`;
          if (errText.includes('Invalid authentication credentials')) {
            diag += '\n[Key Doctor] Your OpenRouter API key is invalid or expired.';
          } else if (errText.includes('quota')) {
            diag += '\n[Key Doctor] Your OpenRouter account has hit a quota or limit.';
          }

          controller.enqueue(encoder.encode(`\n${diag}`));
          return;
        }

        if (!response.body) throw new Error("No response body");

        // 5. Read Stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const content = json.choices[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch (e) { /* ignore JSON parse errors */ }
            }
          }
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
