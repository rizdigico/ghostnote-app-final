import React, { useState } from 'react';
import { Link, Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface UrlImportCardProps {
  onScrapeSuccess: (data: {
    textContent: string;
    sourceTitle: string;
    sourceUrl: string;
  }) => void;
  isLoading?: boolean;
}

export const UrlImportCard: React.FC<UrlImportCardProps> = ({ 
  onScrapeSuccess,
  isLoading = false 
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);

  const handleScrape = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      new URL(targetUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setError(null);
    setIsScraping(true);

    try {
      const response = await fetch('/api/voice/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to scrape URL');
        return;
      }

      // Success - pass data to parent
      onScrapeSuccess({
        textContent: data.textContent,
        sourceTitle: data.sourceTitle,
        sourceUrl: data.sourceUrl,
      });
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isScraping) {
      handleScrape();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-textMuted uppercase tracking-widest pl-1">
          Import from URL
        </label>
        <p className="text-xs text-textMuted pl-1">
          Paste a LinkedIn post, blog article, or newsletter to instantly clone the voice.
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Link size={18} className="text-textMuted" />
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="https://linkedin.com/posts/... or https://blog.example.com/..."
          disabled={isScraping}
          className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-md text-textMain placeholder-textMuted/50 focus:border-accent focus:outline-none disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm px-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleScrape}
        disabled={isScraping || !url.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-accent to-yellow-400 text-black font-bold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isScraping ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Scanning Syntax...</span>
          </>
        ) : (
          <>
            <Sparkles size={18} />
            <span>Clone Voice</span>
          </>
        )}
      </button>

      <p className="text-[10px] text-textMuted text-center">
        Works with LinkedIn, Medium, Substack, newsletters, and most blogs
      </p>
    </div>
  );
};

export default UrlImportCard;
