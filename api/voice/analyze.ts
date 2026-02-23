export const config = {
  runtime: 'edge',
};

// --- IMPORT REQUIRED MODULES ---
import { verifyAuthToken } from '../lib/verifyAuthToken';

// --- RATE LIMITING ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const ANALYZE_RATE_LIMIT = 5; // 5 requests per minute per user
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= ANALYZE_RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// --- INPUT VALIDATION ---
interface AnalyzeRequest {
  text: string;
}

// --- OUTPUT TYPES ---
interface VoiceCharacteristics {
  tone: string;
  style: string;
  vocabulary: string;
  cadence: string;
  structure: string;
}

interface GhostwritingRules {
  general: string[];
  toneGuidelines: string[];
  styleGuidelines: string[];
  vocabularyGuidelines: string[];
  cadenceGuidelines: string[];
  structureGuidelines: string[];
}

interface AnalysisResult {
  characteristics: VoiceCharacteristics;
  rules: GhostwritingRules;
  analyzedAt: string;
}

// --- LLM ANALYSIS ---
async function analyzeWithLLM(text: string): Promise<AnalysisResult> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  
  if (!openRouterKey) {
    throw new Error('OpenRouter API key is not configured');
  }

  const systemPrompt = `You are a professional linguistic analyzer specializing in voice and writing style analysis. Your task is to analyze a given text and extract detailed voice characteristics, then generate comprehensive ghostwriting rules based on the analysis.

Your analysis should include:
1. Tone - The emotional quality and attitude of the writing
2. Style - The overall writing style (e.g., conversational, formal, poetic, technical)
3. Vocabulary - The complexity, jargon level, and word choice patterns
4. Cadence - The rhythm, sentence structure variation, and pacing
5. Structure - How ideas are organized and presented

For each of these areas, you must:
- Provide a detailed description of the characteristic
- Identify key patterns and unique aspects
- Generate specific ghostwriting rules that would allow someone to replicate this voice

The ghostwriting rules should be practical, actionable guidelines that a writer could follow to produce content in the same voice. Include specific examples and prohibitions where appropriate.

Return your analysis in JSON format with the following structure:
{
  "characteristics": {
    "tone": "description of tone",
    "style": "description of style", 
    "vocabulary": "description of vocabulary",
    "cadence": "description of cadence",
    "structure": "description of structure"
  },
  "rules": {
    "general": ["general guidelines"],
    "toneGuidelines": ["specific tone rules"],
    "styleGuidelines": ["specific style rules"], 
    "vocabularyGuidelines": ["specific vocabulary rules"],
    "cadenceGuidelines": ["specific cadence rules"],
    "structureGuidelines": ["specific structure rules"]
  },
  "analyzedAt": "ISO timestamp"
}

Ensure your analysis is detailed and specific to the provided text. Avoid generic descriptions. Focus on what makes this voice unique and how to replicate it.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openRouterKey}`,
      'HTTP-Referer': 'https://ghostnote.app',
      'X-Title': 'GhostNote Voice Analysis'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Analyze the following text and provide detailed voice characteristics and ghostwriting rules:

${text}`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenRouter API error:', errorData);
    throw new Error(`LLM analysis failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
    throw new Error('Invalid LLM response format');
  }

  try {
    const analysis = JSON.parse(data.choices[0].message.content);
    return analysis;
  } catch (parseError) {
    console.error('Failed to parse LLM response:', parseError);
    throw new Error('Failed to parse LLM analysis results');
  }
}

// --- MAIN ANALYSIS FUNCTION ---
async function analyzeVoice(request: AnalyzeRequest): Promise<AnalysisResult> {
  const { text } = request;
  
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required');
  }

  if (text.trim().length < 200) {
    throw new Error('Text must be at least 200 characters long for accurate analysis');
  }

  if (text.trim().length > 10000) {
    throw new Error('Text must be less than 10,000 characters');
  }

  // Analyze with LLM
  const analysisResult = await analyzeWithLLM(text.trim());

  // Ensure all required fields are present
  if (!analysisResult.characteristics || !analysisResult.rules) {
    throw new Error('LLM analysis returned incomplete data');
  }

  // Add timestamp if not present
  if (!analysisResult.analyzedAt) {
    analysisResult.analyzedAt = new Date().toISOString();
  }

  return analysisResult;
}

// --- API HANDLER ---
export default async function handler(request: Request): Promise<Response> {
  try {
    // Rate limiting based on IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing or invalid authentication token',
          code: 'UNAUTHORIZED'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice(7);
    const user = await verifyAuthToken(token);
    
    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or expired authentication token',
          code: 'INVALID_TOKEN'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate request
    const analyzeRequest: AnalyzeRequest = body;
    if (!analyzeRequest.text || analyzeRequest.text.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Text is required',
          code: 'MISSING_TEXT'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Perform analysis
    const result = await analyzeVoice(analyzeRequest);

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice analysis error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
            code: 'RATE_LIMIT_EXCEEDED'
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (error.message.includes('Text must be')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
            code: 'INVALID_TEXT_LENGTH'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          code: 'ANALYSIS_FAILED'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generic error
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred during analysis',
        code: 'UNEXPECTED_ERROR'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
