import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Upload, Loader2, Sparkles, Play, Pause, Check } from 'lucide-react';
import Button from './Button';
import { auth } from '../src/lib/firebase';

type RecorderState = 'idle' | 'recording' | 'processing' | 'complete';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onCancel: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscriptionComplete,
  onCancel,
}) => {
  const [state, setState] = useState<RecorderState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setState('recording');
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const transcribeAudio = async (audioFile: Blob, fileName?: string) => {
    try {
      const formData = new FormData();
      formData.append('file', audioFile, fileName || 'recording.webm');

      // Get Firebase ID token for authentication
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch('/api/repurpose/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transcribe audio');
      }

      return data.text;
    } catch (err) {
      console.error('Transcription error:', err);
      setError(err instanceof Error ? err.message : 'Failed to transcribe audio');
      setState('idle');
      return null;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState('processing');
  };

  // Handle recording stop and start transcription
  useEffect(() => {
    const processRecording = async () => {
      if (state === 'processing' && audioBlob) {
        const transcription = await transcribeAudio(audioBlob, 'recording.webm');
        if (transcription) {
          setTranscribedText(transcription);
          setState('complete');
        }
      }
    };

    processRecording();
  }, [state, audioBlob]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState('processing');
    const transcription = await transcribeAudio(file, file.name);
    if (transcription) {
      setTranscribedText(transcription);
      setState('complete');
    }
  };

  const handleSendToStudio = () => {
    onTranscriptionComplete(transcribedText);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <div className="text-center space-y-6">
            {/* Record Button */}
            <button
              onClick={startRecording}
              className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all transform hover:scale-105 shadow-lg shadow-red-500/30"
            >
              <Mic className="w-10 h-10" />
            </button>
            <p className="text-textMuted">Tap to start recording</p>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-textMuted text-sm">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Upload */}
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-textMain hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                <Upload className="w-5 h-5" />
                <span>Upload audio file</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        );

      case 'recording':
        return (
          <div className="text-center space-y-6">
            {/* Recording Animation */}
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
              <div className="absolute inset-4 rounded-full bg-red-500/40 animate-pulse" />
              <div className="absolute inset-8 rounded-full bg-red-500 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-red-600" />
              </div>
            </div>

            {/* Timer */}
            <div className="text-3xl font-mono text-textMain">
              {formatTime(recordingTime)}
            </div>

            {/* Stop Button */}
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all"
            >
              <Square className="w-6 h-6" />
            </button>
            <p className="text-textMuted">Tap to stop</p>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center space-y-6">
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-textMain">Transcribing & Analyzing DNA...</h3>
              <p className="text-textMuted mt-2">This may take a few moments</p>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            {/* Success */}
            <div className="flex items-center justify-center gap-2 text-green-500">
              <Check className="w-6 h-6" />
              <span className="font-medium">Transcription Complete</span>
            </div>

            {/* Preview */}
            <div className="bg-background border border-border rounded-lg p-4 max-h-48 overflow-y-auto">
              <p className="text-textMain whitespace-pre-wrap">{transcribedText}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setState('idle');
                  setTranscribedText('');
                  setAudioBlob(null);
                  setRecordingTime(0);
                }}
                className="flex-1"
              >
                Record Another
              </Button>
              <Button
                variant="primary"
                onClick={handleSendToStudio}
                className="flex-1"
              >
                Send to Studio
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-textMain">Voice Memo</h3>
        <button
          onClick={onCancel}
          className="p-2 text-textMuted hover:text-textMain hover:bg-border/50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default VoiceRecorder;
