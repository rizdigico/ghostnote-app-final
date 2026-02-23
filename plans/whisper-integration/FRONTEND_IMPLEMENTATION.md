# Frontend Implementation Plan for Whisper API Integration

## VoiceRecorder Component Updates

### File: `components/VoiceRecorder.tsx`

#### Key Changes

1. **Replace Mock Transcription with Real API Call**
2. **Add Loading State and Progress Feedback**
3. **Improve Error Handling**
4. **Enhance File Upload Support**

#### Modified Methods

```typescript
// New transcription method
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

// Updated stopRecording method
const stopRecording = () => {
  if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
    mediaRecorderRef.current.stop();
  }
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
  setState('processing');
  
  // Call real transcription API
  transcribeAudio(audioChunksRef.current, `recording-${Date.now()}.webm`)
    .then(transcription => {
      setTranscribedText(transcription);
      setState('complete');
    })
    .catch(error => {
      console.error('Transcription error:', error);
      setError(error.message || 'Failed to transcribe audio');
      setState('idle');
    });
};

// Updated handleFileUpload method
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setState('processing');
  
  try {
    const transcription = await transcribeAudio(file, file.name);
    setTranscribedText(transcription);
    setState('complete');
  } catch (error) {
    console.error('File upload error:', error);
    setError(error.message || 'Failed to transcribe file');
    setState('idle');
  }
};
```

#### UI Improvements

```typescript
// Add error display
{error && (
  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
    <div className="flex items-center">
      <X className="w-4 h-4 mr-2" />
      <span>{error}</span>
    </div>
  </div>
)}

// Update processing state UI
{state === 'processing' && (
  <div className="flex flex-col items-center justify-center py-8">
    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
    <p className="text-sm text-muted-foreground">Transcribing your audio...</p>
  </div>
)}
```

## RepurposePage Component Updates

### File: `pages/repurpose/index.tsx`

#### Key Changes

1. **Update Video Processing to Use New Transcription Endpoint**
2. **Improve Error Handling and User Feedback**
3. **Remove Mock Transcription Fallback**

#### Modified Methods

```typescript
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

#### UI Improvements

```typescript
// Add error state and display
const [error, setError] = useState<string | null>(null);

// Display error message
{error && (
  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
    <div className="flex items-center">
      <X className="w-4 h-4 mr-2" />
      <span>{error}</span>
    </div>
  </div>
)}

// Clear error when choosing new input type
const handleTextSubmit = () => {
  setError(null);
  // Existing logic
};

const handleVideoClick = () => {
  setError(null);
  videoInputRef.current?.click();
};
```

## Error Handling Strategy

### Common Error Scenarios

1. **API Key Not Configured**: "Transcription service unavailable"
2. **Rate Limit Exceeded**: "Rate limit exceeded. Please wait 60 seconds before trying again."
3. **File Size Too Large**: "File size exceeds 25MB limit"
4. **Unsupported File Type**: "File type not supported"
5. **Network Errors**: "Failed to connect to transcription service"
6. **Invalid Response**: "Transcription failed. Please try again."

### Error Boundary Implementation

```typescript
// Add to both components
const handleError = (error: Error) => {
  console.error('Component error:', error);
  setError('An unexpected error occurred. Please refresh and try again.');
  setState('idle');
  setProcessingType('idle');
};
```

## Testing Strategy

### VoiceRecorder Component Tests

1. **Recording Flow**: Test start/stop recording
2. **Transcription**: Test successful API call
3. **File Upload**: Test uploading existing audio files
4. **Error Handling**: Test various error scenarios
5. **UI States**: Test all recorder states (idle, recording, processing, complete)

### RepurposePage Component Tests

1. **Video Upload**: Test video file selection and processing
2. **API Integration**: Test successful transcription flow
3. **Error Handling**: Test error states and recovery
4. **Progress Indication**: Test loading and progress states

### Integration Tests

1. **End-to-End Flow**: Record voice → transcribe → navigate to studio
2. **File Upload Flow**: Upload audio file → transcribe → navigate to studio
3. **Video Processing**: Upload video file → transcribe → navigate to studio
4. **Error Recovery**: Test network errors and rate limiting

## Performance Optimization

### File Size Handling

```typescript
// Add file size validation in VoiceRecorder
const MAX_RECORDING_DURATION = 300; // 5 minutes

const startRecording = async () => {
  // Existing logic
  timerRef.current = setInterval(() => {
    setRecordingTime(prev => {
      if (prev >= MAX_RECORDING_DURATION) {
        stopRecording();
        return MAX_RECORDING_DURATION;
      }
      return prev + 1;
    });
  }, 1000);
};
```

### Progress Estimation

```typescript
// Add progress estimation for large files
const estimateTranscriptionTime = (fileSize: number): number => {
  const baseTime = 2; // seconds
  const timePerMB = 0.5; // seconds per MB
  return Math.min(baseTime + (fileSize / (1024 * 1024)) * timePerMB, 60); // Cap at 60 seconds
};
```

## Accessibility Improvements

### Focus Management

```typescript
// Add focus management for better accessibility
const stopRecording = () => {
  // Existing logic
  const processingElement = document.querySelector('[data-state="processing"]');
  if (processingElement) {
    processingElement.focus();
  }
};
```

### ARIA Labels and Roles

```typescript
// Improve ARIA labels
<div 
  role="status" 
  aria-live="polite"
  className="flex flex-col items-center justify-center py-8"
>
  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
  <p className="text-sm text-muted-foreground">Transcribing your audio...</p>
</div>
```

## Browser Compatibility

### MediaRecorder Support

```typescript
// Add browser compatibility check
const startRecording = async () => {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    setError('Your browser does not support audio recording');
    return;
  }
  
  // Existing logic
};
```

### File Type Support

```typescript
// Add file type validation with user-friendly messages
const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

const isValidFileExtension = (extension: string): boolean => {
  return ['mp3', 'wav', 'webm', 'm4a', 'mp4', 'mov'].includes(extension);
};
```

## Future Enhancements

### Audio Preview

```typescript
// Add audio preview functionality
const [audioPreview, setAudioPreview] = useState<string | null>(null);

const stopRecording = () => {
  // Existing logic
  const audioUrl = URL.createObjectURL(blob);
  setAudioPreview(audioUrl);
};

// Cleanup
useEffect(() => {
  return () => {
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview);
    }
  };
}, [audioPreview]);
```

### Transcription Progress

```typescript
// Add real-time transcription progress using SSE or polling
const [transcriptionProgress, setTranscriptionProgress] = useState(0);

const transcribeAudio = async (blob: Blob, fileName: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', blob, fileName);
  
  const response = await fetch('/api/repurpose/transcribe', {
    method: 'POST',
    body: formData,
    // Add progress tracking
  });
  
  // Existing logic
};
```

### Batch Processing

```typescript
// Support for multiple file uploads
const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
const [transcriptions, setTranscriptions] = useState<Array<{file: File; text: string}>>([]);

const handleMultipleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(event.target.files || []);
  setSelectedFiles(files);
  
  const results = await Promise.allSettled(
    files.map(file => transcribeAudio(file, file.name))
  );
  
  setTranscriptions(
    results.map((result, index) => ({
      file: files[index],
      text: result.status === 'fulfilled' ? result.value : 'Transcription failed',
    }))
  );
};
```
