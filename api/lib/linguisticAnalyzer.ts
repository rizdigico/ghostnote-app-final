/**
 * Linguistic DNA Analyzer - Phase 2 Upgrade
 * Extracts scientific metrics from text instead of just "vibes"
 */

// Common stop words to filter out for vocabulary analysis
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
  'if', 'as', 'because', 'until', 'while', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up',
  'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then'
]);

export interface CadenceMetrics {
  avgSentenceLength: number;
  variance: 'low' | 'medium' | 'high';
  minLength: number;
  maxLength: number;
}

export interface VocabularyMetrics {
  complexity: 'simple' | 'moderate' | 'complex';
  jargonLevel: 'none' | 'low' | 'medium' | 'high';
  uniqueWordRatio: number;
}

export interface FormattingFingerprint {
  casing: 'lowercase' | 'uppercase' | 'mixed' | 'sentence';
  punctuation: 'minimal' | 'standard' | 'heavy';
  emojiFrequency: 'none' | 'low' | 'medium' | 'high';
  usesOxfordComma: boolean | null;
  doubleSpacing: boolean | null;
}

export interface LinguisticDNA {
  tone: string;
  cadence: CadenceMetrics;
  vocabulary: VocabularyMetrics;
  formatting: FormattingFingerprint;
  signaturePhrases: string[];
  topWords: string[];
  sampleSentences: string[];
}

// Calculate average sentence length and variance
function calculateCadence(text: string): CadenceMetrics {
  // Split into sentences (naive but effective)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (sentences.length === 0) {
    return { avgSentenceLength: 0, variance: 'low', minLength: 0, maxLength: 0 };
  }
  
  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  
  // Calculate variance
  const squaredDiffs = lengths.map(len => Math.pow(len - avg, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  
  let varianceLevel: 'low' | 'medium' | 'high';
  if (stdDev < 3) varianceLevel = 'low';
  else if (stdDev < 7) varianceLevel = 'medium';
  else varianceLevel = 'high';
  
  return {
    avgSentenceLength: Math.round(avg * 10) / 10,
    variance: varianceLevel,
    minLength: Math.min(...lengths),
    maxLength: Math.max(...lengths)
  };
}

// Analyze vocabulary complexity
function analyzeVocabulary(text: string): VocabularyMetrics {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const uniqueWords = new Set(words.filter(w => !STOP_WORDS.has(w)));
  
  const uniqueRatio = uniqueWords.size / words.length;
  
  // Determine complexity based on average word length
  const avgWordLength = words.reduce((a, w) => a + w.length, 0) / words.length;
  let complexity: 'simple' | 'moderate' | 'complex';
  if (avgWordLength < 4) complexity = 'simple';
  else if (avgWordLength < 5.5) complexity = 'moderate';
  else complexity = 'complex';
  
  // Jargon detection (words > 8 chars often indicate jargon)
  const jargonWords = words.filter(w => w.length > 8);
  const jargonRatio = jargonWords.length / words.length;
  
  let jargonLevel: 'none' | 'low' | 'medium' | 'high';
  if (jargonRatio < 0.02) jargonLevel = 'none';
  else if (jargonRatio < 0.08) jargonLevel = 'low';
  else if (jargonRatio < 0.15) jargonLevel = 'medium';
  else jargonLevel = 'high';
  
  return {
    complexity,
    jargonLevel,
    uniqueWordRatio: Math.round(uniqueRatio * 100) / 100
  };
}

// Analyze formatting habits
function analyzeFormatting(text: string): FormattingFingerprint {
  // Check casing
  const hasUppercase = /[A-Z]/.test(text);
  const hasLowercase = /[a-z]/.test(text);
  const uppercaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  
  let casing: 'lowercase' | 'uppercase' | 'mixed' | 'sentence';
  if (!hasUppercase) casing = 'lowercase';
  else if (!hasLowercase) casing = 'uppercase';
  else if (uppercaseRatio < 0.05) casing = 'sentence';
  else casing = 'mixed';
  
  // Check punctuation density
  const punctuationCount = (text.match(/[.,!?;:]/g) || []).length;
  const words = text.split(/\s+/).length;
  const punctRatio = punctuationCount / words;
  
  let punctuation: 'minimal' | 'standard' | 'heavy';
  if (punctRatio < 0.3) punctuation = 'minimal';
  else if (punctRatio < 0.6) punctuation = 'standard';
  else punctuation = 'heavy';
  
  // Emoji detection
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  let emojiFrequency: 'none' | 'low' | 'medium' | 'high';
  if (emojiCount === 0) emojiFrequency = 'none';
  else if (emojiCount / words < 0.02) emojiFrequency = 'low';
  else if (emojiCount / words < 0.1) emojiFrequency = 'medium';
  else emojiFrequency = 'high';
  
  // Oxford comma detection
  const oxfordCommaMatch = text.match(/, \w+ and \w+/g);
  const usesOxfordComma = oxfordCommaMatch ? true : null;
  
  // Double spacing
  const doubleSpace = text.includes('  ');
  
  return {
    casing,
    punctuation,
    emojiFrequency,
    usesOxfordComma,
    doubleSpacing: doubleSpace
  };
}

// Extract signature phrases (2-4 word combinations that appear frequently)
function extractSignaturePhrases(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const phraseCount: Record<string, number> = {};
  
  // Extract 2-4 word phrases
  for (let len = 2; len <= 4; len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (!STOP_WORDS.has(words[i])) { // Don't start with stop word
        phraseCount[phrase] = (phraseCount[phrase] || 0) + 1;
      }
    }
  }
  
  // Filter to phrases appearing at least 2 times
  const signatures = Object.entries(phraseCount)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase]) => phrase);
  
  return signatures;
}

