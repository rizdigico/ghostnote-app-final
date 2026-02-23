import React, { useState, useEffect, useRef } from 'react';
import { Database, Link, FileText, Upload, Sparkles, Trash2, Loader2, AlertCircle, Check, X, ArrowRight, Plus } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { dbService } from '../../dbService';
import { auth } from '../../src/lib/firebase';
import { DnaPreviewModal } from '../../components/DnaPreviewModal';
import type { VoicePreset } from '../../types';

interface LibraryPageProps {
  onNavigate?: (path: string) => void;
}

type InputTab = 'url' | 'text' | 'file';

const LibraryPage: React.FC<LibraryPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<InputTab>('url');
  const [presets, setPresets] = useState<VoicePreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Input states
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [fileData, setFileData] = useState<{ name: string; data: string; mimeType: string } | null>(null);
  
  // Modal states
  const [showDnaModal, setShowDnaModal] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<{
    textContent: string;
    sourceTitle: string;
    sourceUrl: string;
    analysis?: any;
  } | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetIntensity, setPresetIntensity] = useState(50);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load presets on mount
  useEffect(() => {
    const loadPresets = async () => {
      if (!user) return;
      try {
        const voices = await dbService.getVoicePresets(user.id);
        setPresets(voices);
      } catch (err) {
        console.error('Failed to load presets:', err);
      } finally {
        setIsLoadingPresets(false);
      }
    };
    loadPresets();
  }, [user]);

  // Clear messages after delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleUrlScrape = async () => {
    if (!urlInput.trim()) {
      setError('Please enter a URL');
      return;
    }

    let targetUrl = urlInput.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get Firebase ID token for authentication
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Failed to get authentication token');
      }

      // Extract text from URL
      const extractResponse = await fetch('/api/voice/extract', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      const extractData = await extractResponse.json();

      if (!extractData.success) {
        throw new Error(extractData.error || 'Failed to extract text from URL');
      }

      // Analyze extracted text
      const analyzeResponse = await fetch('/api/voice/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ text: extractData.data.text }),
      });

      const analyzeData = await analyzeResponse.json();

      if (!analyzeData.success) {
        throw new Error(analyzeData.error || 'Failed to analyze voice');
      }

      // Show DNA preview modal
      setAnalyzedData({
        textContent: extractData.data.text,
        sourceTitle: targetUrl.split('/').slice(-1)[0] || 'Web Content',
        sourceUrl: targetUrl,
        analysis: analyzeData.data,
      });
      setPresetName(targetUrl.split('/').slice(-1)[0] || 'Web Content');
      setShowDnaModal(true);

    } catch (err: any) {
      setError(err.message || 'Failed to process URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextAnalyze = async () => {
    if (!textInput.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get Firebase ID token for authentication
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Failed to get authentication token');
      }

      // Extract text (direct input)
      const extractResponse = await fetch('/api/voice/extract', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ text: textInput }),
      });

      const extractData = await extractResponse.json();

      if (!extractData.success) {
        throw new Error(extractData.error || 'Failed to extract text');
      }

      // Analyze extracted text
      const analyzeResponse = await fetch('/api/voice/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ text: extractData.data.text }),
      });

      const analyzeData = await analyzeResponse.json();

      if (!analyzeData.success) {
        throw new Error(analyzeData.error || 'Failed to analyze voice');
      }

      // Show DNA preview modal
      setAnalyzedData({
        textContent: extractData.data.text,
        sourceTitle: 'Custom Voice',
        sourceUrl: '',
        analysis: analyzeData.data,
      });
      setPresetName('Custom Voice');
      setShowDnaModal(true);

    } catch (err: any) {
      setError(err.message || 'Failed to process text');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFileData({
        name: file.name,
        data: result.split(',')[1],
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileAnalyze = async () => {
    if (!fileData) {
      setError('Please select a file first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get Firebase ID token for authentication
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Failed to get authentication token');
      }

      // Create FormData for file upload
      const formData = new FormData();
      const blob = new Blob([Uint8Array.from(atob(fileData.data), c => c.charCodeAt(0))], { 
        type: fileData.mimeType 
      });
      formData.append('file', blob, fileData.name);

      // Extract text from file
      const extractResponse = await fetch('/api/voice/extract', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${idToken}`
        },
        body: formData,
      });

      const extractData = await extractResponse.json();

      if (!extractData.success) {
        throw new Error(extractData.error || 'Failed to extract text from file');
      }

      // Analyze extracted text
      const analyzeResponse = await fetch('/api/voice/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ text: extractData.data.text }),
      });

      const analyzeData = await analyzeResponse.json();

      if (!analyzeData.success) {
        throw new Error(analyzeData.error || 'Failed to analyze voice');
      }

      // Show DNA preview modal
      setAnalyzedData({
        textContent: extractData.data.text,
        sourceTitle: fileData.name.replace(/\.[^/.]+$/, ''),
        sourceUrl: '',
        analysis: analyzeData.data,
      });
      setPresetName(fileData.name.replace(/\.[^/.]+$/, ''));
      setShowDnaModal(true);

    } catch (err: any) {
      setError(err.message || 'Failed to process file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveVoice = async (name: string, intensity: number) => {
    if (!name.trim() || !analyzedData) return;
    if (!user) return;

    setIsLoading(true);

    try {
      const newPreset: Partial<VoicePreset> = {
        name: name,
        referenceText: analyzedData.textContent,
        ownerId: user.id,
        visibility: 'private',
        metadata: analyzedData.analysis ? {
          characteristics: analyzedData.analysis.characteristics,
          rules: analyzedData.analysis.rules,
          intensity: intensity,
          analyzedAt: analyzedData.analysis.analyzedAt,
        } : undefined,
      };

      await dbService.saveVoicePreset(user.id, name, analyzedData.textContent);

      // Refresh presets
      const updatedPresets = await dbService.getVoicePresets(user.id);
      setPresets(updatedPresets);

      // Show success and close modal
      setSuccess(`Voice "${name}" created! You can now use it in Studio.`);
      setShowDnaModal(false);
      setAnalyzedData(null);
      setPresetName('');
      setUrlInput('');
      setTextInput('');
      setFileData(null);

    } catch (err) {
      setError('Failed to save voice preset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePreset = async (preset: VoicePreset) => {
    if (!confirm(`Are you sure you want to delete "${preset.name}"?`)) return;
    if (!user) return;

    try {
      await dbService.deleteVoicePreset(user.id, preset.id);
      
      // Refresh presets
      if (user) {
        const updatedPresets = await dbService.getVoicePresets(user.id);
        setPresets(updatedPresets);
      }
      
      setSuccess(`Voice "${preset.name}" deleted`);
    } catch (err) {
      setError('Failed to delete preset');
    }
  };

  const handleGoToStudio = () => {
    if (onNavigate) {
      onNavigate('/studio');
    } else {
      window.history.pushState({}, '', '/studio');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-textMain">Voice Library</h1>
          </div>
          <p className="text-textMuted">Manage your Linguistic DNA. Create and organize your voice profiles.</p>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Section A: Create New Voice */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-textMain mb-4">Create New Voice</h2>
          
          {/* Tabs */}
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setActiveTab('url')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'url' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-textMuted hover:text-textMain'
              }`}
            >
              <Link className="w-4 h-4 inline mr-2" />
              From URL
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'text' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-textMuted hover:text-textMain'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              From Text
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'file' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-textMuted hover:text-textMain'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              From File
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === 'url' && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Link size={18} className="text-textMuted" />
                  </div>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlScrape()}
                    placeholder="Paste LinkedIn, Blog, or Newsletter URL..."
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-textMain placeholder-textMuted/50 focus:border-primary focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleUrlScrape}
                  disabled={isLoading || !urlInput.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary to-primary/80 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  Clone Voice
                </button>
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-4">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste text that demonstrates the voice you want to capture..."
                  className="w-full h-40 px-4 py-3 bg-background border border-border rounded-lg text-textMain placeholder-textMuted/50 focus:border-primary focus:outline-none resize-none"
                />
                <button
                  onClick={handleTextAnalyze}
                  disabled={isLoading || !textInput.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary to-primary/80 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  Analyze Voice
                </button>
              </div>
            )}

            {activeTab === 'file' && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf,.doc,.docx,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {fileData ? (
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <Check className="w-5 h-5" />
                      <span>{fileData.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-textMuted mx-auto mb-2" />
                      <p className="text-textMuted">Click to upload a file</p>
                      <p className="text-xs text-textMuted mt-1">TXT, MD, PDF, DOC, CSV</p>
                    </>
                  )}
                </div>
                <button
                  onClick={handleFileAnalyze}
                  disabled={isLoading || !fileData}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary to-primary/80 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  Analyze File
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Section B: Your Voice Collection */}
        <div>
          <h2 className="text-lg font-semibold text-textMain mb-4">Your Voice Collection</h2>
          
          {isLoadingPresets ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : presets.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <Database className="w-12 h-12 text-textMuted mx-auto mb-4" />
              <p className="text-textMuted mb-2">No voices yet</p>
              <p className="text-sm text-textMuted">Create your first voice using the options above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-textMain truncate flex-1">{preset.name}</h3>
                    <button
                      onClick={() => handleDeletePreset(preset)}
                      className="p-1 text-textMuted hover:text-red-400 transition-colors"
                      title="Delete voice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Tone Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {preset.metadata?.linguisticDna?.tone && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                        {preset.metadata.linguisticDna.tone}
                      </span>
                    )}
                    {preset.metadata?.source && (
                      <span className="px-2 py-0.5 bg-border text-textMuted text-xs rounded-full capitalize">
                        {preset.metadata.source}
                      </span>
                    )}
                  </div>
                  
                  {/* Preview */}
                  <p className="text-xs text-textMuted line-clamp-2 mb-3">
                    {preset.referenceText.slice(0, 100)}...
                  </p>
                  
                  {/* Action */}
                  <button
                    onClick={handleGoToStudio}
                    className="w-full flex items-center justify-center gap-1 text-sm text-primary hover:underline"
                  >
                    Use in Studio
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DNA Preview Modal */}
      {showDnaModal && analyzedData && (
        <DnaPreviewModal
          isOpen={showDnaModal}
          onClose={() => setShowDnaModal(false)}
          onSave={handleSaveVoice}
          sourceTitle={analyzedData.sourceTitle}
          sourceUrl={analyzedData.sourceUrl}
          textContent={analyzedData.textContent}
          analysis={analyzedData.analysis}
          isSaving={isLoading}
          canSave={true}
        />
      )}

      {/* Toast Notifications */}
      {success && (
        <div className="fixed bottom-6 right-6 px-4 py-3 bg-green-500/90 text-white rounded-lg shadow-lg flex items-center gap-2 z-50 animate-in slide-in-from-bottom">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
