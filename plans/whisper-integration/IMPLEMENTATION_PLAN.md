# OpenAI Whisper API Integration for Audio/Video Transcription

## Overview

This implementation plan outlines the integration of OpenAI's Whisper API for audio/video transcription while maintaining strict provider isolation with OpenRouter for text generation. The integration will support:

1. Audio transcription from voice recordings
2. Video transcription by extracting and transcribing audio tracks
3. File upload support for audio and video files
4. API endpoint with proper security and rate limiting
5. Frontend UI improvements for real-time transcription feedback

## Architecture

### Provider Isolation Principle

- **OpenAI Whisper**: Exclusive use for audio/video transcription
- **OpenRouter**: Exclusive use for text generation and linguistic DNA analysis
- **No cross-provider communication**: Each provider remains isolated to its specific domain

### System Architecture

```
┌───────────────────────────────────────────────────────────┐
│                     Frontend Components                   │
├───────────────────────────────────────────────────────────┤
│ - VoiceRecorder.tsx (audio recording & transcription)    │
│ - RepurposePage.tsx (video/file upload)                  │
│ - Dashboard.tsx (transcription history)                  │
└───────────────────────────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────┐
│                     API Layer                              │
├───────────────────────────────────────────────────────────┤
│ - /api/repurpose/transcribe (Whisper integration)         │
│ - /api/generate (OpenRouter integration)                  │
│ - /api/voice/scrape (URL scraping)                        │
└───────────────────────────────────────────────────────────┘
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│    OpenAI Whisper API   │  │   OpenRouter API (Llama) │
└─────────────────────────┘  └──────────────────────────┘
```

## Implementation Steps

### 1. API Endpoint Design

#### File: `api/repurpose/transcribe.ts`

**Key Features**:
- Edge runtime compatibility
- File upload handling (FormData)
- Rate limiting (5 transcriptions per minute per user)
- Input validation (file type, size limits)
- OpenAI Whisper API integration
- Error handling and fallback mechanisms

**Endpoint Configuration**:
```typescript
// api/repurpose/transcribe.ts
export const config = {
  runtime: 'edge',
  bodyParser: false, // Need to handle FormData manually
};
```

**Request Handling**:
- Support for audio files (MP3, WAV, WebM, M4A)
- Support for video files (MP4, MOV, WebM)
- File size limit: 25MB
- FormData field name: `file`

**Response Format**:
```typescript
interface TranscriptionResponse {
  success: boolean;
  textContent?: string;
  error?: string;
  metadata?: {
    fileName: string;
    fileSize: number;
    duration?: number;
    language?: string;
  };
}
```

### 2. Environment Configuration

#### File: `.env.example`

```bash
# OpenAI API Configuration
# Get your API key from: https://platform.openai.com/account/api-keys
# Used for Whisper API transcription functionality
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# OpenAI API Base URL (optional, for proxies)
OPENAI_API_BASE_URL=https://api.openai.com/v1
```

#### File: `.env.local`

- Copy from `.env.example` and populate with actual API key

### 3. Frontend Modifications

#### File: `components/VoiceRecorder.tsx`

**Changes**:
- Replace mock transcription with real API call
- Add loading state during transcription
- Error handling for transcription failures
- Display transcription progress
- Support for uploading existing audio files

**Key Method**:
```typescript
const transcribeAudio = async (blob: Blob, fileName: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', blob, fileName);
  
  const response = await fetch('/api/repurpose/transcribe', {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Transcription failed');
  }
  
  return data.textContent;
};
```

#### File: `pages/repurpose/index.tsx`

**Changes**:
- Update video processing to use `/api/repurpose/transcribe` instead of `/api/voice/scrape`
- Improve error handling for transcription
- Show progress indicator during processing
- Remove mock transcription fallback (keep for debugging only)

**Key Changes**:
```typescript
// Replace existing video processing
const handleVideoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setVideoFile(file);
  setProcessingType('video');

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/repurpose/transcribe', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success && data.textContent) {
      localStorage.setItem('pendingStudioContent', data.textContent);
      onNavigate('/studio');
    } else {
      throw new Error(data.error || 'Transcription failed');
    }
  } catch (error) {
    console.error('Video processing error:', error);
    // Show error to user
    setError('Failed to transcribe video. Please try again.');
  } finally {
    setProcessingType('idle');
    setVideoFile(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  }
};
```

