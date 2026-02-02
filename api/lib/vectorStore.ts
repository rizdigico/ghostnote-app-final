/**
 * In-Memory Vector Store for RAG
 * 
 * Session-based storage for embeddings with similarity search.
 * Uses Map for O(1) lookups and maintains session isolation.
 * 
 * Note: Data is lost on server restart (acceptable for MVP).
 * For production with persistence, migrate to Redis or Firestore.
 */

import { findTopKSimilar } from './similarity';

export interface EmbeddingDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface VectorStoreEntry {
  documents: EmbeddingDocument[];
  createdAt: number;
  lastAccessed: number;
}

// In-memory storage: sessionId -> entry
const vectorStore = new Map<string, VectorStoreEntry>();

// Cleanup configuration
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // Cleanup every 10 minutes

/**
 * Store embeddings for a session
 * 
 * @param sessionId - Unique session identifier
 * @param documents - Array of documents with embeddings
 */
export function storeEmbeddings(
  sessionId: string,
  documents: EmbeddingDocument[]
): void {
  const now = Date.now();
  
  vectorStore.set(sessionId, {
    documents,
    createdAt: now,
    lastAccessed: now
  });
  
  console.log(`[VectorStore] Stored ${documents.length} embeddings for session ${sessionId}`);
}

/**
 * Find top-k most similar documents for a query
 * 
 * @param sessionId - Session identifier
 * @param queryEmbedding - Query vector
 * @param topK - Number of results to return (default: 5)
 * @returns Array of top-k matching documents with similarity scores
 */
export function findSimilarDocuments(
  sessionId: string,
  queryEmbedding: number[],
  topK: number = 5
): { document: EmbeddingDocument; score: number }[] {
  const entry = vectorStore.get(sessionId);
  
  if (!entry || entry.documents.length === 0) {
    return [];
  }
  
  // Update last accessed time
  entry.lastAccessed = Date.now();
  
  // Prepare candidates for similarity search
  const candidates = entry.documents.map(doc => ({
    id: doc.id,
    vector: doc.embedding
  }));
  
  // Find top-k similar
  const topMatches = findTopKSimilar(queryEmbedding, candidates, topK);
  
  // Map back to documents
  const documentMap = new Map(entry.documents.map(d => [d.id, d]));
  
  return topMatches.map(match => ({
    document: documentMap.get(match.id as string)!,
    score: match.score
  }));
}

/**
 * Get all documents for a session
 * 
 * @param sessionId - Session identifier
 * @returns Array of documents or empty array if not found
 */
export function getDocuments(sessionId: string): EmbeddingDocument[] {
  const entry = vectorStore.get(sessionId);
  return entry?.documents || [];
}

/**
 * Check if a session has stored embeddings
 * 
 * @param sessionId - Session identifier
 * @returns true if session exists and has documents
 */
export function hasSession(sessionId: string): boolean {
  const entry = vectorStore.get(sessionId);
  return !!entry && entry.documents.length > 0;
}

/**
 * Clear a specific session
 * 
 * @param sessionId - Session identifier
 */
export function clearSession(sessionId: string): void {
  const deleted = vectorStore.delete(sessionId);
  if (deleted) {
    console.log(`[VectorStore] Cleared session ${sessionId}`);
  }
}

/**
 * Get store statistics
 * 
 * @returns Statistics object
 */
export function getStoreStats(): {
  totalSessions: number;
  totalDocuments: number;
  oldestSession: number | null;
} {
  let totalDocuments = 0;
  let oldestSession: number | null = null;
  
  for (const entry of vectorStore.values()) {
    totalDocuments += entry.documents.length;
    if (oldestSession === null || entry.lastAccessed < oldestSession) {
      oldestSession = entry.lastAccessed;
    }
  }
  
  return {
    totalSessions: vectorStore.size,
    totalDocuments,
    oldestSession
  };
}

/**
 * Clean up expired sessions
 * 
 * Removes sessions that haven't been accessed within the TTL.
 * 
 * @returns Number of sessions cleaned up
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  const expiredSessions: string[] = [];
  
  for (const [sessionId, entry] of vectorStore.entries()) {
    if (now - entry.lastAccessed > SESSION_TTL_MS) {
      expiredSessions.push(sessionId);
    }
  }
  
  expiredSessions.forEach(sessionId => {
    vectorStore.delete(sessionId);
  });
  
  if (expiredSessions.length > 0) {
    console.log(`[VectorStore] Cleaned up ${expiredSessions.length} expired sessions`);
  }
  
  return expiredSessions.length;
}

/**
 * Clear all sessions (use with caution)
 */
export function clearAllSessions(): void {
  const count = vectorStore.size;
  vectorStore.clear();
  console.log(`[VectorStore] Cleared all ${count} sessions`);
}

// Start periodic cleanup
setInterval(() => {
  cleanupExpiredSessions();
}, CLEANUP_INTERVAL_MS);

console.log('[VectorStore] Initialized with 1-hour session TTL');