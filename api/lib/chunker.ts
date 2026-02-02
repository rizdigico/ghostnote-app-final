/**
 * Text Chunking Utility for RAG
 * 
 * Splits large text into overlapping chunks for embedding and retrieval.
 * Optimized for semantic coherence while maintaining context at boundaries.
 */

export interface TextChunk {
  id: number;
  text: string;
  startIndex: number;
  endIndex: number;
}

// Default configuration optimized for cost and quality
const DEFAULT_CHUNK_SIZE = 500;  // characters per chunk
const DEFAULT_OVERLAP = 100;     // characters of overlap between chunks
const RAG_THRESHOLD = 2000;      // characters - below this, use full text

/**
 * Split text into overlapping chunks
 * 
 * @param text - The text to chunk
 * @param chunkSize - Target size of each chunk in characters (default: 500)
 * @param overlap - Number of characters to overlap between chunks (default: 100)
 * @returns Array of text chunks with metadata
 */
export function chunkText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP
): TextChunk[] {
  // Clean the text first
  const cleanedText = text.trim();
  
  if (!cleanedText) {
    return [];
  }
  
  // If text is smaller than chunk size, return as single chunk
  if (cleanedText.length <= chunkSize) {
    return [{
      id: 0,
      text: cleanedText,
      startIndex: 0,
      endIndex: cleanedText.length
    }];
  }
  
  const chunks: TextChunk[] = [];
  let id = 0;
  let startIndex = 0;
  
  while (startIndex < cleanedText.length) {
    // Calculate end index for this chunk
    let endIndex = Math.min(startIndex + chunkSize, cleanedText.length);
    
    // Try to break at a sentence boundary for better semantic coherence
    if (endIndex < cleanedText.length) {
      // Look for sentence endings (. ! ?) followed by space or newline
      const searchStart = Math.max(startIndex + chunkSize - 50, startIndex);
      const searchText = cleanedText.slice(searchStart, endIndex + 50);
      
      // Find the last sentence boundary within the chunk
      const sentenceEndMatch = searchText.match(/[.!?]\s+/);
      if (sentenceEndMatch && sentenceEndMatch.index !== undefined) {
        const boundaryOffset = sentenceEndMatch.index + sentenceEndMatch[0].length;
        endIndex = searchStart + boundaryOffset;
      } else {
        // Fallback: break at word boundary
        const wordBoundary = cleanedText.lastIndexOf(' ', endIndex);
        if (wordBoundary > startIndex) {
          endIndex = wordBoundary;
        }
      }
    }
    
    // Extract the chunk text
    const chunkText = cleanedText.slice(startIndex, endIndex).trim();
    
    if (chunkText) {
      chunks.push({
        id,
        text: chunkText,
        startIndex,
        endIndex
      });
      id++;
    }
    
    // Move start index forward by chunk size minus overlap
    startIndex = endIndex - overlap;
    
    // Prevent infinite loop
    if (startIndex >= endIndex) {
      startIndex = endIndex;
    }
  }
  
  return chunks;
}

/**
 * Check if text should use RAG based on size threshold
 * 
 * @param text - The text to check
 * @param threshold - Character threshold (default: 2000)
 * @returns true if RAG should be used
 */
export function shouldUseRAG(
  text: string,
  threshold: number = RAG_THRESHOLD
): boolean {
  return text.length > threshold;
}

/**
 * Rough estimation of token count (for context window planning)
 * Using approximation: ~4 characters per token for English text
 * 
 * @param text - Text to estimate
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Reconstruct text from chunks (for debugging/display)
 * 
 * @param chunks - Array of chunks
 * @returns Reconstructed text
 */
export function reconstructFromChunks(chunks: TextChunk[]): string {
  return chunks.map(c => c.text).join(' ');
}

/**
 * Get chunk statistics for monitoring/debugging
 * 
 * @param chunks - Array of chunks
 * @returns Statistics object
 */
export function getChunkStats(chunks: TextChunk[]): {
  count: number;
  avgSize: number;
  minSize: number;
  maxSize: number;
  totalSize: number;
} {
  if (chunks.length === 0) {
    return { count: 0, avgSize: 0, minSize: 0, maxSize: 0, totalSize: 0 };
  }
  
  const sizes = chunks.map(c => c.text.length);
  const totalSize = sizes.reduce((a, b) => a + b, 0);
  
  return {
    count: chunks.length,
    avgSize: Math.round(totalSize / chunks.length),
    minSize: Math.min(...sizes),
    maxSize: Math.max(...sizes),
    totalSize
  };
}