### 4. Security and Rate Limiting

#### API Security Measures

**File: `api/repurpose/transcribe.ts`**

```typescript
// Rate limiting - 5 transcriptions per minute per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const TRANSCRIPTION_RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000;

function checkTranscriptionRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= TRANSCRIPTION_RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// File type validation
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/m4a'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/webm'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function isValidFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` };
  }
  
  const acceptedTypes = [...ACCEPTED_AUDIO_TYPES, ...ACCEPTED_VIDEO_TYPES];
  if (!acceptedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not supported' };
  }
  
  return { valid: true };
}
```

### 5. Error Handling and Fallbacks

#### API Error Responses

```typescript
// Rate limit error
if (!checkTranscriptionRateLimit(clientIp)) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'Rate limit exceeded. Please wait 60 seconds before trying again.' 
    }),
    { status: 429, headers: { 'Content-Type': 'application/json' } }
  );
}

// File validation error
const validationResult = isValidFile(file);
if (!validationResult.valid) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: validationResult.error 
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

// OpenAI API error
catch (openAiError: any) {
  console.error('OpenAI API error:', openAiError);
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: openAiError.message || 'Transcription service unavailable' 
    }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

// General error
catch (error: any) {
  console.error('Transcription error:', error);
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### 6. Testing Strategy

#### Unit Tests

**API Endpoint Tests**:
- Test with valid audio file
- Test with valid video file  
- Test with invalid file types
- Test with oversized files
- Test rate limiting
- Test authentication

**Frontend Tests**:
- VoiceRecorder transcription flow
- Video upload and transcription
- Error handling scenarios
- Loading states and UI feedback

#### Integration Tests

- End-to-end transcription flow
- File upload and processing
- Error handling integration
- Performance testing with large files

### 7. Monitoring and Analytics

**Logging Requirements**:
- API request/response logging
- Error logging with context
- Rate limit violations
- File type distribution statistics

**Performance Metrics**:
- Transcription time per file size
- Success/failure rates
- Average file size processed
- Rate limit hit rate

### 8. Deployment Checklist

- [ ] Verify OpenAI API key configuration
- [ ] Test endpoint in development
- [ ] Test frontend integration
- [ ] Set up monitoring and logging
- [ ] Deploy to staging environment
- [ ] Perform load testing
- [ ] Deploy to production

## Files to Modify

1. `api/repurpose/transcribe.ts` - New file
2. `components/VoiceRecorder.tsx` - Update for real API call
3. `pages/repurpose/index.tsx` - Update video processing
4. `.env.example` - Add OpenAI API configuration
5. `.env.local` - Add actual API key (local development)

## Dependencies

### OpenAI SDK (for API integration)
```bash
npm install openai
```

### Types for OpenAI API
```typescript
// Types for Whisper API requests/responses
interface WhisperTranscriptionRequest {
  file: File;
  model: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  language?: string;
  prompt?: string;
  temperature?: number;
}

interface WhisperTranscriptionResponse {
  text: string;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
}
```

## API Reference

### OpenAI Whisper API Documentation

- **Endpoint**: `https://api.openai.com/v1/audio/transcriptions`
- **Method**: POST
- **Content-Type**: `multipart/form-data`
- **Required Parameters**:
  - `file`: The audio/video file to transcribe
  - `model`: Whisper model to use (e.g., `whisper-1`)
- **Optional Parameters**:
  - `language`: Language of the audio (ISO-639-1 code)
  - `response_format`: Output format (json, text, srt, verbose_json, vtt)
  - `temperature`: Sampling temperature
  - `prompt`: Text prompt to guide transcription

## Compliance and Privacy

### Data Handling

- Audio/video files are temporarily stored in memory during processing
- Files are not persisted on disk or database
- Transcriptions are stored only if explicitly saved by the user
- All API calls are encrypted via HTTPS
- OpenAI API usage complies with OpenAI's usage policies

### CORS Configuration

```typescript
// in api/repurpose/transcribe.ts
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

## Future Enhancements

1. **Batch processing** for multiple files
2. **Transcription segments** with timestamps (SRT/VTT format)
3. **Language detection** for automatic language selection
4. **Audio normalization** for better transcription accuracy
5. **Custom language models** for domain-specific vocabulary
6. **Transcription history** and management

