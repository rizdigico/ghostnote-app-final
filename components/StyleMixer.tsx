import React, { useState } from 'react';
import { VoicePreset, VoiceInjection } from '../types';
import { getIntensityLabel } from '../constants';
import { Music, Plus, X, Sliders, Zap, Volume2 } from 'lucide-react';
import Select from './Select';

interface StyleMixerProps {
  presets: VoicePreset[];
  primaryVoiceId: string;
  injections: VoiceInjection[];
  intensity: number;
  onPrimaryVoiceChange: (voiceId: string) => void;
  onInjectionsChange: (injections: VoiceInjection[]) => void;
  onIntensityChange: (intensity: number) => void;
}

const StyleMixer: React.FC<StyleMixerProps> = ({
  presets,
  primaryVoiceId,
  injections,
  intensity,
  onPrimaryVoiceChange,
  onInjectionsChange,
  onIntensityChange,
}) => {
  // Filter system presets (for injections) vs user presets (for base)
  const systemPresets = presets.filter(p => p.is_system_preset);
  const userPresets = presets.filter(p => !p.is_system_preset || p.isCustom);

  // Get current primary voice
  const primaryVoice = presets.find(p => p.id === primaryVoiceId);

  // Get voices for injection dropdown (exclude primary voice)
  const availableForInjection = presets.filter(p => p.id !== primaryVoiceId);

  const handleAddInjection = () => {
    if (injections.length >= 2) return;
    // Add default injection with first system preset
    const firstSystem = systemPresets[0];
    if (firstSystem) {
      onInjectionsChange([...injections, { voiceId: firstSystem.id, intensity: 0.5 }]);
    }
  };

  const handleRemoveInjection = (index: number) => {
    const newInjections = [...injections];
    newInjections.splice(index, 1);
    onInjectionsChange(newInjections);
  };

  const handleInjectionVoiceChange = (index: number, voiceId: string) => {
    const newInjections = [...injections];
    newInjections[index] = { ...newInjections[index], voiceId };
    onInjectionsChange(newInjections);
  };

  const handleInjectionIntensityChange = (index: number, newIntensity: number) => {
    const newInjections = [...injections];
    newInjections[index] = { ...newInjections[index], intensity: newIntensity };
    onInjectionsChange(newInjections);
  };

  return (
    <div className="style-mixer-container">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-semibold text-gray-800">Style Mixer</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          DJ Deck
        </span>
      </div>

      {/* Track 1: The Base (Primary Voice) */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">THE BASE (Primary Voice)</span>
        </div>
        
        <p className="text-xs text-gray-500 mb-2">Facts & Structure</p>
        
        <Select
          label="Base Voice"
          value={primaryVoiceId}
          onChange={(e) => onPrimaryVoiceChange(e.target.value)}
          options={userPresets.map(p => ({
            value: p.id,
            label: p.name
          }))}
          className="w-full"
        />

        {/* Preview of base voice */}
        {primaryVoice && (
          <div className="mt-3 p-2 bg-white/50 rounded text-xs text-gray-600 italic">
            "{primaryVoice.referenceText.slice(0, 100)}..."
          </div>
        )}
      </div>

      {/* Add Injection Button */}
      {injections.length < 2 && (
        <button
          onClick={handleAddInjection}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 mb-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-dashed border-gray-300"
        >
          <Plus className="w-4 h-4" />
          Add Style Injection
        </button>
      )}

      {/* Track 2+: Injections (Modifier Voices) */}
      {injections.map((injection, index) => {
        const injectionVoice = presets.find(v => v.id === injection.voiceId);
        const intensityPercent = Math.round(injection.intensity * 100);
        
        return (
          <div 
            key={index}
            className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 mb-3"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  INJECTION {index + 1}
                </span>
              </div>
              <button
                onClick={() => handleRemoveInjection(index)}
                className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Voice Selector */}
            <Select
              label="Style Voice"
              value={injection.voiceId}
              onChange={(e) => handleInjectionVoiceChange(index, e.target.value)}
              options={availableForInjection.map(p => ({
                value: p.id,
                label: p.is_system_preset ? `⭐ ${p.name}` : p.name
              }))}
              className="w-full mb-3"
            />

            {/* Intensity Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 flex items-center gap-1">
                  <Sliders className="w-3 h-3" />
                  Intensity
                </span>
                <span className="font-medium text-amber-700">
                  {intensityPercent}% — {getIntensityLabel(injection.intensity)}
                </span>
              </div>
              
              <input
                type="range"
                min="10"
                max="100"
                value={intensityPercent}
                onChange={(e) => handleInjectionIntensityChange(index, Number(e.target.value) / 100)}
                className="w-full h-2 bg-gradient-to-r from-amber-300 to-orange-400 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              
              {/* Visual indicator */}
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Subtle</span>
                <span>Balanced</span>
                <span>Dominant</span>
              </div>
            </div>

            {/* Preview of injection voice */}
            {injectionVoice && (
              <div className="mt-3 p-2 bg-white/50 rounded text-xs text-gray-600 italic">
                "{injectionVoice.referenceText.slice(0, 80)}..."
              </div>
            )}
          </div>
        );
      })}

      {/* Overall Intensity */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Overall Output Intensity</span>
          <span className="text-purple-600 font-medium">{intensity}%</span>
        </div>
        
        <input
          type="range"
          min="10"
          max="100"
          value={intensity}
          onChange={(e) => onIntensityChange(Number(e.target.value))}
          className="w-full h-2 bg-gradient-to-r from-purple-300 to-purple-500 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>Light touch</span>
          <span>Medium</span>
          <span>Full power</span>
        </div>
      </div>

      {/* Summary */}
      {injections.length > 0 && (
        <div className="mt-4 p-3 bg-purple-100 rounded-lg">
          <p className="text-xs text-purple-800">
            <strong>Mix Summary:</strong> {primaryVoice?.name || 'Base'} + {injections.length} style{injections.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default StyleMixer;
