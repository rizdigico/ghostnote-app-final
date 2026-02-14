import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Sparkles, AlertTriangle, Check, X, Loader2, 
  RefreshCw, Zap, Wand2 
} from 'lucide-react';
import { scanForSlop, getScoreColor, getScoreLabel, ScanResult } from '../lib/slopScanner';

interface SlopEditorProps {
  value: string;
  onChange: (value: string) => void;
  referenceText?: string; // For voice profile context
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  issue: ScanResult['issues'][0] | null;
}

export const SlopEditor: React.FC<SlopEditorProps> = ({ 
  value, 
  onChange,
  referenceText 
}) => {
  const [scanResult, setScanResult] = useState<ScanResult>({
    score: 100,
    issues: [],
    totalSlopWords: 0,
    categoryCounts: { hype: 0, fluff: 0, corporate: 0, ai: 0 }
  });
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false, x: 0, y: 0, issue: null
  });
  const [isFixing, setIsFixing] = useState(false);
  const [showFixed, setShowFixed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounced scan
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value && value.trim().length > 0) {
        const result = scanForSlop(value);
        setScanResult(result);
      } else {
        setScanResult({
          score: 100,
          issues: [],
          totalSlopWords: 0,
          categoryCounts: { hype: 0, fluff: 0, corporate: 0, ai: 0 }
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  // Handle humanizing a single issue
  const handleHumanize = useCallback(async (issue: ScanResult['issues'][0]) => {
    if (!issue) return;
    
    // Find the sentence containing this word
    const before = value.substring(0, issue.index);
    const after = value.substring(issue.index + issue.length);
    
    // Try to find sentence boundaries
    const sentenceMatch = value.match(/[^.!?]*[.!?]/);
    const sentence = sentenceMatch ? sentenceMatch[0] : value;
    
    setIsFixing(true);
    
    try {
      const response = await fetch('/api/content/fix-slop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sentence,
          referenceText: referenceText || ''
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.rewrittenText) {
        // Replace the sentence in the full text
        const newText = value.replace(sentence, data.rewrittenText + ' ');
        onChange(newText);
        setShowFixed(true);
        setTimeout(() => setShowFixed(false), 2000);
      }
    } catch (error) {
      console.error('Failed to fix slop:', error);
    } finally {
      setIsFixing(false);
    }
  }, [value, onChange, referenceText]);

  // Handle fix all
  const handleFixAll = useCallback(async () => {
    if (scanResult.totalSlopWords === 0) return;
    
    setIsFixing(true);
    
    try {
      const response = await fetch('/api/content/fix-slop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sentence: value,
          referenceText: referenceText || ''
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.rewrittenText) {
        onChange(data.rewrittenText);
        setShowFixed(true);
        setTimeout(() => setShowFixed(false), 2000);
      }
    } catch (error) {
      console.error('Failed to fix all slop:', error);
    } finally {
      setIsFixing(false);
    }
  }, [value, onChange, referenceText, scanResult.totalSlopWords]);

  // Get highlighted text with spans
  const highlightedText = useMemo(() => {
    if (!value || scanResult.issues.length === 0) {
      return <span>{value}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    const sortedIssues = [...scanResult.issues].sort((a, b) => a.index - b.index);
    
    for (const issue of sortedIssues) {
      // Add text before this issue
      if (issue.index > lastIndex) {
        parts.push(value.substring(lastIndex, issue.index));
      }
      
      // Add highlighted issue
      const color = issue.severity === 'critical' ? '#EF4444' : '#FBBF24';
      parts.push(
        <span
          key={`${issue.index}-${issue.word}`}
          className="relative cursor-help border-b-2 hover:bg-white/20 transition-colors"
          style={{ borderColor: color, color: color }}
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip({ 
              show: true, 
              x: rect.left + rect.width / 2, 
              y: rect.top - 10,
              issue 
            });
          }}
          onMouseLeave={() => setTooltip({ show: false, x: 0, y: 0, issue: null })}
        >
          {issue.word}
        </span>
      );
      
      lastIndex = issue.index + issue.length;
    }
    
    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(value.substring(lastIndex));
    }
    
    return <>{parts}</>;
  }, [value, scanResult.issues]);

  const scoreColor = getScoreColor(scanResult.score);

  return (
    <div className="relative">
      {/* Header with Score */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-accent" />
            <span className="text-xs font-semibold text-textMuted uppercase tracking-widest">
              Slop Detector
            </span>
          </div>
          
          {value.trim().length > 0 && (
            <div 
              className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: `${scoreColor}20`, color: scoreColor }}
            >
              <span>{scanResult.score}</span>
              <span className="text-textMuted">/ 100</span>
            </div>
          )}
        </div>
        
        {scanResult.totalSlopWords > 0 && (
          <button
            onClick={handleFixAll}
            disabled={isFixing}
            className="flex items-center gap-1 px-3 py-1 bg-accent/20 text-accent text-xs font-bold rounded hover:bg-accent/30 transition-colors disabled:opacity-50"
          >
            {isFixing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Wand2 size={14} />
            )}
            Fix All
          </button>
        )}
      </div>
      
      {/* Score Label */}
      {value.trim().length > 0 && (
        <p 
          className="text-xs mb-3"
          style={{ color: scoreColor }}
        >
          {getScoreLabel(scanResult.score)}
          {scanResult.totalSlopWords > 0 && ` • ${scanResult.totalSlopWords} issues found`}
        </p>
      )}
      
      {/* Text Display */}
      <div 
        className="w-full min-h-[120px] p-4 bg-surface border border-border rounded-md font-mono text-sm text-textMain whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-[300px]"
      >
        {highlightedText}
      </div>
      
      {/* Fixed Notification */}
      {showFixed && (
        <div className="fixed top-4 right-4 flex items-center gap-2 px-4 py-2 bg-green-900/80 border border-green-700 text-green-100 rounded-lg shadow-lg animate-fade-in-up">
          <Check size={16} />
          <span className="text-sm">Text humanized!</span>
        </div>
      )}
      
      {/* Tooltip */}
      {tooltip.show && tooltip.issue && (
        <div 
          className="fixed z-[200] px-3 py-2 bg-black border border-border rounded-md shadow-xl"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className={tooltip.issue.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'} />
            <span className="text-xs font-bold text-white">
              {tooltip.issue.category === 'ai' && 'AI Pattern'}
              {tooltip.issue.category === 'corporate' && 'Corporate Speak'}
              {tooltip.issue.category === 'fluff' && 'Empty Fluff'}
              {tooltip.issue.category === 'hype' && 'Startup Hype'}
            </span>
          </div>
          <button
            onClick={() => tooltip.issue && handleHumanize(tooltip.issue)}
            disabled={isFixing}
            className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-accent text-black text-xs font-bold rounded hover:bg-white transition-colors disabled:opacity-50"
          >
            {isFixing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            Humanize
          </button>
        </div>
      )}
    </div>
  );
};

export default SlopEditor;
