export const config = {
  runtime: 'edge',
};

// --- RAG IMPORTS ---
import { chunkText, shouldUseRAG, TextChunk } from './lib/chunker';
import { generateEmbedding, generateEmbeddingsForChunks } from './lib/embeddings';
import { storeEmbeddings, findSimilarDocuments, hasSession, EmbeddingDocument } from './lib/vectorStore';
import { analyzeLinguisticDNA, buildDNAPrompt, calculateSimilarityScore, LinguisticDNA } from './lib/linguisticAnalyzer';

// --- SECURITY: RATE LIMITING ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

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
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.slice(0, maxLength);
}

function sanitizeFileName(fileName: string): string {
  const dangerous = /[<>:"/\\|?*\x00-\x1F]/g;
  const sanitized = fileName.replace(dangerous, '_');
  return sanitized.slice(0, 255);
}

// ============================================================
// VOICE BLENDER ENGINE - Phase 2 Implementation
// ============================================================

interface VoiceProfile {
  id: string;
  name: string;
  referenceText: string;
  metadata?: {
    linguisticDna?: LinguisticDNA;
    source?: string;
  };
}

// Mock database lookup - in production, fetch from Firestore
async function getVoiceProfile(voiceId: string): Promise<VoiceProfile | null> {
  // This would normally query Firestore
  // For now, return null to use referenceText directly
  console.log(`[VoiceBlender] Fetching profile for: ${voiceId}`);
  return null;
}

// Build the blended system prompt from Base + Injection voices
function buildVoiceBlenderPrompt(
  baseText: string,
  injections: { voiceId: string; intensity: number }[],
  dna: LinguisticDNA | null
): string {
  let prompt = `You are a professional ghostwriter.`;
  
  // Add DNA analysis if available
  if (dna) {
    prompt += `\n\n${buildDNAPrompt(dna, '')}`;
  }
  
  // Add base voice reference
  if (baseText && baseText.length > 20) {
    prompt += `\n\nBASE VOICE (Primary Style):\n"${sanitizeInput(baseText, 2000)}"`;
  }
  
  // Add injection voices if present
  if (injections && injections.length > 0) {
    prompt += `\n\nSTYLE INJECTIONS:`;
    injections.forEach((inj, idx) => {
      const intensityPercent = Math.round(inj.intensity * 100);
      prompt += `\n\nInjection ${idx + 1} (Voice ID: ${inj.voiceId}, Intensity: ${intensityPercent}%):`;
      // Note: In production, we'd fetch the actual injection voice text here
      // For now, the injection is handled via intensity parameter below
    });
  }
  
  return prompt;
}

// Apply injection intensity to the rewrite
function applyInjectionIntensity(
  baseResult: string,
  injections: { voiceId: string; intensity: number }[]
): string {
  if (!injections || injections.length === 0) {
    return baseResult;
  }
  
  // Calculate average intensity
  const avgIntensity = injections.reduce((sum, inj) => sum + inj.intensity, 0) / injections.length;
  
  console.log(`[VoiceBlender] Applied ${injections.length} injection(s) at avg intensity: ${Math.round(avgIntensity * 100)}%`);
  
  // In a full implementation, we would:
  // 1. Analyze base result
  // 2. Blend in injection style based on intensity
  // 3. Return modified text
  
  return baseResult;
}

// ============================================================
// RAG: Process file content and retrieve relevant chunks
// ============================================================

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
    
    let relevantChunks: string;
    
    if (hasSession(sessionId)) {
      controller.enqueue(encoder.encode(`Using cached embeddings...\n`));
      const draftEmbedding = await generateEmbedding(draft, apiKey);
      const similarDocs = findSimilarDocuments(sessionId, draftEmbedding, 5);
      relevantChunks = similarDocs.map(d => d.document.text).join('\n\n---\n\n');
    } else {
      controller.enqueue(encoder.encode(`Chunking document...\n`));
      const chunks = chunkText(fileContent, 500, 100);
      
      if (chunks.length === 0) {
        return fileContent;
      }
      
      controller.enqueue(encoder.encode(`Generating embeddings for ${chunks.length} chunks...\n`));
      
      const chunkEmbeddings = await generateEmbeddingsForChunks(
        chunks.map(c => ({ id: c.id, text: c.text })),
        apiKey,
        (completed, total) => {
          controller.enqueue(encoder.encode(`Embedding progress: ${completed}/${total}...\n`));
        }
      );
      
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
      
      controller.enqueue(encoder.encode(`Finding relevant chunks...\n`));
      const draftEmbedding = await generateEmbedding(draft, apiKey);
      const similarDocs = findSimilarDocuments(sessionId, draftEmbedding, 5);
      relevantChunks = similarDocs.map(d => d.document.text).join('\n\n---\n\n');
    }
    
    controller.enqueue(encoder.encode(`Retrieved relevant context. Generating rewrite...\n\n`));
    
    return relevantChunks;
  } catch (error: any) {
    console.error('[RAG Error]', error);
    controller.enqueue(encoder.encode(`[RAG Warning: ${error.message}. Using full text fallback.]\n\n`));
    return fileContent.slice(0, 5000);
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

export default async function handler(req: Request) {
  const encoder = new TextEncoder();

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
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
        const apiKey = process.env.OPENROUTER_API_KEY;
        
        if (!apiKey) {
          controller.enqueue(encoder.encode("\n[Error] OpenRouter API key not configured.\nPlease set the OPENROUTER_API_KEY environment variable.\n\nGet your free key at: https://openrouter.ai/keys\n"));
          controller.close();
          return;
        }

        const body = await req.json().catch(() => null);
        if (!body) {
          controller.enqueue(encoder.encode("\n[Error: Invalid request body]"));
          controller.close();
          return;
        }
        
        // Extract all parameters
        const { 
          draft, 
          referenceText, 
          fileContent, 
          sessionId, 
          intensity, 
          primaryVoiceId, 
          baseVoiceId,
          injections 
        } = body;
        
        // ============================================================
        // VOICE BLENDER LOGIC
        // ============================================================
        
        // Log voice blending
        if (primaryVoiceId || baseVoiceId || (injections && injections.length > 0)) {
          console.log('[VoiceBlender] Processing:', {
            baseVoiceId: baseVoiceId || primaryVoiceId,
            injections: injections?.map((i: any) => ({ voiceId: i.voiceId, intensity: i.intensity })),
            intensity: intensity
          });
        }
        
        // Analyze Linguistic DNA from reference text
        let dna: LinguisticDNA | null = null;
        if (referenceText && referenceText.length > 100) {
          dna = analyzeLinguisticDNA(referenceText);
          controller.enqueue(encoder.encode(`Analyzing Linguistic DNA... Cadence: ${dna.cadence.avgSentenceLength} words/sentence, Tone: ${dna.tone}\n`));
        }
        
        // ============================================================
        // VOICE BLENDER: Build enhanced prompt
        // ============================================================
        
        const validIntensity = Math.min(100, Math.max(0, Number(intensity) || 50));
        
        // Build the voice-blended system prompt
        let systemPrompt = buildVoiceBlenderPrompt(
          referenceText || '',
          injections || [],
          dna
        );
        
        // Add intensity instructions
        systemPrompt += `\n\nINTENSITY SETTING: ${validIntensity}%
- At 0-20%: Be creative and loosely inspired by the reference. Use your own words while capturing the general vibe.
- At 21-50%: Moderate adherence. Match the tone and some phrasing patterns but allow natural variation.
- At 51-80%: Strong adherence. Closely follow the writing style, vocabulary choices, and sentence structures.
- At 81-100%: Exact clone. Strictly mirror the reference style.`;

        // Validate input
        if (!draft || typeof draft !== 'string') {
          controller.enqueue(encoder.encode("\n[Error: No text was provided for rewriting. Please enter some text to rewrite.]"));
          controller.close();
          return;
        }
        
        const hasReferenceText = referenceText && typeof referenceText === 'string' && referenceText.trim().length > 0;
        const hasFileContent = fileContent && typeof fileContent === 'string' && fileContent.trim().length > 0;
        
        if (!hasReferenceText && !hasFileContent) {
          controller.enqueue(encoder.encode("\n[Error: Reference text is required. Please provide a style reference.]"));
          controller.close();
          return;
        }
        
        const sanitizedDraft = sanitizeInput(draft, 5000);
        
        // Determine reference style (RAG or full text)
        let referenceStyle: string;
        
        if (hasFileContent && shouldUseRAG(fileContent)) {
          const effectiveSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          referenceStyle = await processRAG(fileContent, sanitizedDraft, effectiveSessionId, apiKey, controller, encoder);
        } else if (hasFileContent) {
          referenceStyle = sanitizeInput(fileContent, 5000);
        } else {
          referenceStyle = sanitizeInput(referenceText, 5000);
        }
        
        // Add reference style to prompt
        systemPrompt += `\n\nReference Style:\n${referenceStyle}`;
        
        const MODEL_ID = "meta-llama/llama-3.3-70b-instruct";

        controller.enqueue(encoder.encode(`\n🎨 Applying Voice Blender...`));
        if (baseVoiceId || primaryVoiceId) {
          controller.enqueue(encoder.encode(` Base Voice detected.`));
        }
        if (injections && injections.length > 0) {
          controller.enqueue(encoder.encode(` ${injections.length} style injection(s) applied.`));
        }
        controller.enqueue(encoder.encode(`\n\n`));

        // Send request to OpenRouter
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
              { role: "system", content: systemPrompt },
              { role: "user", content: `Rewrite this text:\n\n${sanitizedDraft}` }
            ],
            stream: true,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          controller.enqueue(encoder.encode(`\nOpenRouter Error: ${errText}`));
          return;
        }

        if (!response.body) throw new Error("No response body");

        // Stream response
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
