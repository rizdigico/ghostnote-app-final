/**
 * Vector Similarity Utilities for RAG
 * 
 * Provides cosine similarity calculation for comparing embeddings.
 * Optimized for the 384-dimensional embeddings from all-MiniLM-L6-v2.
 */

/**
 * Calculate cosine similarity between two vectors
 * 
 * Cosine similarity = (A · B) / (||A|| * ||B||)
 * Returns a value between -1 and 1, where:
 * - 1 means identical direction (perfect match)
 * - 0 means orthogonal (no similarity)
 * - -1 means opposite direction
 * 
 * For embeddings, we typically expect values between 0 and 1.
 * 
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity score (-1 to 1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  
  if (a.length === 0) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

/**
 * Calculate cosine similarity for normalized vectors (faster)
 * 
 * If vectors are already normalized (unit length), we can skip
 * the normalization step and just compute the dot product.
 * 
 * @param a - First normalized vector
 * @param b - Second normalized vector
 * @returns Cosine similarity score
 */
export function cosineSimilarityNormalized(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  
  return dotProduct;
}

/**
 * Normalize a vector to unit length
 * 
 * @param vector - Input vector
 * @returns Normalized vector
 */
export function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  
  if (norm === 0) {
    return vector;
  }
  
  return vector.map(val => val / norm);
}

/**
 * Find top-k most similar vectors
 * 
 * @param query - Query vector
 * @param candidates - Array of candidate vectors with IDs
 * @param k - Number of top results to return
 * @returns Array of top-k matches with scores
 */
export function findTopKSimilar(
  query: number[],
  candidates: { id: string | number; vector: number[] }[],
  k: number
): { id: string | number; score: number }[] {
  // Calculate similarities
  const similarities = candidates.map(candidate => ({
    id: candidate.id,
    score: cosineSimilarity(query, candidate.vector)
  }));
  
  // Sort by score descending
  similarities.sort((a, b) => b.score - a.score);
  
  // Return top k
  return similarities.slice(0, k);
}

/**
 * Calculate Euclidean distance between two vectors
 * 
 * Alternative similarity metric. Smaller distances mean more similar.
 * 
 * @param a - First vector
 * @param b - Second vector
 * @returns Euclidean distance
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Convert similarity score to percentage (0-100)
 * Useful for display/debugging purposes
 * 
 * @param similarity - Cosine similarity score (-1 to 1)
 * @returns Percentage (0 to 100)
 */
export function similarityToPercentage(similarity: number): number {
  // Cosine similarity for embeddings is typically 0 to 1
  // Map to percentage, clamping at 0-100
  return Math.round(Math.max(0, Math.min(1, similarity)) * 100);
}

/**
 * Batch calculate similarities (more efficient for large datasets)
 * 
 * @param query - Query vector
 * @param candidates - Array of candidate vectors
 * @returns Array of similarity scores
 */
export function batchCosineSimilarity(
  query: number[],
  candidates: number[][]
): number[] {
  return candidates.map(candidate => cosineSimilarity(query, candidate));
}
