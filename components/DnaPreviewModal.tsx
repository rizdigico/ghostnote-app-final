import React, { useState } from 'react';
import { X, Save, Link, FileText, Sparkles, AlertCircle } from 'lucide-react';

interface DnaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, intensity: number) => void;
  sourceTitle: string;
  sourceUrl: string;
  textContent: string;
  isSaving?: boolean;
  canSave?: boolean;
}

export const DnaPreviewModal: React.FC<DnaPreviewModalProps> = ({
  isOpen,
  onClose,
  onSave,
  sourceTitle,
  sourceUrl,
  textContent,
  isSaving = false,
  canSave = true,
}) => {
  const [presetName, setPresetName] = useState(sourceTitle || '');
  const [intensity, setIntensity] = useState(50);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!presetName.trim()) return;
    onSave(presetName.trim(), intensity);
  };

  // Get a preview of the content (first 500 chars)
  const contentPreview = textContent.length > 500 
    ? textContent.substring(0, 500) + '...'
    : textContent;

  // Count words
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
      <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-accent to-yellow-400 rounded-lg flex items-center justify-center">
              <Sparkles size={20} className="text-black" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-textMain">Voice DNA Detected</h3>
              <p className="text-xs text-textMuted">Review before saving</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-textMuted hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Source Info */}
        <div className="flex items-center gap-2 p-3 bg-surface/50 border border-border rounded-md mb-4">
          <Link size={14} className="text-accent flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-textMain truncate">{sourceTitle}</p>
            <p className="text-[10px] text-textMuted truncate">{sourceUrl}</p>
          </div>
        </div>

        {/* Content Preview */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-textMuted uppercase tracking-widest pl-1 mb-2 block">
            Content Preview
          </label>
          <div className="p-3 bg-background border border-border rounded-md max-h-32 overflow-y-auto">
            <p className="text-xs text-textMuted whitespace-pre-wrap leading-relaxed">
              {contentPreview}
            </p>
          </div>
          <p className="text-[10px] text-textMuted mt-1 pl-1">
            {wordCount.toLocaleString()} words • {textContent.length.toLocaleString()} characters
          </p>
        </div>

        {/* Preset Name Input */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-textMuted uppercase tracking-widest pl-1 mb-2 block">
            Preset Name
          </label>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="e.g., Tech CEO Voice"
            maxLength={50}
            className="w-full bg-background border border-border rounded-md p-3 text-textMain placeholder-textMuted/50 focus:border-accent focus:outline-none"
          />
        </div>

        {/* Mimicry Intensity Slider */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-textMuted uppercase tracking-widest pl-1">
              Mimicry Intensity
            </label>
            <span className="text-xs font-mono text-accent">{intensity}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={intensity}
            onChange={(e) => setIntensity(parseInt(e.target.value))}
            className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-sm"
          />
          <div className="flex justify-between text-[10px] text-textMuted mt-1 px-1">
            <span>Creative</span>
            <span>Strict</span>
          </div>
        </div>

        {/* Limit Warning */}
        {!canSave && (
          <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-500/30 rounded-md mb-4">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">
              You've reached your preset limit. Upgrade your plan to save more voice profiles.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-3 border border-border text-textMuted rounded-md font-bold hover:text-white hover:border-textMuted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!presetName.trim() || isSaving || !canSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent text-black rounded-md font-bold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save to Library</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DnaPreviewModal;
