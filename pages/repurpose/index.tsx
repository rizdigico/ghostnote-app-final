import React, { useState, useRef } from 'react';
import { Mic, Video, FileText, Sparkles, ArrowRight, Loader2, Upload, X, AlertCircle } from 'lucide-react';
import VoiceRecorder from '../../components/VoiceRecorder';
import { auth } from '../../src/lib/firebase';

interface RepurposePageProps {
  onNavigate: (path: string) => void;
}

type ProcessingType = 'idle' | 'video' | 'text';

const RepurposePage: React.FC<RepurposePageProps> = ({ onNavigate }) => {
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [processingType, setProcessingType] = useState<ProcessingType>('idle');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleVoiceTranscriptionComplete = (text: string) => {
    localStorage.setItem('pendingStudioContent', text);
    onNavigate('/studio');
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    
    setProcessingType('text');
    
    // Simulate processing
    setTimeout(() => {
      localStorage.setItem('pendingStudioContent', textInput);
      setProcessingType('idle');
      onNavigate('/studio');
    }, 1000);
  };

  const handleVideoClick = () => {
    videoInputRef.current?.click();
  };

  const handleVideoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    setProcessingType('video');
    setError(null);

    try {
      // Create form data and send to transcription API
      const formData = new FormData();
      formData.append('file', file);

      // Get Firebase ID token for authentication
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Call the Whisper transcription API
      const response = await fetch('/api/repurpose/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.text) {
        // Success — store real transcription and navigate to Studio
        localStorage.setItem('pendingStudioContent', data.text);
        onNavigate('/studio');
      } else {
        throw new Error(data.error || 'Transcription failed. Please try again.');
      }
    } catch (err) {
      console.error('Video processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to transcribe video. Please try again.');
    } finally {
      setProcessingType('idle');
      setVideoFile(null);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  const InputCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    action: () => void;
    accentColor: string;
    isLoading?: boolean;
    disabled?: boolean;
  }> = ({ icon, title, description, action, accentColor, isLoading, disabled }) => (
    <button
      onClick={action}
      disabled={isLoading || disabled}
      className="flex flex-col items-center justify-center p-8 bg-surface border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className={`w-16 h-16 rounded-full ${accentColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${isLoading ? 'animate-pulse' : ''}`}>
        {isLoading ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : (
          icon
        )}
      </div>
      <h3 className="text-lg font-semibold text-textMain mb-2">{title}</h3>
      <p className="text-sm text-textMuted text-center max-w-xs">{description}</p>
    </button>
  );

  // Hidden file input for video
  const videoInput = (
    <input
      ref={videoInputRef}
      type="file"
      accept="video/*"
      onChange={handleVideoFileChange}
      className="hidden"
    />
  );

  if (showVoiceRecorder) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <VoiceRecorder
          onTranscriptionComplete={handleVoiceTranscriptionComplete}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">New Feature</span>
          </div>
          <h1 className="text-3xl font-bold text-textMain mb-2">Repurpose Content</h1>
          <p className="text-textMuted max-w-xl">
            Transform your voice memos, videos, and existing content into polished writing 
            using your unique voice profile.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-sm font-semibold text-textMuted uppercase tracking-wider mb-6">
            Choose your input
          </h2>

          {/* Input Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {videoInput}
            <InputCard
              icon={<Mic className="w-8 h-8 text-red-500" />}
              title="Voice Memo"
              description="Record a voice note directly in your browser. We'll transcribe and analyze your speaking style."
              action={() => setShowVoiceRecorder(true)}
              accentColor="bg-red-500/20"
            />
            <InputCard
              icon={<Video className="w-8 h-8 text-blue-500" />}
              title="Video Import"
              description={videoFile ? `Processing: ${videoFile.name}` : "Upload a video file. We'll extract the audio and transcribe it."}
              action={handleVideoClick}
              accentColor="bg-blue-500/20"
              isLoading={processingType === 'video'}
            />
            <InputCard
              icon={<FileText className="w-8 h-8 text-green-500" />}
              title="Text Paste"
              description="Paste existing text content directly. Quick and easy way to refine your writing."
              action={() => document.getElementById('text-input')?.focus()}
              accentColor="bg-green-500/20"
              disabled={processingType === 'text'}
            />
          </div>

          {/* Text Input Section */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-textMain mb-4">Or paste your text here</h3>
            <textarea
              id="text-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste any text content you want to refine or rewrite..."
              disabled={processingType !== 'idle'}
              className="w-full h-40 px-4 py-3 bg-background border border-border rounded-lg text-textMain placeholder-textMuted/50 focus:border-primary focus:outline-none resize-none disabled:opacity-50"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || processingType !== 'idle'}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processingType === 'text' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Send to Studio
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-textMuted">
              <strong className="text-primary">How it works:</strong> Your content is analyzed and sent to Studio 
              where you can refine, rewrite, or transform it using your voice profile. The system preserves 
              your unique speaking style, vocabulary, and tone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepurposePage;
