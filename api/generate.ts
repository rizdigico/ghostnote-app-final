export const config = {
  runtime: 'edge',
};

// --- RAG IMPORTS ---
import { chunkText, shouldUseRAG, TextChunk } from './lib/chunker';
import { generateEmbedding, generateEmbeddingsForChunks } from './lib/embeddings';
import { storeEmbeddings, findSimilarDocuments, hasSession, EmbeddingDocument } from './lib/vectorStore';

// --- SECURITY: RATE LIMITING ---
// Simple in-memory rate limiter (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// --- SECURITY: INPUT SANITIZATION ---
function sanitizeInput(input: string, maxLength: number = 10000): string {
  if (!input) return '';
  // Remove null bytes and control characters (except newlines/tabs)
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.slice(0, maxLength);
}

function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts and dangerous characters
  const dangerous = /[<>:"/\\|?*\x00-\x1F]/g;
  const sanitized = fileName.replace(dangerous, '_');
  // Limit length
  return sanitized.slice(0, 255);
}

// --- RAG: Process file content and retrieve relevant chunks ---
async function processRAG(
  fileContent: string,
  draft: string,
  sessionId: string,
  apiKey: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<string> {
  try {
    controller.enqueue(encoder.encode(`Analyzing Brand DNA with RAG...\n`));
    
    // Step 1: Check if we already have embeddings for this session
    let relevantChunks: string;
    
    if (hasSession(sessionId)) {
      // Reuse existing embeddings
      controller.enqueue(encoder.encode(`Using cached embeddings...\n`));
      const draftEmbedding = await generateEmbedding(draft, apiKey);
      const similarDocs = findSimilarDocuments(sessionId, draftEmbedding, 5);
      relevantChunks = similarDocs.map(d => d.document.text).join('\n\n---\n\n');
    } else {
      // Step 2: Chunk the file content
      controller.enqueue(encoder.encode(`Chunking document...\n`));
      const chunks = chunkText(fileContent, 500, 100);
      
      if (chunks.length === 0) {
        return fileContent; // Fallback to full content
      }
      
      controller.enqueue(encoder.encode(`Generating embeddings for ${chunks.length} chunks...\n`));
      
      // Step 3: Generate embeddings for chunks
      const chunkEmbeddings = await generateEmbeddingsForChunks(
        chunks.map(c => ({ id: c.id, text: c.text })),
        apiKey,
        (completed, total) => {
          controller.enqueue(encoder.encode(`Embedding progress: ${completed}/${total}...\n`));
        }
      );
      
      // Step 4: Store in vector store
      const documents: EmbeddingDocument[] = chunkEmbeddings.map(ce => {
        const chunk = chunks.find(c => c.id === ce.id)!;
        return {
          id: `chunk_${ce.id}`,
          text: chunk.text,
          embedding: ce.embedding,
          metadata: { startIndex: chunk.startIndex, endIndex: chunk.endIndex }
        };
      });
      
      storeEmbeddings(sessionId, documents);
      
      // Step 5: Generate embedding for the draft
      controller.enqueue(encoder.encode(`Finding relevant chunks...\n`));
      const draftEmbedding = await generateEmbedding(draft, apiKey);
      
      // Step 6: Find similar chunks
      const similarDocs = findSimilarDocuments(sessionId, draftEmbedding, 5);
      relevantChunks = similarDocs.map(d => d.document.text).join('\n\n---\n\n');
    }
    
    controller.enqueue(encoder.encode(`Retrieved relevant context. Generating rewrite...\n\n`));
    
    return relevantChunks;
  } catch (error: any) {
    console.error('[RAG Error]', error);
    controller.enqueue(encoder.encode(`[RAG Warning: ${error.message}. Using full text fallback.]\n\n`));
    // Fallback to full content on error
    return fileContent.slice(0, 5000);
  }
}

export default async function handler(req: Request) {
  const encoder = new TextEncoder();

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // --- SECURITY: GET CLIENT IP ---
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  // --- SECURITY: RATE LIMIT CHECK ---
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded.',
        message: "You've reached your free trial limit. Sign up to continue!",
        upgradeCTA: true
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      }
    );
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // 1. Get Key from environment variable (REQUIRED for OpenRouter)
        const apiKey = process.env.OPENROUTER_API_KEY;
        
        if (!apiKey) {
          controller.enqueue(encoder.encode("\n[Error] OpenRouter API key not configured.\nPlease set the OPENROUTER_API_KEY environment variable.\n\nGet your free key at: https://openrouter.ai/keys\n"));
          controller.close();
          return;
        }

        // 2. Parse Input - match Dashboard payload
        const body = await req.json().catch(() => null);
        if (!body) {
          controller.enqueue(encoder.encode("\n[Error: Invalid request body]"));
          controller.close();
          return;
        }
        
        // Support both old and new payload formats
        const { draft, referenceText, fileContent, sessionId, intensity } = body;
        
        // 3. Validate and sanitize input
        if (!draft || typeof draft !== 'string') {
          controller.enqueue(encoder.encode("\n[Error: No text was provided for rewriting. Please enter some text to rewrite.]"));
          controller.close();
          return;
        }
        
        // Check for reference (either text or file)
        const hasReferenceText = referenceText && typeof referenceText === 'string' && referenceText.trim().length > 0;
        const hasFileContent = fileContent && typeof fileContent === 'string' && fileContent.trim().length > 0;
        
        if (!hasReferenceText && !hasFileContent) {
          controller.enqueue(encoder.encode("\n[Error: Reference text is required. Please provide a style reference.]"));
          controller.close();
          return;
        }
        
        // Sanitize inputs to prevent injection attacks
        const sanitizedDraft = sanitizeInput(draft, 5000);
        const validIntensity = Math.min(100, Math.max(0, Number(intensity) || 50));
        
        // 4. Determine reference style to use (RAG or full text)
        let referenceStyle: string;
        
        if (hasFileContent && shouldUseRAG(fileContent)) {
          // Use RAG for large files
          const effectiveSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          referenceStyle = await processRAG(fileContent, sanitizedDraft, effectiveSessionId, apiKey, controller, encoder);
        } else if (hasFileContent) {
          // Small file - use full content directly
          referenceStyle = sanitizeInput(fileContent, 5000);
        } else {
          // Text reference - use as is
          referenceStyle = sanitizeInput(referenceText, 5000);
        }
        
        // 5. Define the Model - Meta: Llama 3.3 70B Instruct from OpenRouter
        const MODEL_ID = "meta-llama/llama-3.3-70b-instruct";

        controller.enqueue(encoder.encode(`Initiating GhostNote...\n\n`));

        // 6. Send Request to OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://ghostnote.site',
            'X-Title': 'GhostNote',
          },
          body: JSON.stringify({
            model: MODEL_ID,
            messages: [
              {
                role: "system",
                content: `You are a professional ghostwriter. Analyze the reference text to understand the writing style, tone, vocabulary, sentence structure, and voice.

INTENSITY SETTING: ${validIntensity}%
- At 0-20%: Be creative and loosely inspired by the reference. Use your own words while capturing the general vibe.
- At 21-50%: Moderate adherence. Match the tone and some phrasing patterns but allow natural variation.
- At 51-80%: Strong adherence. Closely follow the writing style, vocabulary choices, and sentence structures.
- At 81-100%: Exact clone. Strictly mirror the reference style, using similar vocabulary, sentence length, punctuation patterns, and voice.

Rewrite the user's draft according to this intensity level. Return ONLY the rewritten text, no explanations.

Reference Style:\n${referenceStyle}`
              },
              {
                role: "user",
                content: `Rewrite this text at ${validIntensity}% intensity:\n\n${sanitizedDraft}`
              }
            ],
            stream: true,
            max_tokens: 2000, // Prevent excessive output
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
          } else if (errText.includes('model')) {
            diag += '\n[Key Doctor] Model not found. Please check the model ID.';
          }

          controller.enqueue(encoder.encode(`\n${diag}`));
          return;
        }

        if (!response.body) throw new Error("No response body");

        // 7. Read Stream
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
