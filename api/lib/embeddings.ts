/**
 * Embedding Service for RAG
 * 
 * Generates vector embeddings using OpenRouter's free embedding models.
 * Uses sentence-transformers/all-MiniLM-L6-v2 (384 dimensions, free tier).
 */

// Free embedding model from OpenRouter
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/embeddings";

// Expected embedding dimension for this model
export const EMBEDDING_DIMENSION = 384;

/**
 * Generate embedding for a single text
 * 
 * @param text - Text to embed
 * @param apiKey - OpenRouter API key
 * @returns Embedding vector (384 dimensions)
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  // Truncate text if too long (model has token limits)
  const truncatedText = truncateToTokens(text, 512);
  
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ghostnote.site",
      "X-Title": "GhostNote RAG",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncatedText,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  // OpenRouter returns embeddings in data[0].embedding format
  const embedding = data.data?.[0]?.embedding;
  
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Invalid embedding response format");
  }
  
  // Validate dimension
  if (embedding.length !== EMBEDDING_DIMENSION) {
    console.warn(`Unexpected embedding dimension: ${embedding.length}, expected ${EMBEDDING_DIMENSION}`);
  }
  
  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateEmbedding multiple times
 * 
 * @param texts - Array of texts to embed
 * @param apiKey - OpenRouter API key
 * @returns Array of embedding vectors
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }
  
  // Truncate all texts
  const truncatedTexts = texts.map(t => truncateToTokens(t, 512));
  
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ghostnote.site",
      "X-Title": "GhostNote RAG",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncatedTexts,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  // OpenRouter returns array of embeddings in data array
  const embeddings = data.data?.map((item: any) => item.embedding);
  
  if (!embeddings || !Array.isArray(embeddings)) {
    throw new Error("Invalid embedding batch response format");
  }
  
  return embeddings;
}

/**
 * Generate embeddings for chunks with progress tracking
 * 
 * @param chunks - Array of text chunks
 * @param apiKey - OpenRouter API key
 * @param onProgress - Optional callback for progress updates
 * @returns Array of embeddings matching chunks order
 */
export async function generateEmbeddingsForChunks(
  chunks: { id: number; text: string }[],
  apiKey: string,
  onProgress?: (completed: number, total: number) => void
): Promise<{ id: number; embedding: number[] }[]> {
  const results: { id: number; embedding: number[] }[] = [];
  
  // Process in batches of 10 to avoid rate limits
  const BATCH_SIZE = 10;
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchTexts = batch.map(c => c.text);
    
    try {
      const batchEmbeddings = await generateEmbeddingsBatch(batchTexts, apiKey);
      
      batch.forEach((chunk, index) => {
        results.push({
          id: chunk.id,
          embedding: batchEmbeddings[index]
        });
      });
      
      if (onProgress) {
        onProgress(Math.min(i + BATCH_SIZE, chunks.length), chunks.length);
      }
    } catch (error) {
      console.error(`Error generating embeddings for batch ${i}:`, error);
      // Continue with next batch, missing embeddings will be handled downstream
    }
  }
  
  return results;
}

/**
 * Truncate text to approximate token limit
 * 
 * Rough estimation: ~4 characters per token for English
 * 
 * @param text - Text to truncate
 * @param maxTokens - Maximum tokens allowed
 * @returns Truncated text
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4; // Rough estimate
  
  if (text.length <= maxChars) {
    return text;
  }
  
  // Try to break at sentence boundary
  const truncated = text.slice(0, maxChars);
  const lastSentence = truncated.match(/.*[.!?]/);
  
  if (lastSentence) {
    return lastSentence[0];
  }
  
  // Fallback: break at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.8) {
    return truncated.slice(0, lastSpace);
  }
  
  return truncated;
}

/**
 * Validate that an embedding has the expected dimension
 * 
 * @param embedding - Embedding vector to validate
 * @returns true if valid
 */
export function validateEmbedding(embedding: number[]): boolean {
  return (
    Array.isArray(embedding) &&
    embedding.length === EMBEDDING_DIMENSION &&
    embedding.every(n => typeof n === 'number' && !isNaN(n))
  );
}

/**
 * Calculate approximate cost for embeddings
 * (For monitoring purposes - this model is free on OpenRouter)
 * 
 * @param textLength - Total characters to embed
 * @returns Cost in USD (always 0 for free model)
 */
export function estimateEmbeddingCost(textLength: number): number {
  // all-MiniLM-L6-v2 is free on OpenRouter
  return 0;
}
