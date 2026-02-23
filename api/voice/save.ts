export const config = {
  runtime: 'edge',
};

// --- IMPORT REQUIRED MODULES ---
import { verifyAuthToken } from '../lib/verifyAuthToken';
import { dbService } from '../../dbService';

// --- INPUT VALIDATION ---
interface SaveVoiceRequest {
  name: string;
  description?: string;
  referenceText: string;
  sourceType?: 'manual' | 'url' | 'file';
  sourceUrl?: string;
  characteristics?: {
    tone: string;
    style: string;
    vocabulary: string;
    cadence: string;
    structure: string;
  };
  rules?: {
    general: string[];
    toneGuidelines: string[];
    styleGuidelines: string[];
    vocabularyGuidelines: string[];
    cadenceGuidelines: string[];
    structureGuidelines: string[];
  };
  linguisticDna?: any;
  visibility?: 'private' | 'team';
  teamId?: string;
}

// --- MAIN SAVE FUNCTION ---
async function saveVoice(userId: string, request: SaveVoiceRequest) {
  const {
    name,
    description,
    referenceText,
    sourceType = 'manual',
    sourceUrl,
    characteristics,
    rules,
    linguisticDna,
    visibility = 'private',
    teamId
  } = request;

  // Validate required fields
  if (!name || name.trim().length === 0) {
    throw new Error('Voice name is required');
  }

  if (name.trim().length > 50) {
    throw new Error('Voice name must be less than 50 characters');
  }

  if (!referenceText || referenceText.trim().length === 0) {
    throw new Error('Reference text is required');
  }

  if (referenceText.trim().length < 200) {
    throw new Error('Reference text must be at least 200 characters for accurate voice analysis');
  }

  if (referenceText.trim().length > 20000) {
    throw new Error('Reference text must be less than 20,000 characters');
  }

  // Validate source type
  const validSourceTypes = ['manual', 'url', 'file'];
  if (sourceType && !validSourceTypes.includes(sourceType)) {
    throw new Error(`Invalid source type. Must be one of: ${validSourceTypes.join(', ')}`);
  }

  // Validate visibility
  const validVisibilities = ['private', 'team'];
  if (visibility && !validVisibilities.includes(visibility)) {
    throw new Error(`Invalid visibility. Must be one of: ${validVisibilities.join(', ')}`);
  }

  // Validate URL format if provided
  if (sourceUrl) {
    try {
      new URL(sourceUrl);
    } catch (error) {
      throw new Error('Invalid source URL format');
    }
  }

  // Save voice preset with team support
  const voicePreset = await dbService.saveVoicePresetWithTeam(
    userId,
    name.trim(),
    referenceText.trim(),
    teamId
  );

  // Add additional metadata
  voicePreset.visibility = visibility;
  voicePreset.metadata = {
    source: sourceType,
    sourceUrl: sourceUrl,
    linguisticDna: linguisticDna,
    characteristics: characteristics,
    rules: rules,
    description: description?.trim(),
    analyzedAt: new Date().toISOString()
  };

  // Update the preset with metadata
  const stored = localStorage.getItem('ghostnote_custom_voices');
  let customVoices = stored ? JSON.parse(stored) : [];
  
  const presetIndex = customVoices.findIndex((v: any) => v.id === voicePreset.id);
  if (presetIndex !== -1) {
    customVoices[presetIndex] = voicePreset;
    localStorage.setItem('ghostnote_custom_voices', JSON.stringify(customVoices));
  }

  return voicePreset;
}

// --- API HANDLER ---
export default async function handler(request: Request): Promise<Response> {
  try {
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
    const userId = await verifyAuthToken(token);
    
    if (!userId) {
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
    const saveRequest: SaveVoiceRequest = body;
    
    // Perform save
    const result = await saveVoice(userId, saveRequest);

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice save error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('required') || 
          error.message.includes('must be') || 
          error.message.includes('Invalid')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
            code: 'VALIDATION_ERROR'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          code: 'SAVE_FAILED'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generic error
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred during save',
        code: 'UNEXPECTED_ERROR'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