// Extract top words (excluding stop words)
function extractTopWords(text: string): string[] {
  const words = text.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  
  const wordCount: Record<string, number> = {};
  words.forEach(w => {
    wordCount[w] = (wordCount[w] || 0) + 1;
  });
  
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// Extract sample sentences (3 diverse examples)
function extractSampleSentences(text: string): string[] {
  const sentences = text.split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.split(/\s+/).length > 5);
  
  if (sentences.length <= 3) return sentences;
  
  // Pick diverse samples: short, medium, long
  const short = sentences.filter(s => s.split(/\s+/).length < 10);
  const medium = sentences.filter(s => s.split(/\s+/).length >= 10 && s.split(/\s+/).length < 20);
  const long = sentences.filter(s => s.split(/\s+/).length >= 20);
  
  const samples = [];
  if (short.length > 0) samples.push(short[Math.floor(short.length / 2)]);
  if (medium.length > 0) samples.push(medium[Math.floor(medium.length / 2)]);
  if (long.length > 0) samples.push(long[Math.floor(long.length / 2)]);
  
  return samples.slice(0, 3);
}

// Main analysis function
export function analyzeLinguisticDNA(text: string): LinguisticDNA {
  if (!text || text.trim().length < 50) {
    // Return defaults for very short text
    return {
      tone: 'neutral',
      cadence: { avgSentenceLength: 15, variance: 'medium', minLength: 5, maxLength: 25 },
      vocabulary: { complexity: 'moderate', jargonLevel: 'low', uniqueWordRatio: 0.4 },
      formatting: { casing: 'sentence', punctuation: 'standard', emojiFrequency: 'none', usesOxfordComma: null, doubleSpacing: false },
      signaturePhrases: [],
      topWords: [],
      sampleSentences: []
    };
  }
  
  const cadence = calculateCadence(text);
  const vocabulary = analyzeVocabulary(text);
  const formatting = analyzeFormatting(text);
  const signaturePhrases = extractSignaturePhrases(text);
  const topWords = extractTopWords(text);
  const sampleSentences = extractSampleSentences(text);
  
  // Determine tone based on vocabulary and formatting
  let tone = 'neutral';
  if (formatting.emojiFrequency === 'high' || text.includes('🔥') || text.includes('👀')) {
    tone = 'energetic';
  } else if (vocabulary.complexity === 'complex' || formatting.casing === 'sentence') {
    tone = 'professional';
  } else if (cadence.avgSentenceLength < 10 && formatting.punctuation === 'minimal') {
    tone = 'casual';
  } else if (signaturePhrases.some(p => p.includes('?'))) {
    tone = 'conversational';
  }
  
  return {
    tone,
    cadence,
    vocabulary,
    formatting,
    signaturePhrases,
    topWords,
    sampleSentences
  };
}

// Build DNA-based prompt for the AI
export function buildDNAPrompt(dna: LinguisticDNA, userPrompt: string): string {
  const examples = dna.sampleSentences.length > 0 
    ? `\n\nEXAMPLES FROM WRITER:\n${dna.sampleSentences.map(s => `- "${s}"`).join('\n')}`
    : '';
  
  return `You are a ghostwriter. Match this writer's DNA exactly.

SYNTAX:
- Average sentence length: ${dna.cadence.avgSentenceLength} words
- Sentence variation: ${dna.cadence.variance} (${dna.cadence.variance === 'high' ? 'mix short and long sentences' : dna.cadence.variance === 'low' ? 'keep sentences similar length' : 'moderate variation'})

VOCABULARY:
- Complexity: ${dna.vocabulary.complexity}
- Jargon level: ${dna.vocabulary.jargonLevel}

FORMATTING:
- Header casing: ${dna.formatting.casing}
- Punctuation: ${dna.formatting.punctuation}
- Emoji usage: ${dna.formatting.emojiFrequency}
${dna.formatting.usesOxfordComma !== null ? `- Oxford comma: ${dna.formatting.usesOxfordComma ? 'yes' : 'no'}` : ''}

SIGNATURE PHRASES (use occasionally):
${dna.signaturePhrases.length > 0 ? dna.signaturePhrases.join(', ') : 'None detected'}

${examples}

Write for: ${userPrompt}

Return ONLY the rewritten text.`;
}

// Calculate similarity score between two texts (0-100)
export function calculateSimilarityScore(originalDNA: LinguisticDNA, generatedText: string): number {
  const generatedDNA = analyzeLinguisticDNA(generatedText);
  
  let score = 100;
  
  // Cadence similarity (40% weight)
  const cadenceDiff = Math.abs(originalDNA.cadence.avgSentenceLength - generatedDNA.cadence.avgSentenceLength);
  const cadencePenalty = Math.min(40, cadenceDiff * 2);
  score -= cadencePenalty;
  
  // Vocabulary similarity (30% weight)
  if (originalDNA.vocabulary.complexity !== generatedDNA.vocabulary.complexity) {
    score -= 15;
  }
  if (originalDNA.vocabulary.jargonLevel !== generatedDNA.vocabulary.jargonLevel) {
    score -= 15;
  }
  
  // Formatting similarity (20% weight)
  if (originalDNA.formatting.casing !== generatedDNA.formatting.casing) {
    score -= 10;
  }
  if (originalDNA.formatting.punctuation !== generatedDNA.formatting.punctuation) {
    score -= 10;
  }
  
  // Signature phrase usage (10% weight)
  const hasSignature = originalDNA.signaturePhrases.some(phrase => 
    generatedText.toLowerCase().includes(phrase)
  );
  if (!hasSignature && originalDNA.signaturePhrases.length > 0) {
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}
