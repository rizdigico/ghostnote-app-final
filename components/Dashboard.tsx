import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, ArrowRight, Command, Upload, FileText, X, Paperclip, Lock, Crown, Zap, Database, FileSpreadsheet, Trash2, Download, ChevronDown, FileType, FileCode, FileJson, Save, AlertCircle, Sparkles } from 'lucide-react';
import Button from './Button';
import TextArea from './TextArea';
import Select from './Select';
import PricingModal from './PricingModal';
import AccountModal from './AccountModal';
import TeamSettingsModal from './TeamSettingsModal';
import TeamSwitcher from './TeamSwitcher';
import UserMenu from './UserMenu';
import UrlImportCard from './UrlImportCard';
import DnaPreviewModal from './DnaPreviewModal';
import StyleMixer from './StyleMixer';
import { dbService } from '../dbService';
import { useAuth } from '../AuthContext';
import { RewriteStatus, VoicePreset, VoicePresetVisibility, UserPlan, VoiceInjection } from '../types';
import { canAddPreset, getPresetLimit } from '../constants';
import { jsPDF } from "jspdf";

interface DashboardProps {
  onGoHome: () => void;
  onViewLegal: (type: 'terms' | 'privacy') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onGoHome, onViewLegal }) => {
  const { user, team, updatePlan, deductCredit } = useAuth();
  
  // Local UI State
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [upgradeBillingCycle, setUpgradeBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [showTeamSettingsModal, setShowTeamSettingsModal] = useState<boolean>(false);
  const [intensity, setIntensity] = useState<number>(50);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'error' | 'success'>('error');
  
  // Cooldown Logic for Free Plan
  const [isCooldown, setIsCooldown] = useState<boolean>(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  
  // Save Preset State
  const [showSavePresetModal, setShowSavePresetModal] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>("");
  const [shareWithTeam, setShareWithTeam] = useState<boolean>(false);
  
  // Delete Preset State
  const [showDeletePresetModal, setShowDeletePresetModal] = useState<boolean>(false);
  const [presetToDelete, setPresetToDelete] = useState<VoicePreset | null>(null);

  // URL Import State
  const [showDnaPreviewModal, setShowDnaPreviewModal] = useState<boolean>(false);
  const [urlSourceData, setUrlSourceData] = useState<{
    textContent: string;
    sourceTitle: string;
    sourceUrl: string;
  } | null>(null);

  // Handle URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('showPricing') === 'true') {
      setShowUpgradeModal(true);
      // Clean up the URL without refreshing
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // App State
  const [presets, setPresets] = useState<VoicePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  // Separate state for base voice in StyleMixer (should be a base voice, not system preset)
  const [baseVoiceId, setBaseVoiceId] = useState<string>('');
  const [activeInjections, setActiveInjections] = useState<VoiceInjection[]>([]);
  const [activeTab, setActiveTab] = useState<'text' | 'file' | 'bulk' | 'url'>('text');
  
  const [referenceText, setReferenceText] = useState<string>("");
  const [referenceFile, setReferenceFile] = useState<{ name: string; data: string; mimeType: string } | null>(null);
  const [bulkFile, setBulkFile] = useState<{ name: string; data: string; mimeType: string; size: string } | null>(null);
  
  const [draftText, setDraftText] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [bulkDownloadUrl, setBulkDownloadUrl] = useState<string | null>(null);
  
  const [status, setStatus] = useState<RewriteStatus>(RewriteStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("PROCESSING");
  const [copied, setCopied] = useState<boolean>(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- EFFECT: LOAD DATA ---
  useEffect(() => {
    const loadData = async () => {
        if (user) {
            try {
              const voices = await dbService.getVoicePresets(user.id);
              setPresets(voices);
              
              if (voices.length > 0 && !selectedPresetId) {
                // Find first base voice (not system preset) to use as default
                const baseVoice = voices.find(v => !v.is_system_preset);
                const defaultVoice = baseVoice || voices[0];
                
                setSelectedPresetId(defaultVoice.id);
                setBaseVoiceId(defaultVoice.id);
                setReferenceText(defaultVoice.referenceText);
              }
            } catch (err) {
              console.error("Failed to load presets", err);
            }
        }
    };
    loadData();
  }, [user]);

  // --- EFFECT: CHECK FOR CHECKOUT PARAM ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const plan = params.get('plan');
    const billing = params.get('billing');
    
    if (checkout === 'true' && plan && ['clone', 'syndicate'].includes(plan)) {
      // Set the billing cycle from URL param
      if (billing === 'yearly') {
        setUpgradeBillingCycle('yearly');
      }
      // Open the upgrade modal with the specific plan
      setShowUpgradeModal(true);
      // Clean the URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  // Handle click outside for export menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- LOGIC ---

  // Gating Checks (Dependent on Auth User)
  const userPlan = user?.plan || 'echo';
  const dailyCredits = user?.credits || 0;
  
  const isPaidPlan = userPlan === 'clone' || userPlan === 'syndicate';

  const isFileUnlocked = userPlan !== 'echo';
  const isBulkUnlocked = userPlan === 'syndicate';
  const hasCredits = userPlan !== 'echo' || dailyCredits > 0;

  // Preset Limit Checks
  const customPresetCount = presets.filter(p => p.isCustom === true).length;
  const presetLimit = getPresetLimit(userPlan);
  const canAddMorePresets = canAddPreset(userPlan, customPresetCount);

  // Handle Plan Upgrade
  const handleUpgrade = async (plan: UserPlan) => {
    await updatePlan(plan);
    setShowUpgradeModal(false);
    // Reset active tab if it's no longer allowed
    if (plan === 'echo' && activeTab !== 'text') setActiveTab('text');
    if (plan === 'clone' && activeTab === 'bulk') setActiveTab('text');
  };

  // Handle Preset Change
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedPresetId(newId);
    
    const preset = presets.find(p => p.id === newId);
    if (preset) {
      setReferenceText(preset.referenceText);
    }
  };

  // Handle Style Mixer Changes - Base Voice (distinct from selectedPresetId)
  const handleBaseVoiceChange = (voiceId: string) => {
    setBaseVoiceId(voiceId);
    const preset = presets.find(p => p.id === voiceId);
    if (preset) {
      setReferenceText(preset.referenceText);
    }
  };

  // Legacy handler - kept for backward compatibility with other components
  const handlePrimaryVoiceChange = (voiceId: string) => {
    setBaseVoiceId(voiceId);
    const preset = presets.find(p => p.id === voiceId);
    if (preset) {
      setReferenceText(preset.referenceText);
    }
  };

  const handleInjectionsChange = (injections: VoiceInjection[]) => {
    setActiveInjections(injections);
  };
  
  // Derived value for selected preset
  const selectedPreset = presets.find(p => p.id === selectedPresetId);
  
  // Handle Save Preset
  const handleSavePreset = async () => {
    // Check preset limit before saving
    if (!canAddMorePresets) {
      setShowSavePresetModal(false);
      setShowUpgradeModal(true);
      return;
    }
    
    if (!newPresetName.trim() || !user) return;
    
    try {
        let newPreset;
        if (shareWithTeam && team) {
            // Save with team visibility
            newPreset = await dbService.saveVoicePresetWithTeam(user.id, newPresetName, referenceText, team.id);
            // Update visibility to team
            newPreset = { ...newPreset, visibility: 'team' as VoicePresetVisibility };
        } else {
            newPreset = await dbService.saveVoicePreset(user.id, newPresetName, referenceText);
        }
        setPresets(prev => [...prev, newPreset]);
        setSelectedPresetId(newPreset.id);
        setShowSavePresetModal(false);
        setNewPresetName("");
        setShareWithTeam(false);
    } catch (e: any) {
        setErrorMessage(e.message || "Failed to save preset.");
    }
  };

  // Handle Delete Preset
  const handleDeletePreset = async () => {
    if (!presetToDelete || !user) return;
    
    try {
        await dbService.deleteVoicePreset(user.id, presetToDelete.id);
        setPresets(prev => prev.filter(p => p.id !== presetToDelete.id));
        
        // If the deleted preset was selected, switch to first available
        if (selectedPresetId === presetToDelete.id) {
            const remaining = presets.filter(p => p.id !== presetToDelete.id);
            if (remaining.length > 0) {
                setSelectedPresetId(remaining[0].id);
                setReferenceText(remaining[0].referenceText);
            } else {
                setSelectedPresetId('');
                setReferenceText('');
            }
        }
        
        setShowDeletePresetModal(false);
        setPresetToDelete(null);
    } catch (e: any) {
        setErrorMessage(e.message || "Failed to delete preset.");
    }
  };

  // Open delete confirmation
  const openDeleteConfirmation = (preset: VoicePreset) => {
    setPresetToDelete(preset);
    setShowDeletePresetModal(true);
  };

  // Handle Tab Switching with Gating
  const handleTabChange = (tab: 'text' | 'file' | 'bulk' | 'url') => {
    if (tab === 'file' && !isFileUnlocked) return;
    if (tab === 'bulk' && !isBulkUnlocked) return;
    setActiveTab(tab);
    setResultText(''); // Clear previous results on tab switch
    setBulkDownloadUrl(null);
  };

  // --- SECURITY: FILE VALIDATION ---
  const validateFileSecurity = (file: File): boolean => {
    // 1. Strict Size Limit (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("File too large for security reasons. Max 5MB.");
      return false;
    }

    // 2. Extension vs MIME Type Check
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mime = file.type;
    
    // Allowed extensions and their MIME types
    const allowedTypes: Record<string, string[]> = {
      'pdf': ['application/pdf'],
      'txt': ['text/plain'],
      'csv': ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel']
    };
    
    // Check if extension is allowed
    if (!allowedTypes[ext]) {
      setErrorMessage("Security Alert: Unsupported file type.");
      return false;
    }
    
    // Check if MIME type matches allowed types for this extension
    const allowedMimes = allowedTypes[ext];
    if (!allowedMimes.includes(mime)) {
      setErrorMessage("Security Alert: File type does not match extension.");
      return false;
    }
    
    // 3. Check for dangerous characters in filename
    const dangerousPattern = /[<>:\"/|?*\x00-\x1F]/;
    if (dangerousPattern.test(file.name)) {
      setErrorMessage("Security Alert: Invalid characters in filename.");
      return false;
    }
    
    return true;
  };

  // Handle Reference File Upload
  const handleFileUpload = (file: File) => {
    if (!validateFileSecurity(file)) return;
    
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64Data = result.split(',')[1];
      setReferenceFile({
        name: file.name,
        mimeType: file.type,
        data: base64Data
      });
    };
    reader.onerror = () => { setErrorMessage("Failed to read file."); };
    reader.readAsDataURL(file);
  };

  // Handle Bulk CSV Upload
  const handleBulkUpload = (file: File) => {
    if (!validateFileSecurity(file)) return;
    if (file.name.split('.').pop()?.toLowerCase() !== 'csv') {
         setErrorMessage("Invalid file type. Please upload a CSV file.");
         return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64Data = result.split(',')[1];
      setBulkFile({
        name: file.name,
        mimeType: file.type,
        data: base64Data,
        size: (file.size / 1024).toFixed(1) + ' KB'
      });
    };
    reader.onerror = () => { setErrorMessage("Failed to read CSV."); };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => { 
    e.preventDefault(); 
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const onBulkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBulkUpload(e.dataTransfer.files[0]);
    }
  };
  
  // Real Bulk Processing Logic
  const processBulkCSV = async (base64Data: string) => {
      try {
        const csvContent = window.atob(base64Data);
        
        // Robust CSV line splitting that handles quoted newlines
        const rows = csvContent.split(/\r?\n/).filter(row => row.trim() !== '');
        
        if (rows.length === 0) throw new Error("CSV is empty");

        // Limit to top 5 for demo to respect rate limits/time
        const demoLimit = 5;
        const rowsToProcess = rows.slice(0, demoLimit);
        
        let processedOutput = "Original,Rewritten\n";
        const total = rowsToProcess.length;

        // Using Llama 3.3 for bulk processing
        for (let i = 0; i < total; i++) {
             setLoadingMessage(`PROCESSING ROW ${i + 1}/${total}`);
             
             // Basic handle for CSV columns. 
             let originalText = "";
             const row = rowsToProcess[i];
             
             if (row.startsWith('"')) {
                 const endQuote = row.indexOf('"', 1);
                 if (endQuote !== -1) {
                     originalText = row.substring(1, endQuote).replace(/""/g, '"');
                 } else {
                     originalText = row; // Fallback
                 }
             } else {
                 originalText = row.split(',')[0];
             }
             
             if (!originalText) continue;
             
             // Use API endpoint for bulk processing
             const response = await fetch('/api/generate', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 draft: originalText,
                 referenceText: referenceText,
                 intensity: userPlan !== "echo" ? Number(intensity) || 50 : 50,
               }),
             });
             
             let rewritten = '';
             if (response.ok && response.body) {
               const reader = response.body.getReader();
               const decoder = new TextDecoder();
               let done = false;
               while (!done) {
                 const { value, done: doneReading } = await reader.read();
                 done = doneReading;
                 if (value) {
                   rewritten += decoder.decode(value, { stream: true });
                 }
               }
             } else {
               throw new Error('Failed to process row');
             }
             
             // Escape quotes for CSV output
             const safeOriginal = `"${originalText.replace(/"/g, '""')}"`;
             const safeRewritten = `"${rewritten.replace(/"/g, '""')}"`;
             
             processedOutput += `${safeOriginal},${safeRewritten}\n`;
             
             // Add a small delay to be nice to the API
             await new Promise(r => setTimeout(r, 1000));
        }

        return processedOutput;
      } catch (e: any) {
          console.error(e);
          throw new Error("Failed to process CSV data. Ensure it is a valid text file.");
      }
  };

  // Handle Rewrite Action with Streaming
  const handleRewrite = async () => {
    if (isCooldown) return;

    if (!hasCredits) {
      setShowUpgradeModal(true);
      return;
    }

    if (activeTab === 'bulk' && !bulkFile) {
        setErrorMessage("CSV Dataset required for bulk processing.");
        return;
    }

    if (activeTab !== 'bulk' && !draftText.trim()) {
      setErrorMessage("Draft input required");
      return;
    }
    
    if (activeTab === 'text' && !referenceText.trim()) {
      setErrorMessage("Reference text required");
      return;
    }

    if (activeTab === 'file' && !referenceFile) {
      setErrorMessage("Brand DNA file required");
      return;
    }

    // Using OpenRouter Llama 3.3 for all plans
    setStatus(RewriteStatus.LOADING);
    setErrorMessage(null);
    setCopied(false);
    setResultText('');
    setBulkDownloadUrl(null);
    setLoadingMessage("PROCESSING REQUEST");

    try {
      // BULK PROCESSING PATH
      if (activeTab === 'bulk' && bulkFile) {
          const reportCSV = await processBulkCSV(bulkFile.data);
          
          // Create download link
          const blob = new Blob([reportCSV], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          setBulkDownloadUrl(url);
          
          setResultText(`Batch processing complete.\n\nProcessed: ${bulkFile.name}\nRows Completed: 5 (Demo Limit)\n\nReview the generated report below.`);
          setStatus(RewriteStatus.SUCCESS);
          return;
      }

      // SINGLE PROCESSING PATH - Use Streaming API
      const currentIntensity = userPlan !== 'echo' ? Number(intensity) || 50 : 50;

      // Prepare request payload with RAG support
      // For file uploads, we decode and pass the file content for RAG processing
      let fileContentPayload: string | null = null;
      let sessionId: string | null = null;
      
      if (activeTab === 'file' && referenceFile) {
        try {
          // Decode base64 file content
          const decodedContent = atob(referenceFile.data);
          fileContentPayload = decodedContent;
          // Generate a session ID for RAG vector store
          sessionId = `rag_${user?.id || 'anon'}_${Date.now()}`;
        } catch (e) {
          console.error("Failed to decode file content:", e);
          setErrorMessage("Failed to process file content.");
          setStatus(RewriteStatus.ERROR);
          return;
        }
      }
      
      const requestPayload: {
        draft: string;
        primaryVoiceId?: string;
        injections?: VoiceInjection[];
        referenceText: string | null;
        fileContent: string | null;
        sessionId: string | null;
        intensity: number;
      } = {
        draft: draftText,
        primaryVoiceId: selectedPresetId,
        injections: activeInjections.length > 0 ? activeInjections : undefined,
        referenceText: activeTab === 'text' ? referenceText : null,
        fileContent: fileContentPayload,
        sessionId: sessionId,
        intensity: currentIntensity,
      };

      // Call streaming API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        // Try to read the error message from the server
        const errorBody = await response.text();
        console.error("Server Error Body:", errorBody);
        
        // Throw a detailed error we can see in the Toast
        throw new Error(`Server Error (${response.status}): ${errorBody || response.statusText}`);
      }

      // Handle streaming response
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      console.log("Stream started..."); // Debug Log

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const chunkValue = decoder.decode(value, { stream: true });
          console.log("Chunk received:", chunkValue); // Debug Log to see what comes in
          setResultText((prev) => prev + chunkValue);
        }
      }
      console.log("Stream finished.");
      
      setStatus(RewriteStatus.SUCCESS);
      
      // Post-Processing Logic
      if (!isPaidPlan) {
        // Free Plan: Deduct Credit & Start Cooldown
        await deductCredit();
        
        // Start 10s Cooldown
        setIsCooldown(true);
        setCooldownSeconds(10);
        
        // Clear any existing timer
        if (cooldownTimerRef.current) {
          clearInterval(cooldownTimerRef.current);
        }
        
        cooldownTimerRef.current = setInterval(() => {
          setCooldownSeconds(prev => {
            if (prev <= 1) {
              if (cooldownTimerRef.current) {
                clearInterval(cooldownTimerRef.current);
                cooldownTimerRef.current = null;
              }
              setIsCooldown(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } 
      // Paid Plan: Instant Access (No Cooldown)

    } catch (error: any) {
      setStatus(RewriteStatus.ERROR);
      setErrorMessage(error.message || "Generation failed. Try again.");
      setToastType('error');
      setToastMessage(error.message || "Generation failed. Try again.");
      
      // Auto-clear toast after 5 seconds
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleCopy = async () => {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error("Failed to copy", err); }
  };

  const handleExport = (format: 'txt' | 'md' | 'pdf' | 'json') => {
    if (!resultText) return;

    let content = resultText;
    let filename = `ghostnote_output_${new Date().toISOString().slice(0, 10)}`;
    let mimeType = 'text/plain';

    if (format === 'json') {
       filename += '.json';
       mimeType = 'application/json';
       content = JSON.stringify({
         content: resultText,
         timestamp: new Date().toISOString(),
         model: 'GhostNote AI'
       }, null, 2);
    } else if (format === 'pdf') {
       try {
          const doc = new jsPDF();
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 20;
          const maxLineWidth = pageWidth - margin * 2;
          const lineHeight = 7; 
          
          const lines = doc.splitTextToSize(resultText, maxLineWidth);
          
          let cursorY = margin;
          
          // Add Title
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.text("GhostNote Output", margin, cursorY);
          cursorY += 10;
          
          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");

          lines.forEach((line: string) => {
              if (cursorY + lineHeight > pageHeight - margin) {
                  doc.addPage();
                  cursorY = margin;
              }
              doc.text(line, margin, cursorY);
              cursorY += lineHeight;
          });
          
          doc.save(`${filename}.pdf`);
       } catch (e) {
          console.error("PDF Export failed", e);
       }
       setShowExportMenu(false);
       return;
    } else if (format === 'md') {
       filename += '.md';
       mimeType = 'text/markdown';
    } else {
       filename += '.txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setShowExportMenu(false);
  };

  const selectOptions = presets.map(p => ({ value: p.id, label: p.name }));

  return (
    <div className="flex flex-col min-h-screen lg:h-screen relative">
      <PricingModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={userPlan}
        onSelectPlan={handleUpgrade}
        onViewLegal={onViewLegal}
        initialBillingCycle={upgradeBillingCycle}
      />
      
      <AccountModal 
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
      />
      
      <TeamSettingsModal
        isOpen={showTeamSettingsModal}
        onClose={() => setShowTeamSettingsModal(false)}
      />
      
      {/* DNA Preview Modal */}
      <DnaPreviewModal
        isOpen={showDnaPreviewModal}
        onClose={() => setShowDnaPreviewModal(false)}
        onSave={async (name, urlIntensity) => {
          if (!user || !urlSourceData) return;
          
          try {
            // Save the preset with URL metadata
            const newPreset = await dbService.saveVoicePreset(
              user.id, 
              name, 
              urlSourceData.textContent
            );
            
            // Update with URL metadata
            const presetWithMeta = {
              ...newPreset,
              metadata: {
                source: 'url' as const,
                sourceUrl: urlSourceData.sourceUrl
              }
            };
            
            setPresets(prev => [...prev, presetWithMeta]);
            setSelectedPresetId(presetWithMeta.id);
            setReferenceText(presetWithMeta.referenceText);
            setShowDnaPreviewModal(false);
            setUrlSourceData(null);
            setShowUpgradeModal(false);
          } catch (e: any) {
            setErrorMessage(e.message || "Failed to save preset.");
          }
        }}
        sourceTitle={urlSourceData?.sourceTitle || ''}
        sourceUrl={urlSourceData?.sourceUrl || ''}
        textContent={urlSourceData?.textContent || ''}
        canSave={canAddMorePresets}
      />
      
      {/* Save Preset Modal */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
            <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-sm shadow-2xl">
                <h3 className="text-lg font-bold text-textMain mb-2">Save Voice Preset</h3>
                <p className="text-xs text-textMuted mb-4">Give your custom tone a name to save it for later.</p>
                {presetLimit !== -1 && (
                  <p className="text-xs text-textMuted mb-4">
                    <span className={customPresetCount >= presetLimit ? 'text-red-400' : 'text-accent'}>
                      {customPresetCount} / {presetLimit}
                    </span> custom presets used
                  </p>
                )}
                <input 
                    autoFocus
                    type="text" 
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="e.g. Friendly Marketing"
                    maxLength={50} // Enforce name length limit
                    className="w-full bg-background border border-border rounded-md p-3 text-textMain mb-4 focus:border-accent focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                />
                
                {/* Share with Team Toggle */}
                {team && (
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={shareWithTeam}
                                onChange={(e) => setShareWithTeam(e.target.checked)}
                                className="sr-only"
                            />
                            <div className={`w-10 h-5 rounded-full transition-colors ${shareWithTeam ? 'bg-accent' : 'bg-border'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${shareWithTeam ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </div>
                        </div>
                        <span className="text-sm text-textMuted">Share with team</span>
                    </label>
                )}
                
                <div className="flex gap-2 justify-end">
                    <button 
                        onClick={() => { setShowSavePresetModal(false); setShareWithTeam(false); }}
                        className="px-4 py-2 text-sm text-textMuted hover:text-white"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSavePreset}
                        disabled={!newPresetName.trim() || !canAddMorePresets}
                        className="px-4 py-2 bg-accent text-black rounded-md text-sm font-bold hover:bg-white disabled:opacity-50 transition-colors"
                    >
                        Save Preset
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Preset Modal */}
      {showDeletePresetModal && presetToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
            <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-sm shadow-2xl">
                <h3 className="text-lg font-bold text-red-400 mb-2">Delete Preset</h3>
                <p className="text-sm text-textMuted mb-6">Are you sure you want to delete "{presetToDelete.name}"? This action cannot be undone.</p>
                <div className="flex gap-2 justify-end">
                    <button 
                        onClick={() => {
                            setShowDeletePresetModal(false);
                            setPresetToDelete(null);
                        }}
                        className="px-4 py-2 text-sm text-textMuted hover:text-white"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleDeletePreset}
                        className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-bold hover:bg-red-400 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}


      {/* Prominent Error Banner */}
      {errorMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-fade-in-down">
            <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-md text-red-200 px-4 py-3 rounded-lg shadow-2xl flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-bold text-red-100">Error</p>
                    <p className="text-sm font-medium opacity-90 leading-tight mt-0.5">{errorMessage}</p>
                </div>
                <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white transition-colors p-1">
                    <X size={16} />
                </button>
            </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border h-16 flex items-center justify-between px-6 lg:px-8 bg-background z-20 sticky top-0 lg:relative">
        <div className="flex items-center gap-3 select-none cursor-pointer" onClick={onGoHome}>
          <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.2)]">
             <div className="w-2 h-2 bg-black rounded-full" />
          </div>
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-textMain hover:text-white transition-colors">GhostNote</h1>
        </div>

        <div className="flex items-center gap-6">
          {/* Credits Display (Echo Only) */}
          {userPlan === 'echo' && (
            <div className="hidden md:flex flex-col items-end">
               <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Daily Credits</span>
               <span className={`text-sm font-mono font-bold ${dailyCredits === 0 ? 'text-red-400' : 'text-accent'}`}>
                 {dailyCredits} / 10
               </span>
            </div>
          )}

          <div className="h-8 w-px bg-border hidden md:block" />

          {/* Plan Status & User Menu */}
          <div className="flex items-center gap-3">
             <TeamSwitcher onOpenTeamSettings={() => setShowTeamSettingsModal(true)} />
             <UserMenu 
                onOpenBilling={() => setShowUpgradeModal(true)} 
                onOpenAccount={() => setShowAccountModal(true)}
             />
             
             {userPlan !== 'syndicate' && (
               <button 
                onClick={() => setShowUpgradeModal(true)}
                className="bg-surface hover:bg-border border border-border text-xs font-bold px-4 py-2 rounded-md transition-all shadow-sm hover:text-white hidden sm:block"
               >
                 UPGRADE
               </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden lg:h-[calc(100vh-64px)]">
        
        {/* LEFT COLUMN */}
        <div className="flex-1 border-r border-border flex flex-col bg-background relative z-10 lg:h-auto min-h-[500px]">
          <div className="flex-1 lg:overflow-y-auto p-8 lg:p-12 scrollbar-hide">
            <div className="max-w-xl mx-auto flex flex-col gap-10">
              
              {/* TOP CONTROLS */}
              <div className="space-y-6">
                
                {/* Tone Preset */}
                {/* Style Mixer - Voice Mixing Interface */}
                <StyleMixer
                  presets={presets}
                  primaryVoiceId={baseVoiceId}
                  injections={activeInjections}
                  intensity={intensity}
                  onPrimaryVoiceChange={handleBaseVoiceChange}
                  onInjectionsChange={handleInjectionsChange}
                  onIntensityChange={setIntensity}
                />
                <div className="flex items-end gap-2">
                   <div className="flex-1">
                       <Select 
                          label="Tone Preset" 
                          options={selectOptions} 
                          value={selectedPresetId}
                          onChange={handlePresetChange}
                          disabled={activeTab === 'file'} 
                          className={activeTab === 'file' ? 'opacity-40' : ''}
                        />
                   </div>
                   <button 
                      onClick={() => setShowSavePresetModal(true)}
                      disabled={activeTab !== 'text' || !referenceText.trim() || !canAddMorePresets}
                      className="h-[46px] mb-[1px] px-4 flex items-center justify-center gap-2 bg-surface border border-border rounded-md text-sm font-bold text-textMuted hover:text-textMain hover:bg-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed group relative"
                   >
                      <Save size={16} />
                      <span className="hidden sm:inline">SAVE PRESET</span>
                      {!referenceText.trim() && activeTab === 'text' && (
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-border">
                              Add text to save
                          </div>
                      )}
                   </button>
                    {selectedPreset?.isCustom && (
                        <button
                            onClick={() => openDeleteConfirmation(selectedPreset)}
                            className="h-[46px] mb-[1px] px-3 flex items-center justify-center bg-surface border border-border rounded-md text-sm font-bold text-textMuted hover:text-red-400 hover:border-red-500/50 transition-colors"
                            title="Delete preset"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                {/* TABS & INPUT */}
                <div className="flex flex-col gap-4">
                   <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-textMuted uppercase tracking-widest pl-1">
                        Input Source
                      </label>
                      
                      {/* Tab Switcher */}
                      <div className="flex bg-surface p-1 rounded-md border border-border">
                        <button 
                          onClick={() => handleTabChange('text')}
                          className={`px-3 py-1.5 text-[10px] font-bold tracking-wider rounded transition-all ${activeTab === 'text' ? 'bg-background text-textMain shadow-sm border border-border/50' : 'text-textMuted hover:text-textMain'}`}
                        >
                          PASTE TEXT
                        </button>
                        
                        <div className="relative group">
                          <button 
                            onClick={() => handleTabChange('file')}
                            disabled={!isFileUnlocked}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-wider rounded transition-all ${activeTab === 'file' ? 'bg-background text-textMain shadow-sm border border-border/50' : 'text-textMuted'} ${!isFileUnlocked ? 'cursor-not-allowed opacity-50' : 'hover:text-textMain'}`}
                          >
                            {!isFileUnlocked && <Lock size={8} />} FILE
                          </button>
                          {!isFileUnlocked && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-black border border-border text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              Upgrade to Clone
                            </div>
                          )}
                        </div>

                        <div className="relative group">
                          <button 
                            onClick={() => handleTabChange('bulk')}
                            disabled={!isBulkUnlocked}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-wider rounded transition-all ${activeTab === 'bulk' ? 'bg-background text-textMain shadow-sm border border-border/50' : 'text-textMuted'} ${!isBulkUnlocked ? 'cursor-not-allowed opacity-50' : 'hover:text-textMain'}`}
                          >
                             {!isBulkUnlocked && <Lock size={8} />} BULK CSV
                          </button>
                          {!isBulkUnlocked && (
                            <div className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-black border border-border text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              Upgrade to Syndicate
                            </div>
                          )}
                        </div>
                        
                        <button 
                          onClick={() => handleTabChange('url')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-wider rounded transition-all ${activeTab === 'url' ? 'bg-background text-textMain shadow-sm border border-border/50' : 'text-textMuted hover:text-textMain'}`}
                        >
                          <Sparkles size={10} /> URL
                        </button>
                      </div>
                   </div>

                   {/* TAB CONTENT */}
                   {activeTab === 'text' && (
                      <textarea
                        value={referenceText}
                        onChange={(e) => setReferenceText(e.target.value)}
                        placeholder="// Paste existing content to match style..."
                        className="w-full bg-surface border border-border rounded-md p-5 text-textMain font-mono text-sm leading-relaxed placeholder-textMuted/30 focus:border-textMuted focus:outline-none transition-colors resize-none min-h-[160px]"
                        spellCheck={false}
                      />
                   )}

                   {activeTab === 'file' && (
                      <div className={`w-full min-h-[160px] bg-surface border-2 border-dashed rounded-md relative group transition-all duration-200 ${isDragging ? 'border-accent bg-accent/5' : 'border-border hover:border-textMuted/50 hover:bg-surface/80'}`}>
                         {!referenceFile ? (
                           <div 
                              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-6 text-center"
                              onDragOver={onDragOver}
                              onDragLeave={onDragLeave}
                              onDrop={onDrop}
                              onClick={() => fileInputRef.current?.click()}
                           >
                              <Upload className={`w-8 h-8 mb-4 transition-colors ${isDragging ? 'text-accent' : 'text-textMuted group-hover:text-textMain'}`} />
                              <p className="text-sm font-bold text-textMain mb-2">
                                  {isDragging ? "DROP TO UPLOAD" : "DRAG FILE OR CLICK"}
                              </p>
                              <div className="flex gap-2 justify-center mb-1">
                                   <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-textMuted font-mono">PDF</span>
                                   <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-textMuted font-mono">TXT</span>
                                   <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-textMuted font-mono">CSV</span>
                              </div>
                              <p className="text-[10px] text-textMuted/50 uppercase tracking-wide mt-1">MAX SIZE: 5MB</p>
                              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt,.csv" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
                           </div>
                         ) : (
                           <div className="absolute inset-0 flex items-center justify-center p-6">
                              <div className="w-full bg-background border border-border rounded-md p-4 flex items-center gap-3 relative">
                                 <div className="w-10 h-10 bg-surface rounded flex items-center justify-center border border-border text-accent">
                                    {referenceFile.mimeType.includes('pdf') ? <Paperclip size={18}/> : <FileText size={18}/>}
                                 </div>
                                 <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate text-textMain">{referenceFile.name}</p>
                                    <p className="text-[10px] text-textMuted font-mono uppercase mt-0.5">{referenceFile.mimeType.split('/')[1].toUpperCase()} • BRAND DNA</p>
                                 </div>
                                 <button onClick={(e) => { e.stopPropagation(); setReferenceFile(null); }} className="p-2 text-textMuted hover:text-red-400 transition-colors">
                                    <X size={16} />
                                 </button>
                              </div>
                           </div>
                         )}
                      </div>
                   )}

                   {activeTab === 'bulk' && (
                     <div className={`w-full min-h-[160px] bg-surface border border-border rounded-md relative group flex flex-col overflow-hidden transition-colors ${isDragging ? 'border-purple-500 bg-purple-900/10' : 'hover:border-purple-500/30'}`}>
                        {!bulkFile ? (
                           <div 
                              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-background to-background"
                              onDragOver={onDragOver}
                              onDragLeave={onDragLeave}
                              onDrop={onBulkDrop}
                              onClick={() => bulkInputRef.current?.click()}
                           >
                              <div className={`p-3 bg-surface border border-border rounded-lg mb-3 shadow-lg transition-transform ${isDragging ? 'scale-110 border-purple-500' : 'group-hover:scale-105 group-hover:border-purple-500/50'}`}>
                                 <Database className="w-6 h-6 text-purple-400" />
                              </div>
                              <p className="text-xs font-mono text-textMain mb-1 tracking-wide">
                                {isDragging ? "RELEASE DATASET" : "DROP DATASET CSV"}
                              </p>
                              <p className="text-[10px] text-purple-300/50 uppercase tracking-widest">Syndicate Engine Ready</p>
                              <input type="file" ref={bulkInputRef} className="hidden" accept=".csv" onChange={(e) => { if (e.target.files?.[0]) handleBulkUpload(e.target.files[0]); }} />
                           </div>
                        ) : (
                           <div className="p-4 flex flex-col h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/10 via-background to-background">
                              <div className="flex items-center justify-between mb-4">
                                 <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                    <Database size={10} /> Active Dataset
                                 </span>
                                 <span className="text-[10px] font-mono text-textMuted">1 FILE LOADED</span>
                              </div>
                              
                              <div className="flex items-center gap-3 p-3 bg-surface/50 border border-purple-500/30 rounded-md relative overflow-hidden">
                                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                                 <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-purple-400">
                                    <FileSpreadsheet size={16} />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-textMain truncate">{bulkFile.name}</p>
                                    <p className="text-[10px] text-textMuted font-mono">{bulkFile.size}</p>
                                 </div>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); setBulkFile(null); }}
                                    className="p-2 text-textMuted hover:text-red-400 transition-colors"
                                 >
                                    <Trash2 size={14} />
                                 </button>
                              </div>
                              
                              <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-mono text-textMuted/50">
                                 <span>STATUS: STAGED</span>
                                 <span className="text-purple-400">WAITING FOR EXECUTION</span>
                              </div>
                           </div>
                        )}
                     </div>
                   )}

                   {activeTab === 'url' && (
                     <div className="w-full min-h-[160px]">
                       <UrlImportCard 
                         onScrapeSuccess={(data) => {
                           setUrlSourceData(data);
                           setReferenceText(data.textContent);
                           setShowDnaPreviewModal(true);
                         }}
                       />
                     </div>
                   )}

                </div>
                
                {/* TONE SLIDER (Clone+) */}
                {userPlan !== 'echo' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <div className="group relative">
                        <label className="text-xs font-semibold text-textMuted uppercase tracking-widest pl-1 cursor-help">
                          Mimicry Intensity
                        </label>
                        <div className="absolute bottom-full left-0 mb-2 w-64 px-3 py-2 bg-black border border-border text-white text-[11px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed shadow-lg">
                          Controls adherence to source syntax vs. creative freedom.
                          <div className="mt-1 text-textMuted">Low% = More creative, loosely inspired.<br/>High% = Strictly follows your style patterns.</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-accent">{intensity}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={intensity}
                      onChange={(e) => setIntensity(parseInt(e.target.value))}
                      className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-sm"
                    />
                  </div>
                )}
              </div>

              <div className="h-px bg-border w-full" />

              {/* Draft Input */}
              {activeTab !== 'bulk' && (
                <div className="flex-1 flex flex-col min-h-[200px]">
                  <TextArea
                    label="Raw Draft"
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="// Paste your rough draft here..."
                    className="flex-1 min-h-[200px]"
                  />
                </div>
              )}
              {activeTab === 'bulk' && (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] border border-dashed border-border rounded-md opacity-50">
                     <p className="text-xs font-mono text-textMuted">Draft Input Disabled in Bulk Mode</p>
                  </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-8 border-t border-border bg-background">
            <div className="max-w-xl mx-auto flex flex-col gap-4">
              <Button 
                onClick={handleRewrite} 
                isLoading={status === RewriteStatus.LOADING}
                spinnerClass={isPaidPlan ? "text-yellow-400" : "text-current"} // Gold spinner for paid plans
                variant="primary"
                className="w-full transition-opacity duration-300"
                disabled={(!hasCredits && userPlan === 'echo') || isCooldown}
              >
                {isCooldown ? (
                    <span className="flex items-center gap-2 text-textMuted">
                        COOLING DOWN... ({cooldownSeconds}s)
                    </span>
                ) : (!status || status !== RewriteStatus.LOADING ? (
                   <span className="flex items-center gap-2">
                     {!hasCredits ? "DAILY LIMIT REACHED" : (activeTab === 'bulk' ? "PROCESS DATASET (MAX 5)" : "RUN TRANSFORMATION")} 
                     {hasCredits && <ArrowRight size={16} />}
                   </span>
                ) : null)}
              </Button>
              
              {!hasCredits && userPlan === 'echo' && (
                 <p className="text-center text-xs text-textMuted">
                    <button onClick={() => setShowUpgradeModal(true)} className="text-accent hover:underline">Upgrade to Clone</button> for unlimited generations.
                 </p>
              )}
            </div>
             
             {/* Dashboard Footer with Legal Links */}
             <div className="mt-8 text-center">
               <div className="flex justify-center gap-6 text-xs text-textMuted/50">
                  <button onClick={() => onViewLegal('terms')} className="hover:text-textMuted transition-colors">Terms of Service</button>
                  <button onClick={() => onViewLegal('privacy')} className="hover:text-textMuted transition-colors">Privacy Policy</button>
               </div>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-1 bg-surface flex flex-col relative lg:overflow-hidden min-h-[50vh] lg:min-h-0">
          {/* Output Toolbar */}
          <div className="h-14 border-b border-border flex items-center justify-between px-8 bg-surface">
            <div className="text-xs font-bold text-textMuted uppercase tracking-widest flex items-center gap-2">
              <Command size={14} /> Output
            </div>
            {resultText && (
              <div className="flex items-center gap-2">
                 {bulkDownloadUrl && (
                    <a 
                       href={bulkDownloadUrl}
                       download="ghostnote_report.csv"
                       className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors"
                    >
                       <Download size={14} /> REPORT
                    </a>
                 )}
                 
                 {/* Export Dropdown */}
                 <div className="relative" ref={exportMenuRef}>
                    <button 
                       onClick={() => setShowExportMenu(!showExportMenu)}
                       className="bg-background hover:bg-border border border-border text-textMain text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors"
                    >
                       EXPORT <ChevronDown size={14} />
                    </button>
                    
                    {showExportMenu && (
                      <div className="absolute top-full right-0 mt-2 w-32 bg-background border border-border rounded-md shadow-xl z-50 flex flex-col py-1 animate-fade-in-up">
                          <button onClick={() => handleExport('txt')} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-textMuted hover:text-textMain hover:bg-surface text-left">
                              <FileType size={12} /> Text (.txt)
                          </button>
                          <button onClick={() => handleExport('md')} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-textMuted hover:text-textMain hover:bg-surface text-left">
                              <FileCode size={12} /> Markdown (.md)
                          </button>
                          <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-textMuted hover:text-textMain hover:bg-surface text-left">
                              <FileText size={12} /> PDF (.pdf)
                          </button>
                          <button onClick={() => handleExport('json')} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-textMuted hover:text-textMain hover:bg-surface text-left">
                              <FileJson size={12} /> JSON (.json)
                          </button>
                      </div>
                    )}
                 </div>

                 <button 
                    onClick={handleCopy}
                    className="bg-background hover:bg-border border border-border text-textMain text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors"
                 >
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "COPIED" : "COPY"}
                 </button>
              </div>
            )}
          </div>
          
          {/* Output Area */}
          <div className="flex-1 relative">
             <div className="absolute inset-0 p-8 lg:p-12 overflow-y-auto">
                {status === RewriteStatus.LOADING ? (
                   <div className="h-full flex flex-col items-center justify-center text-textMuted animate-pulse">
                      <div className="w-12 h-12 border-2 border-border border-t-accent rounded-full animate-spin mb-4" />
                      <p className="text-sm font-bold tracking-widest uppercase">{loadingMessage}</p>
                   </div>
                ) : resultText ? (
                   <div className="prose prose-invert prose-p:text-textMain prose-headings:text-textMain max-w-none">
                      <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{resultText}</p>
                   </div>
                ) : (
                   <div className="h-full flex flex-col items-center justify-center text-textMuted opacity-20 select-none">
                      <div className="w-24 h-24 border-2 border-current rounded-full flex items-center justify-center mb-6">
                         <div className="w-3 h-3 bg-current rounded-full" />
                      </div>
                      <p className="text-xl font-bold uppercase tracking-[0.2em]">Awaiting Input</p>
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className={`fixed bottom-6 left-6 max-w-sm p-4 rounded-lg shadow-lg animate-fade-in-up flex items-center gap-3 ${
            toastType === 'error' 
              ? 'bg-red-900/80 border border-red-700 text-red-100' 
              : 'bg-green-900/80 border border-green-700 text-green-100'
          }`}>
            {toastType === 'error' && <AlertCircle size={20} className="flex-shrink-0" />}
            {toastType === 'success' && <Check size={20} className="flex-shrink-0" />}
            <p className="text-sm">{toastMessage}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
