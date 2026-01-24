import React, { useState } from 'react';
import { X, Copy, Check, ChevronRight, Terminal } from 'lucide-react';

interface ApiDocsViewerProps {
  onClose: () => void;
}

const ApiDocsViewer: React.FC<ApiDocsViewerProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const curlCommand = `curl -X POST https://api.ghostnote.ai/v1/rewrite \\
  -H "Authorization: Bearer gn_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "reference_text": "Style source text...",
    "draft_text": "Content to rewrite..."
  }'`;

  return (
    <div className="fixed inset-0 z-[70] flex bg-black/90 backdrop-blur-md animate-fade-in-up">
      {/* Sidebar - Desktop */}
      <div className="w-64 border-r border-border bg-background hidden md:flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="font-bold text-textMain tracking-widest uppercase text-xs">API Reference</h2>
          <p className="text-[10px] text-textMuted mt-1">v1.0.0</p>
        </div>
        <div className="flex-1 py-4">
          <div className="px-4 py-2 text-xs font-bold text-accent uppercase tracking-wider mb-2">Endpoints</div>
          <button className="w-full text-left px-6 py-2 text-sm text-textMain bg-surface/50 border-r-2 border-accent font-medium flex items-center justify-between">
            POST /rewrite <ChevronRight size={14} className="text-accent"/>
          </button>
        </div>
        <div className="p-6 border-t border-border">
            <button onClick={onClose} className="text-xs text-textMuted hover:text-white flex items-center gap-2">
                <X size={14} /> Close Documentation
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[#0F0F11] relative">
         <button onClick={onClose} className="absolute top-6 right-6 p-2 text-textMuted hover:text-white md:hidden">
            <X size={20} />
         </button>

         <div className="max-w-4xl mx-auto p-8 md:p-16">
            <div className="mb-12">
                <h1 className="text-4xl font-bold text-textMain mb-4">GhostNote API v1</h1>
                <p className="text-textMuted text-lg leading-relaxed">
                    Programmatically access the GhostNote rewriting engine. Integrate style transfer capabilities directly into your CMS or internal tools.
                </p>
            </div>

            <div className="space-y-16">
                
                {/* Authentication Section */}
                <section>
                    <h2 className="text-2xl font-bold text-textMain mb-6 flex items-center gap-3">
                        Authentication
                        <span className="px-2 py-1 rounded border border-border bg-surface text-[10px] font-mono text-textMuted uppercase font-normal">Bearer Token</span>
                    </h2>
                    <p className="text-textMuted mb-6">
                        Authenticate your requests by including your API key in the <code className="bg-surface border border-border px-1.5 py-0.5 rounded text-accent font-mono text-sm">Authorization</code> header.
                    </p>
                    <div className="bg-surface border border-border rounded-lg p-4 font-mono text-sm text-green-400">
                        Authorization: Bearer YOUR_API_KEY
                    </div>
                </section>

                {/* Endpoint Section */}
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 font-bold rounded text-sm border border-blue-500/30">POST</span>
                        <h2 className="text-2xl font-bold text-textMain font-mono">/api/v1/rewrite</h2>
                    </div>
                    
                    <p className="text-textMuted mb-8">
                        Generate a rewritten draft based on a reference style.
                    </p>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Parameters */}
                        <div>
                            <h3 className="text-sm font-bold text-textMain uppercase tracking-wider mb-4 border-b border-border pb-2">Body Parameters</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="font-mono text-sm font-bold text-accent">reference_text</span>
                                        <span className="text-xs text-textMuted">string</span>
                                        <span className="text-[10px] text-red-400 border border-red-400/30 px-1.5 rounded">REQUIRED</span>
                                    </div>
                                    <p className="text-sm text-textMuted">The source text that contains the style/voice you want to mimic.</p>
                                </div>
                                <div>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="font-mono text-sm font-bold text-accent">draft_text</span>
                                        <span className="text-xs text-textMuted">string</span>
                                        <span className="text-[10px] text-red-400 border border-red-400/30 px-1.5 rounded">REQUIRED</span>
                                    </div>
                                    <p className="text-sm text-textMuted">The raw content you want to rewrite.</p>
                                </div>
                            </div>
                        </div>

                        {/* Code Example */}
                        <div>
                            <div className="bg-[#09090b] border border-border rounded-lg overflow-hidden shadow-2xl">
                                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/50">
                                    <span className="text-xs text-textMuted flex items-center gap-2"><Terminal size={12} /> cURL</span>
                                    <button 
                                        onClick={() => handleCopy(curlCommand)}
                                        className="text-xs text-textMuted hover:text-white flex items-center gap-1"
                                    >
                                        {copied ? <Check size={12} className="text-green-400"/> : <Copy size={12} />}
                                        {copied ? "Copied" : "Copy"}
                                    </button>
                                </div>
                                <div className="p-4 overflow-x-auto">
                                    <pre className="font-mono text-xs leading-relaxed text-blue-200">
                                        <code>{curlCommand}</code>
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ApiDocsViewer;