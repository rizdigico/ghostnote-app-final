import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bot, Shuffle, Zap, Check, X, Ghost, Crown, Instagram, Plus, Minus, Sparkles } from 'lucide-react';
import { UserPlan, RewriteStatus } from '../types';
import { VOICE_PRESETS } from '../constants';

interface LandingPageProps {
  onEnterApp: (plan?: UserPlan) => void;
  onViewLegal: (type: 'terms' | 'privacy') => void;
  isLoading?: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onViewLegal, isLoading = false }) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
          entry.target.classList.remove('opacity-0', 'translate-y-10');
        }
      });
    }, { threshold: 0.1 });

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observerRef.current?.observe(el));

    // Check for plan param to open pricing modal
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    if (plan && ['echo', 'clone', 'syndicate'].includes(plan)) {
      // Dispatch custom event to open pricing modal
      window.dispatchEvent(new CustomEvent('openPricing', { detail: plan }));
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => observerRef.current?.disconnect();
  }, []);

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  
  // Try It Live State
  const [selectedPreset, setSelectedPreset] = useState(VOICE_PRESETS[0]);
  const [sampleDraft, setSampleDraft] = useState("We are pleased to announce the launch of our new product feature that will revolutionize the way you work.");
  const [sampleResult, setSampleResult] = useState("");
  const [sampleStatus, setSampleStatus] = useState<RewriteStatus>(RewriteStatus.IDLE);
  const [sampleIntensity, setSampleIntensity] = useState(70);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Handle Try It Live generation
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  
  const handleSampleGenerate = async () => {
    if (!sampleDraft.trim() || sampleStatus === RewriteStatus.LOADING) return;
    
    setSampleStatus(RewriteStatus.LOADING);
    setSampleResult('');
    setRateLimitError(null);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft: sampleDraft,
          referenceText: selectedPreset.referenceText,
          intensity: sampleIntensity,
        }),
      });
      
      // Handle rate limit (429) with upgrade CTA
      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        setRateLimitError(data.message || "You've reached your free trial limit.");
        setSampleStatus(RewriteStatus.ERROR);
        return;
      }
      
      if (!response.ok) throw new Error('Generation failed');
      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let result = '';
      
      // Check if response is JSON error or text stream
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        if (data.error) {
          throw new Error(data.message || data.error);
        }
      }
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          result += decoder.decode(value, { stream: true });
          setSampleResult(result);
        }
      }
      
      setSampleStatus(RewriteStatus.SUCCESS);
    } catch (error) {
      setSampleStatus(RewriteStatus.ERROR);
      setSampleResult('Oops! Something went wrong. Please try again.');
    }
  };

  const faqs = [
    {
        question: "How does GhostNote actually 'learn' my voice?",
        answer: "We analyze the syntax, vocabulary, sentence structures, and slang from your uploaded 'Brand DNA' files (PDFs, past articles, etc.). We then instruct our AI engine to apply those specific linguistic patterns to your new draft."
    },
    {
        question: "Is my uploaded data used to train the AI?",
        answer: "No. Absolutely not. Your data is processed securely via Google's Enterprise API for the sole purpose of generating your specific request. It is never used to train the base models or shared with other users."
    },
    {
        question: "How is this different from standard ChatGPT?",
        answer: "ChatGPT has a specific 'default' voice that sounds robotic and polite. GhostNote is built specifically for 'Style Transfer'. We prioritize *how* something is said over just *what* is said, allowing you to sound like a Gen Z intern, a professional CEO, or yourself."
    },
    {
        question: "Can I use the content for client work?",
        answer: "Yes. You retain full commercial ownership of all content generated by GhostNote. It is designed specifically to help freelancers and agencies scale their production."
    },
    {
        question: "What file formats do you support?",
        answer: "We support PDF, TXT, and CSV files for style references. The Clone plan allows file uploads up to 5MB, while the free Echo plan relies on text-paste references."
    },
    {
        question: "What happens if I cancel my subscription?",
        answer: "You can cancel at any time. You will retain access to your paid features until the end of your current billing cycle. After that, your account will revert to the free 'Echo' plan."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-textMain font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
               <div className="w-1.5 h-1.5 bg-black rounded-full" />
            </div>
            <span className="font-bold tracking-widest uppercase text-xs">GhostNote</span>
          </div>
          <div className="flex items-center gap-6">
             <button 
                onClick={() => !isLoading && onEnterApp('echo')} 
                disabled={isLoading}
                className="text-sm font-medium text-textMuted hover:text-white transition-colors hidden md:block disabled:opacity-50 disabled:cursor-not-allowed"
             >
                Log In
             </button>
             <button 
                onClick={() => !isLoading && onEnterApp('echo')}
                disabled={isLoading}
                className="bg-white text-black text-xs font-bold px-4 py-2 rounded hover:bg-gray-200 transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {isLoading ? 'Loading...' : 'Launch Now'}
             </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out">
            <div className="inline-block px-3 py-1 mb-6 border border-accent/20 rounded-full bg-accent/5">
               <span className="text-accent text-[10px] font-mono tracking-widest uppercase">The Linguistic DNA Engine</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
              Stop Sounding<br />Like a <span className="text-textMuted decoration-accent underline decoration-2 underline-offset-4">Robot</span>.
            </h1>
            <p className="text-lg md:text-xl text-textMuted max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              The first AI that clones your "Linguistic DNA". Upload your past work. Generate new content that actually sounds like YOU.
            </p>
            <button 
              onClick={() => !isLoading && onEnterApp('clone')}
              disabled={isLoading}
              className="bg-accent text-black px-8 py-4 rounded-md font-bold text-sm md:text-base tracking-wide uppercase hover:bg-white hover:shadow-[0_0_20px_rgba(217,249,157,0.5)] transition-all flex items-center gap-2 mx-auto group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clone Your Voice Now <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Comparison Visual */}
          <div className="mt-20 w-full max-w-4xl mx-auto reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out delay-200">
             <div className="grid md:grid-cols-2 gap-0 border border-border rounded-xl overflow-hidden shadow-2xl bg-surface/50">
                <div className="p-8 border-b md:border-b-0 md:border-r border-border bg-black/50 text-left">
                   <div className="flex items-center gap-2 mb-4">
                      <Bot size={16} className="text-textMuted" />
                      <span className="text-xs font-mono text-textMuted uppercase">Generic Model</span>
                   </div>
                   <p className="text-textMuted leading-relaxed">
                      "In today's fast-paced digital landscape, it is imperative to leverage synergies to optimize key performance indicators. We are thrilled to announce..."
                   </p>
                </div>
                <div className="p-8 bg-surface relative text-left">
                   <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                   <div className="flex items-center gap-2 mb-4">
                      <div className="w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                         <div className="w-1.5 h-1.5 bg-black rounded-full" />
                      </div>
                      <span className="text-xs font-mono text-accent uppercase">GhostNote Optimized</span>
                   </div>
                   <p className="text-white leading-relaxed font-medium">
                      "Look, the internet moves fast. If you're not stacking wins on your KPIs, you're dead in the water. That's why we shipped this feature."
                   </p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-24 border-t border-border/50 bg-black/50">
         <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-12">
               <div className="reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out delay-100">
                  <div className="w-12 h-12 bg-surface border border-border rounded-lg flex items-center justify-center mb-6">
                     <Bot className="text-textMuted" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">The GPT Slop</h3>
                  <p className="text-textMuted leading-relaxed text-sm">Generic models sound polite but boring. You lose readers instantly because your content feels synthesized and soulless.</p>
               </div>
               <div className="reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out delay-200">
                  <div className="w-12 h-12 bg-surface border border-border rounded-lg flex items-center justify-center mb-6">
                     <Shuffle className="text-textMuted" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">The Tone Switch</h3>
                  <p className="text-textMuted leading-relaxed text-sm">Switching between Client A's corporate tone and Client B's startup vibe is mentally exhausting. Burnout is real.</p>
               </div>
               <div className="reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out delay-300">
                  <div className="w-12 h-12 bg-surface border border-accent rounded-lg flex items-center justify-center mb-6 shadow-[0_0_15px_-5px_rgba(217,249,157,0.3)]">
                     <Zap className="text-accent" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">The GhostNote Fix</h3>
                  <p className="text-textMuted leading-relaxed text-sm">One-click style transfer. Your brand voice, preserved perfectly. Upload a PDF, set the intensity, and generate.</p>
               </div>
            </div>
         </div>
      </section>

     {/* Try It Live */}
     <section className="py-24 px-6 bg-surface/10 border-y border-border/50">
       <div className="max-w-4xl mx-auto">
         <div className="text-center mb-12 reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out">
           <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 border border-accent/20 rounded-full bg-accent/5">
             <Sparkles size={12} className="text-accent" />
             <span className="text-accent text-[10px] font-mono tracking-widest uppercase">Try It Free</span>
           </div>
           <h2 className="text-3xl font-bold mb-4">See The Magic Happen</h2>
           <p className="text-textMuted">Paste any text and watch it transform. No login required.</p>
         </div>
         
         <div className="bg-background border border-border rounded-xl overflow-hidden shadow-2xl reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out">
           {/* Header */}
           <div className="bg-surface border-b border-border px-6 py-4 flex flex-wrap items-center gap-4">
             <div className="flex items-center gap-2">
               <span className="text-xs text-textMuted uppercase tracking-wider">Voice:</span>
               <select
                 value={selectedPreset.id}
                 onChange={(e) => {
                   const preset = VOICE_PRESETS.find(p => p.id === e.target.value);
                   if (preset) setSelectedPreset(preset);
                 }}
                 className="bg-background border border-border rounded px-3 py-1.5 text-sm text-textMain focus:border-accent focus:outline-none"
               >
                 {VOICE_PRESETS.filter(p => p.id !== 'custom').map(preset => (
                   <option key={preset.id} value={preset.id}>{preset.name}</option>
                 ))}
               </select>
             </div>
             
             <div className="flex items-center gap-2 flex-1">
               <span className="text-xs text-textMuted uppercase tracking-wider">Intensity:</span>
               <input
                 type="range"
                 min="1"
                 max="100"
                 value={sampleIntensity}
                 onChange={(e) => setSampleIntensity(parseInt(e.target.value))}
                 className="flex-1 max-w-[120px] h-1 bg-surface rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-sm"
               />
               <span className="text-xs font-mono text-accent w-8">{sampleIntensity}%</span>
             </div>
           </div>
           
           {/* Content */}
           <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
             {/* Input */}
             <div className="p-6">
               <label className="text-xs text-textMuted uppercase tracking-wider mb-2 block">Your Text</label>
               <textarea
                 value={sampleDraft}
                 onChange={(e) => setSampleDraft(e.target.value)}
                 placeholder="Paste your text here..."
                 className="w-full h-40 bg-surface border border-border rounded-md p-4 text-textMain text-sm leading-relaxed placeholder-textMuted/30 focus:border-accent focus:outline-none transition-colors resize-none"
                 maxLength={500}
               />
               <div className="flex justify-between items-center mt-2">
                 <span className="text-[10px] text-textMuted">{sampleDraft.length}/500</span>
                 <button
                   onClick={handleSampleGenerate}
                   disabled={sampleStatus === RewriteStatus.LOADING || !sampleDraft.trim()}
                   className="bg-accent text-black px-4 py-2 rounded-md text-sm font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                 >
                   {sampleStatus === RewriteStatus.LOADING ? (
                     <>
                       <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                       Transforming...
                     </>
                   ) : (
                     <>
                       <Sparkles size={14} />
                       Transform
                     </>
                   )}
                 </button>
               </div>
             </div>
             
             {/* Output */}
             <div className="p-6 bg-black/20">
               <label className="text-xs text-textMuted uppercase tracking-wider mb-2 block">GhostNote Result</label>
               <div className="w-full h-40 bg-surface border border-border rounded-md p-4 text-textMain text-sm leading-relaxed overflow-auto">
                 {sampleResult ? (
                   <p className="whitespace-pre-wrap">{sampleResult}</p>
                 ) : (
                   <p className="text-textMuted/50 italic">
                     {sampleStatus === RewriteStatus.IDLE
                       ? "Your transformed text will appear here..."
                       : sampleStatus === RewriteStatus.ERROR
                         ? "Something went wrong. Try again!"
                         : ""
                     }
                   </p>
                 )}
               </div>
               <div className="flex justify-between items-center mt-2">
                 <span className="text-[10px] text-textMuted">Powered by Llama 3.3</span>
                 {sampleResult && (
                   <button
                     onClick={() => {
                       navigator.clipboard.writeText(sampleResult);
                       const btn = document.activeElement as HTMLButtonElement;
                       if (btn) {
                         const original = btn.textContent;
                         btn.textContent = 'Copied!';
                         setTimeout(() => btn.textContent = original, 1500);
                       }
                     }}
                     className="text-[10px] text-accent hover:text-white transition-colors"
                   >
                     Copy Result
                   </button>
                 )}
               </div>
             </div>
           </div>
           
           {/* CTA */}
           <div className="bg-surface border-t border-border px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
             <p className="text-sm text-textMuted">Want to save your own voices and unlock unlimited rewrites?</p>
             <button
               onClick={() => onEnterApp('clone')}
               className="bg-white text-black px-6 py-2 rounded-md text-sm font-bold hover:bg-accent transition-colors whitespace-nowrap"
             >
               Start Free Trial
             </button>
           </div>
         </div>
       </div>
     </section>

     {/* How It Works */}
     <section className="py-32 px-6">
         <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out">
               <h2 className="text-3xl font-bold mb-4">Workflow of the Future</h2>
               <p className="text-textMuted">Three steps to immortality.</p>
            </div>
            
            <div className="space-y-12">
               {[
                  { title: "Upload Brand DNA", desc: "Feed the engine PDFs, text files, or CSVs of your best work.", step: "01" },
                  { title: "Select Intensity", desc: "Dial in the mimicry from 'Loose Inspiration' (10%) to 'Exact Clone' (100%).", step: "02" },
                  { title: "Generate & Dominate", desc: "Get perfect drafts in seconds. Export to your CMS or send directly to the client.", step: "03" }
               ].map((item, i) => (
                  <div key={i} className="flex items-start gap-6 pb-12 border-b border-border last:border-0 reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out">
                     <span className="text-4xl font-mono text-border font-bold opacity-30">{item.step}</span>
                     <div>
                        <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                        <p className="text-textMuted">{item.desc}</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* How It Works - UI Screenshots */}
      <section className="py-24 px-6 bg-surface/10">
         <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out">
               <h2 className="text-3xl font-bold mb-4">See It In Action</h2>
               <p className="text-textMuted">Your interface before you sign up.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
               {/* Screenshot 1: Dashboard Overview */}
               <div className="reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out delay-100">
                  <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-2xl">
                     {/* Browser Chrome */}
                     <div className="bg-background border-b border-border px-4 py-3 flex items-center gap-2">
                        <div className="flex gap-1.5">
                           <div className="w-3 h-3 rounded-full bg-red-500/50" />
                           <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                           <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        </div>
                        <div className="flex-1 bg-surface rounded text-xs text-textMuted px-3 py-1 mx-4">ghostnote.app/dashboard</div>
                     </div>
                     {/* UI Screenshot Content */}
                     <div className="p-4 bg-gradient-to-br from-gray-900 to-black aspect-video flex items-center justify-center relative overflow-hidden">
                        {/* Mock Dashboard UI */}
                        <div className="w-full h-full bg-background rounded-lg border border-border overflow-hidden flex flex-col">
                           {/* Mock Header */}
                           <div className="h-8 bg-surface border-b border-border flex items-center px-3 gap-2">
                              <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                                 <div className="w-1.5 h-1.5 bg-black rounded-full" />
                              </div>
                              <span className="text-[8px] font-bold tracking-widest text-textMain">GHOSTNOTE</span>
                              <div className="ml-auto flex items-center gap-2">
                                 <div className="w-12 h-3 bg-surface border border-border rounded text-[6px] text-textMuted px-1 flex items-center">5 / 5</div>
                              </div>
                           </div>
                           {/* Mock Content */}
                           <div className="flex-1 flex">
                              {/* Left Panel */}
                              <div className="flex-1 p-3 space-y-2">
                                 {/* Tone Preset */}
                                 <div className="space-y-1">
                                    <label className="text-[6px] text-textMuted uppercase tracking-wider">Tone Preset</label>
                                    <div className="h-6 bg-surface border border-border rounded flex items-center px-2">
                                       <span className="text-[8px] text-textMain">Casual Tech Bro</span>
                                       <span className="ml-auto text-[6px] text-textMuted">▼</span>
                                    </div>
                                 </div>
                                 {/* Tabs */}
                                 <div className="flex gap-1">
                                    <div className="px-2 py-1 bg-background border border-border/50 rounded text-[6px] text-textMain">PASTE</div>
                                    <div className="px-2 py-1 bg-surface text-[6px] text-textMuted rounded">FILE</div>
                                    <div className="px-2 py-1 bg-surface text-[6px] text-textMuted rounded flex items-center gap-0.5">
                                       <span className="w-1.5 h-1.5 border border-textMuted/30 rounded-full"></span>
                                       BULK
                                    </div>
                                 </div>
                                 {/* Text Area */}
                                 <div className="h-16 bg-surface border border-border rounded p-2">
                                    <p className="text-[6px] text-textMuted/50 font-mono">// Paste existing content...</p>
                                 </div>
                                 {/* Intensity Slider */}
                                 <div className="space-y-1 pt-1">
                                    <div className="flex justify-between">
                                       <span className="text-[6px] text-textMuted uppercase">Mimicry Intensity</span>
                                       <span className="text-[6px] text-accent">50%</span>
                                    </div>
                                    <div className="h-1 bg-surface rounded-full overflow-hidden">
                                       <div className="w-1/2 h-full bg-accent"></div>
                                    </div>
                                 </div>
                              </div>
                              {/* Right Panel - Output */}
                              <div className="w-1/3 bg-surface border-l border-border p-2">
                                 <div className="text-[6px] text-textMuted uppercase tracking-wider mb-2">Output</div>
                                 <div className="h-20 border border-dashed border-border/30 rounded flex items-center justify-center">
                                    <span className="text-[6px] text-textMuted/30">Awaiting Input</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="mt-4 text-center">
                     <h3 className="text-sm font-bold text-white mb-1">Step 1: Choose Your Voice</h3>
                     <p className="text-xs text-textMuted">Select from preset tones like "Casual Tech Bro" or "Professional CEO"</p>
                  </div>
               </div>

               {/* Screenshot 2: Style Upload */}
               <div className="reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out delay-200">
                  <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-2xl">
                     {/* Browser Chrome */}
                     <div className="bg-background border-b border-border px-4 py-3 flex items-center gap-2">
                        <div className="flex gap-1.5">
                           <div className="w-3 h-3 rounded-full bg-red-500/50" />
                           <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                           <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        </div>
                        <div className="flex-1 bg-surface rounded text-xs text-textMuted px-3 py-1 mx-4">ghostnote.app/upload</div>
                     </div>
                     {/* UI Screenshot Content */}
                     <div className="p-4 bg-gradient-to-br from-gray-900 to-black aspect-video flex items-center justify-center relative overflow-hidden">
                        {/* Mock File Upload UI */}
                        <div className="w-full h-full bg-background rounded-lg border border-border overflow-hidden flex flex-col">
                           {/* Mock Header */}
                           <div className="h-8 bg-surface border-b border-border flex items-center px-3 gap-2">
                              <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                                 <div className="w-1.5 h-1.5 bg-black rounded-full" />
                              </div>
                              <span className="text-[8px] font-bold tracking-widest text-textMain">GHOSTNOTE</span>
                           </div>
                           {/* Mock Content - File Upload Active */}
                           <div className="flex-1 flex">
                              {/* Left Panel */}
                              <div className="flex-1 p-3 space-y-2">
                                 {/* Tone Preset */}
                                 <div className="space-y-1">
                                    <label className="text-[6px] text-textMuted uppercase tracking-wider">Tone Preset</label>
                                    <div className="h-6 bg-surface border border-border rounded flex items-center px-2 opacity-40">
                                       <span className="text-[8px] text-textMain">Custom / Other</span>
                                    </div>
                                 </div>
                                 {/* Tabs - File Active */}
                                 <div className="flex gap-1">
                                    <div className="px-2 py-1 bg-surface text-[6px] text-textMuted rounded">PASTE</div>
                                    <div className="px-2 py-1 bg-background border border-border/50 rounded text-[6px] text-textMain">FILE</div>
                                    <div className="px-2 py-1 bg-surface text-[6px] text-textMuted rounded flex items-center gap-0.5">
                                       <span className="w-1.5 h-1.5 border border-textMuted/30 rounded-full"></span>
                                       BULK
                                    </div>
                                 </div>
                                 {/* File Upload Area */}
                                 <div className="h-20 border-2 border-dashed border-accent/50 bg-accent/5 rounded flex flex-col items-center justify-center gap-1">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                       <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                       </svg>
                                    </div>
                                    <p className="text-[7px] text-textMain font-bold">DROP FILE OR CLICK</p>
                                    <div className="flex gap-1">
                                       <span className="px-1 py-0.5 bg-surface border border-border rounded text-[5px] text-textMuted">PDF</span>
                                       <span className="px-1 py-0.5 bg-surface border border-border rounded text-[5px] text-textMuted">TXT</span>
                                       <span className="px-1 py-0.5 bg-surface border border-border rounded text-[5px] text-textMuted">CSV</span>
                                    </div>
                                 </div>
                                 {/* File Preview */}
                                 <div className="h-10 bg-background border border-border rounded flex items-center px-2 gap-2">
                                    <div className="w-6 h-6 bg-surface rounded flex items-center justify-center">
                                       <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                       </svg>
                                    </div>
                                    <div className="flex-1">
                                       <p className="text-[7px] text-textMain truncate">brand_voice_guide.pdf</p>
                                       <p className="text-[5px] text-textMuted">PDF • BRAND DNA</p>
                                    </div>
                                    <span className="text-[6px] text-accent">✓</span>
                                 </div>
                              </div>
                              {/* Right Panel */}
                              <div className="w-1/3 bg-surface border-l border-border p-2">
                                 <div className="text-[6px] text-textMuted uppercase tracking-wider mb-2">Output</div>
                                 <div className="h-20 border border-dashed border-border/30 rounded flex items-center justify-center">
                                    <span className="text-[6px] text-textMuted/30">Awaiting Input</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="mt-4 text-center">
                     <h3 className="text-sm font-bold text-white mb-1">Step 2: Upload Brand DNA</h3>
                     <p className="text-xs text-textMuted">Drop PDFs, TXT, or CSV files to train the AI on your style</p>
                  </div>
               </div>

               {/* Screenshot 3: Content Generation */}
               <div className="reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out delay-300">
                  <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-2xl">
                     {/* Browser Chrome */}
                     <div className="bg-background border-b border-border px-4 py-3 flex items-center gap-2">
                        <div className="flex gap-1.5">
                           <div className="w-3 h-3 rounded-full bg-red-500/50" />
                           <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                           <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        </div>
                        <div className="flex-1 bg-surface rounded text-xs text-textMuted px-3 py-1 mx-4">ghostnote.app/generate</div>
                     </div>
                     {/* UI Screenshot Content */}
                     <div className="p-4 bg-gradient-to-br from-gray-900 to-black aspect-video flex items-center justify-center relative overflow-hidden">
                        {/* Mock Generated Content UI */}
                        <div className="w-full h-full bg-background rounded-lg border border-border overflow-hidden flex flex-col">
                           {/* Mock Header */}
                           <div className="h-8 bg-surface border-b border-border flex items-center px-3 gap-2">
                              <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                                 <div className="w-1.5 h-1.5 bg-black rounded-full" />
                              </div>
                              <span className="text-[8px] font-bold tracking-widest text-textMain">GHOSTNOTE</span>
                           </div>
                           {/* Mock Content - With Generated Output */}
                           <div className="flex-1 flex">
                              {/* Left Panel - Draft Input */}
                              <div className="flex-1 p-3 space-y-2">
                                 {/* Tone Preset */}
                                 <div className="space-y-1">
                                    <label className="text-[6px] text-textMuted uppercase tracking-wider">Tone Preset</label>
                                    <div className="h-6 bg-surface border border-border rounded flex items-center px-2">
                                       <span className="text-[8px] text-textMain">Casual Tech Bro</span>
                                    </div>
                                 </div>
                                 {/* Draft Input */}
                                 <div className="space-y-1">
                                    <label className="text-[6px] text-textMuted uppercase tracking-wider">Raw Draft</label>
                                    <div className="h-14 bg-surface border border-border rounded p-2">
                                       <p className="text-[6px] text-textMain font-mono leading-tight">We are pleased to announce the launch of our new product feature...</p>
                                    </div>
                                 </div>
                                 {/* Generate Button */}
                                 <div className="h-7 bg-accent rounded flex items-center justify-center gap-1">
                                    <span className="text-[7px] font-bold text-black">RUN TRANSFORMATION</span>
                                    <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                 </div>
                              </div>
                              {/* Right Panel - Generated Output */}
                              <div className="w-1/2 bg-surface border-l border-border p-2 flex flex-col">
                                 <div className="flex items-center justify-between mb-2">
                                    <span className="text-[6px] text-textMuted uppercase tracking-wider">Output</span>
                                    <div className="flex gap-1">
                                       <span className="px-1.5 py-0.5 bg-background border border-border rounded text-[5px] text-textMuted">EXPORT</span>
                                       <span className="px-1.5 py-0.5 bg-background border border-border rounded text-[5px] text-textMuted">COPY</span>
                                    </div>
                                 </div>
                                 {/* Generated Content */}
                                 <div className="flex-1 bg-background border border-border rounded p-2 overflow-hidden">
                                    <p className="text-[6px] text-textMain font-mono leading-relaxed">
                                       Yo, we just shipped this feature and it's absolutely insane. The latency is basically zero, and honestly? The DX is chef's kiss 🔥
                                    </p>
                                    <p className="text-[6px] text-textMain font-mono leading-relaxed mt-1">
                                       We're going full PLG mode anyway, so just ship it and iterate. LFG! 🚀
                                    </p>
                                 </div>
                                 {/* Export Options */}
                                 <div className="mt-2 flex gap-1">
                                    <span className="px-1.5 py-0.5 bg-surface border border-border rounded text-[5px] text-textMuted">.txt</span>
                                    <span className="px-1.5 py-0.5 bg-surface border border-border rounded text-[5px] text-textMuted">.md</span>
                                    <span className="px-1.5 py-0.5 bg-surface border border-border rounded text-[5x] text-textMuted">.pdf</span>
                                    <span className="px-1.5 py-0.5 bg-surface border border-border rounded text-[5px] text-textMuted">.json</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="mt-4 text-center">
                     <h3 className="text-sm font-bold text-white mb-1">Step 3: Generate & Export</h3>
                     <p className="text-xs text-textMuted">Get rewritten content and export as TXT, MD, PDF, or JSON</p>
                  </div>
               </div>
            </div>

            {/* CTA below screenshots */}
            <div className="mt-12 text-center reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out">
               <button 
                  onClick={() => !isLoading && onEnterApp('clone')}
                  disabled={isLoading}
                  className="bg-accent text-black px-8 py-4 rounded-md font-bold text-sm tracking-wide uppercase hover:bg-white hover:shadow-[0_0_20px_rgba(217,249,157,0.5)] transition-all inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  Start Free Trial <ArrowRight size={18} />
               </button>
            </div>
         </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-surface/20 border-y border-border/50">
         <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-8 reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out">
               <h2 className="text-3xl font-bold mb-4">Choose Your Hardware</h2>
               <p className="text-textMuted">Scalable plans for freelancers and agencies.</p>
            </div>

            {/* Toggle Switch */}
            <div className="flex justify-center items-center gap-4 mb-12">
              <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white font-bold' : 'text-gray-500'}`}>Monthly</span>
              
              <button 
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="w-14 h-7 bg-gray-700 rounded-full relative transition-colors duration-300 focus:outline-none"
              >
                <div className={`absolute top-1 w-5 h-5 bg-accent rounded-full shadow-md transform transition-transform duration-300 ${
                  billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>

              <span className={`text-sm ${billingCycle === 'yearly' ? 'text-white font-bold' : 'text-gray-500'}`}>
                Yearly <span className="text-accent text-xs ml-1">(SAVE YEARLY 30%)</span>
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
               {/* Echo */}
               <div className="p-8 rounded-xl border border-border bg-background flex flex-col reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out delay-100">
                  <div className="mb-6"><Ghost className="text-textMuted" /></div>
                  <h3 className="text-xl font-bold mb-2">The Echo</h3>
                  <div className="text-3xl font-bold mb-6">$0 <span className="text-sm font-normal text-textMuted">/ forever</span></div>
                  <ul className="space-y-3 mb-8 flex-1">
                     {['5 Credits / Day', 'Text Input Only', 'Standard Speed'].map((f, i) => (
                        <li key={i} className="flex gap-3 text-sm"><Check size={16} className="text-textMuted" /> {f}</li>
                     ))}
                  </ul>
                  <button onClick={() => onEnterApp('echo')} className="w-full py-3 border border-border rounded-md text-sm font-bold hover:bg-surface transition-colors uppercase tracking-wide">Start Free</button>
               </div>

               {/* Clone */}
               <div className="relative p-8 rounded-xl border-2 border-accent bg-surface/30 flex flex-col shadow-[0_0_40px_-10px_rgba(217,249,157,0.1)] transform md:-translate-y-4 reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out delay-200">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Most Popular</div>
                  <div className="mb-6"><Zap className="text-accent" /></div>
                  <h3 className="text-xl font-bold mb-2 text-white">The Clone</h3>
                  <div className="text-3xl font-bold mb-6">
                    {billingCycle === 'monthly' ? '$29' : '$244'} 
                    <span className="text-sm font-normal text-textMuted">/ {billingCycle === 'monthly' ? 'month' : 'year'}</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                     {['Unlimited Credits', 'Brand DNA File Upload', 'Tone Intensity Slider', 'Priority Generation'].map((f, i) => (
                        <li key={i} className="flex gap-3 text-sm"><Check size={16} className="text-accent" /> {f}</li>
                     ))}
                  </ul>
                  <button onClick={() => onEnterApp('clone')} className="w-full py-3 bg-accent text-black rounded-md text-sm font-bold hover:bg-white transition-colors uppercase tracking-wide">
                    {billingCycle === 'monthly' ? 'START 14-DAY FREE TRIAL' : 'START 14-DAY FREE TRIAL'}
                  </button>
                  {billingCycle === 'monthly' && (
                    <p className="text-xs text-gray-500 mt-2 text-center">$0.00 due today. Cancel anytime.</p>
                  )}
               </div>

               {/* Syndicate */}
               <div className="p-8 rounded-xl border border-purple-500/30 bg-background flex flex-col reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out delay-300">
                  <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    BEST VALUE
                  </div>
                  <div className="mb-6"><Crown className="text-purple-400" /></div>
                  <h3 className="text-xl font-bold mb-2">The Syndicate</h3>
                  <div className="text-3xl font-bold mb-6">
                    {billingCycle === 'monthly' ? '$99' : '$832'} 
                    <span className="text-sm font-normal text-textMuted">/ {billingCycle === 'monthly' ? 'month' : 'year'}</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                     {['Everything in Clone', 'Bulk CSV Processing', 'API Access', 'Concierge Support'].map((f, i) => (
                        <li key={i} className="flex gap-3 text-sm"><Check size={16} className="text-purple-400" /> {f}</li>
                     ))}
                  </ul>
                  <button onClick={() => onEnterApp('syndicate')} className="w-full py-3 bg-purple-600 text-white rounded-md text-sm font-bold hover:bg-purple-500 transition-colors uppercase tracking-wide">
                    UPGRADE NOW
                  </button>
                  {billingCycle === 'monthly' && (
                    <p className="text-xs text-gray-500 mt-2 text-center">$99.00 billed monthly</p>
                  )}
               </div>
            </div>
         </div>
      </section>

      {/* FAQs */}
      <section className="py-24 px-6 bg-surface/10">
         <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16 reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out">
               <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
               <p className="text-textMuted">Everything you need to know about the engine.</p>
            </div>

            <div className="space-y-4">
               {faqs.map((faq, index) => (
                  <div 
                    key={index} 
                    className="border border-border rounded-lg bg-surface/40 overflow-hidden reveal-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out"
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                     <button 
                        onClick={() => toggleFaq(index)}
                        className="w-full p-6 text-left flex justify-between items-center hover:bg-surface/60 transition-colors"
                     >
                        <span className="font-bold text-sm md:text-base pr-4">{faq.question}</span>
                        {openFaqIndex === index ? (
                           <Minus size={18} className="text-accent shrink-0" />
                        ) : (
                           <Plus size={18} className="text-textMuted shrink-0" />
                        )}
                     </button>
                     <div 
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${
                           openFaqIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                     >
                        <div className="p-6 pt-0 text-textMuted text-sm leading-relaxed border-t border-border/50">
                           {faq.answer}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 text-center">
         <div className="mb-6 flex justify-center items-center gap-6 text-sm font-medium text-textMuted">
            <a href="https://www.instagram.com/ghostnoteai" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
               <Instagram size={18} />
               <span>Instagram</span>
            </a>
            <button onClick={() => onViewLegal('terms')} className="hover:text-white transition-colors">Terms of Service</button>
            <button onClick={() => onViewLegal('privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
         </div>
         <p className="text-xs text-textMuted/50">© 2026 GhostNote AI. All rights reserved.</p>
      </footer>

      <style>{`
         .animate-fade-in-up {
            opacity: 1 !important;
            transform: translateY(0) !important;
         }
      `}</style>
    </div>
  );
};

export default LandingPage;
