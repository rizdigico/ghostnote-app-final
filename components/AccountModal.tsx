import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, User as UserIcon, Mail, Calendar, Shield, LifeBuoy, Code, Copy, Check, ExternalLink, Lock, Zap, AlertCircle, CreditCard, RefreshCw, Clock } from 'lucide-react';
import { useAuth } from '../AuthContext';
import ApiDocsViewer from './ApiDocsViewer';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'profile' | 'subscription' | 'support' | 'developers';

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const { user, deleteAccount, generateApiKey, authError, cancelSubscription, resumeSubscription } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  
  // Profile State
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  // Developer State
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  
  // Subscription State
  const [isCancelling, setIsCancelling] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteAccount();
  };

  const handleGenerateKey = async () => {
    setIsGeneratingKey(true);
    try {
        await generateApiKey();
    } catch (e) {
        console.error(e);
    } finally {
        setIsGeneratingKey(false);
    }
  };

  const handleCopyKey = () => {
    if (user.apiKey) {
        navigator.clipboard.writeText(user.apiKey);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const TabButton: React.FC<{ id: TabType; icon: React.ElementType; label: string }> = ({ id, icon: Icon, label }) => (
    <button 
        onClick={() => { setActiveTab(id); setShowConfirmDelete(false); }}
        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
            activeTab === id 
                ? 'bg-surface border-accent text-white' 
                : 'border-transparent text-textMuted hover:bg-surface/50 hover:text-white'
        }`}
    >
        <Icon size={16} />
        {label}
    </button>
  );

  return (
    <>
    {showDocs && <ApiDocsViewer onClose={() => setShowDocs(false)} />}
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
        <div className="relative w-full max-w-4xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px] max-h-[90vh]">
            
            {/* CLOSE BUTTON */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-textMuted hover:text-white transition-colors z-20 md:hidden"
            >
                <X size={20} />
            </button>

            {/* SIDEBAR */}
            <div className="w-full md:w-64 bg-background border-b md:border-b-0 md:border-r border-border flex flex-col">
                <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-bold text-textMain">Settings</h2>
                    <p className="text-xs text-textMuted">Manage your account preferences</p>
                </div>
                <div className="flex-1 py-2">
                    <TabButton id="profile" icon={UserIcon} label="My Profile" />
                    <TabButton id="subscription" icon={CreditCard} label="Subscription" />
                    <TabButton id="support" icon={LifeBuoy} label="Support" />
                    <TabButton id="developers" icon={Code} label="Developers" />
                </div>
                <div className="p-4 border-t border-border hidden md:block">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-textMuted">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold text-textMain truncate">{user.name}</p>
                            <p className="text-[10px] text-textMuted truncate">{user.email}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 bg-surface/30 overflow-y-auto relative p-6 md:p-10">
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-textMuted hover:text-white transition-colors hidden md:block"
                >
                    <X size={20} />
                </button>

                {/* --- PROFILE TAB --- */}
                {activeTab === 'profile' && (
                    <div className="max-w-xl animate-fade-in-up">
                        <h3 className="text-2xl font-bold text-textMain mb-6">Profile Settings</h3>
                        
                        {!showConfirmDelete ? (
                            <>
                                <div className="space-y-6 mb-12">
                                    <div>
                                        <label className="text-xs font-bold text-textMuted uppercase tracking-wider block mb-2">Full Name</label>
                                        <div className="flex items-center gap-3 p-3 rounded-md bg-background border border-border">
                                            <UserIcon size={16} className="text-textMuted" />
                                            <span className="text-sm text-textMain">{user.name}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-textMuted uppercase tracking-wider block mb-2">Email Address</label>
                                        <div className="flex items-center gap-3 p-3 rounded-md bg-background border border-border">
                                            <Mail size={16} className="text-textMuted" />
                                            <span className="text-sm text-textMain">{user.email}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-textMuted uppercase tracking-wider block mb-2">Current Plan</label>
                                            <div className="flex items-center gap-3 p-3 rounded-md bg-background border border-border">
                                                <Shield size={16} className="text-textMuted" />
                                                <span className="text-sm text-textMain capitalize">{user.plan}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-textMuted uppercase tracking-wider block mb-2">Member Since</label>
                                            <div className="flex items-center gap-3 p-3 rounded-md bg-background border border-border">
                                                <Calendar size={16} className="text-textMuted" />
                                                <span className="text-sm text-textMain">{new Date(user.joinedDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-border">
                                    <h4 className="text-sm font-bold text-red-400 mb-2">Danger Zone</h4>
                                    <div className="flex items-center justify-between p-4 border border-red-500/20 bg-red-500/5 rounded-lg">
                                        <div>
                                            <p className="text-sm font-bold text-textMain">Delete Account</p>
                                            <p className="text-xs text-textMuted">Permanently remove your account and all data.</p>
                                        </div>
                                        <button 
                                            onClick={() => setShowConfirmDelete(true)}
                                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded text-xs font-bold transition-all"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-8 text-center animate-fade-in-up">
                                {authError && (
                                    <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-3">
                                        <AlertCircle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-orange-200 text-left">{authError}</p>
                                    </div>
                                )}
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                                    <AlertTriangle size={32} />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Are you absolutely sure?</h2>
                                <p className="text-sm text-textMuted mb-8 leading-relaxed max-w-sm mx-auto">
                                    This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                                </p>
                                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                                    <button 
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {isDeleting ? "Deleting..." : "Yes, delete my account"}
                                    </button>
                                    <button 
                                        onClick={() => setShowConfirmDelete(false)}
                                        disabled={isDeleting}
                                        className="w-full py-3 bg-surface border border-border text-textMuted hover:text-white font-bold rounded-md transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- SUBSCRIPTION TAB --- */}
                {activeTab === 'subscription' && (
                    <div className="max-w-xl animate-fade-in-up">
                        <h3 className="text-2xl font-bold text-textMain mb-6">Subscription</h3>
                        
                        {/* Show for paid plans (clone/syndicate) */}
                        {user.plan !== 'echo' ? (
                            <>
                                {/* Current Plan Card */}
                                <div className="mb-6 p-6 rounded-xl border bg-surface/50">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                                                <Shield size={24} className="text-accent" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-white capitalize">{user.plan} Plan</h4>
                                                <p className="text-xs text-textMuted capitalize">{user.billingCycle || 'monthly'} billing</p>
                                            </div>
                                        </div>
                                        {user.cancelAtPeriodEnd && (
                                            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-bold rounded-full flex items-center gap-1">
                                                <AlertTriangle size={12} />
                                                Ending
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Period End Info */}
                                    {user.currentPeriodEnd && (
                                        <div className="flex items-center gap-2 text-sm text-textMuted mb-4 p-3 bg-background rounded-lg">
                                            <Clock size={16} />
                                            <span>
                                                {user.cancelAtPeriodEnd 
                                                    ? `Access ends on ${new Date(user.currentPeriodEnd).toLocaleDateString()}`
                                                    : `Next billing date: ${new Date(user.currentPeriodEnd).toLocaleDateString()}`}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Payment Warning */}
                                    {user.paymentWarning && (
                                        <div className="flex items-start gap-2 text-sm text-orange-200 mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold">Payment issue detected</p>
                                                <p className="text-xs">Please update your payment method to avoid service interruption.</p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Cancel/Resume Button */}
                                    {!showConfirmCancel ? (
                                        <div className="flex gap-3">
                                            {user.cancelAtPeriodEnd ? (
                                                <button
                                                    onClick={() => setShowConfirmCancel(true)}
                                                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-md flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <RefreshCw size={16} />
                                                    Resume Subscription
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setShowConfirmCancel(true)}
                                                    className="flex-1 py-3 bg-red-600/20 hover:bg-red-600 text-red-400 font-bold rounded-md flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    Cancel Subscription
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="border border-border rounded-lg p-4 bg-background">
                                            {subscriptionError && (
                                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-200">
                                                    {subscriptionError}
                                                </div>
                                            )}
                                            
                                            {user.cancelAtPeriodEnd ? (
                                                <>
                                                    <p className="text-sm text-textMain mb-4">
                                                        Are you sure you want to resume your subscription? You'll continue being billed and have full access.
                                                    </p>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={async () => {
                                                                setIsCancelling(true);
                                                                setSubscriptionError(null);
                                                                try {
                                                                    await resumeSubscription();
                                                                    setShowConfirmCancel(false);
                                                                } catch (err: any) {
                                                                    setSubscriptionError(err.message || 'Failed to resume subscription');
                                                                } finally {
                                                                    setIsCancelling(false);
                                                                }
                                                            }}
                                                            disabled={isCancelling}
                                                            className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-md transition-colors disabled:opacity-50"
                                                        >
                                                            {isCancelling ? 'Resuming...' : 'Yes, Resume'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setShowConfirmCancel(false);
                                                                setSubscriptionError(null);
                                                            }}
                                                            disabled={isCancelling}
                                                            className="flex-1 py-2 bg-surface border border-border text-textMuted hover:text-white font-bold rounded-md transition-colors"
                                                        >
                                                            Keep Canceled
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-textMain mb-4">
                                                        Are you sure you want to cancel? You'll keep access until {user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toLocaleDateString() : 'the end of your billing period'}.
                                                    </p>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={async () => {
                                                                setIsCancelling(true);
                                                                setSubscriptionError(null);
                                                                try {
                                                                    await cancelSubscription();
                                                                    setShowConfirmCancel(false);
                                                                } catch (err: any) {
                                                                    setSubscriptionError(err.message || 'Failed to cancel subscription');
                                                                } finally {
                                                                    setIsCancelling(false);
                                                                }
                                                            }}
                                                            disabled={isCancelling}
                                                            className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-md transition-colors disabled:opacity-50"
                                                        >
                                                            {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setShowConfirmCancel(false);
                                                                setSubscriptionError(null);
                                                            }}
                                                            disabled={isCancelling}
                                                            className="flex-1 py-2 bg-surface border border-border text-textMuted hover:text-white font-bold rounded-md transition-colors"
                                                        >
                                                            Keep Subscription
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="text-xs text-textMuted">
                                    <p>Need to change your plan? Contact support or upgrade through the pricing page.</p>
                                </div>
                            </>
                        ) : (
                            /* Echo (Free) Plan */
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 text-textMuted">
                                    <Shield size={32} />
                                </div>
                                <h4 className="text-xl font-bold text-white mb-2">You're on the Echo Plan</h4>
                                <p className="text-sm text-textMuted mb-6">
                                    Upgrade to Clone or Syndicate to unlock premium features.
                                </p>
                                <button className="px-6 py-3 bg-accent hover:bg-accent/80 text-white font-bold rounded-md transition-colors">
                                    View Plans
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* --- SUPPORT TAB --- */}
                {activeTab === 'support' && (
                    <div className="max-w-xl animate-fade-in-up">
                        <h3 className="text-2xl font-bold text-textMain mb-6">Support Center</h3>
                        
                        {user.plan === 'syndicate' ? (
                            <div className="mb-8 p-6 rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-transparent relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <Zap size={80} className="text-yellow-500" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="px-2 py-1 bg-yellow-500 text-black text-[10px] font-bold uppercase rounded flex items-center gap-1">
                                            <Zap size={10} fill="currentColor" /> Syndicate VIP
                                        </div>
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">Priority Concierge Access</h4>
                                    <p className="text-sm text-gray-300 mb-6 leading-relaxed max-w-sm">
                                        Skip the queue. As a Syndicate member, you have direct access to our founders for onboarding and technical reviews.
                                    </p>
                                    <button 
                                        onClick={() => window.open('https://calendly.com/rizdigi-co/30min', '_blank')}
                                        className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-md text-sm flex items-center gap-2 transition-colors"
                                    >
                                        Book Concierge Call <ExternalLink size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-8 p-6 rounded-xl border border-border bg-surface relative overflow-hidden">
                                <h4 className="text-lg font-bold text-textMain mb-2">Standard Support</h4>
                                <p className="text-sm text-textMuted mb-4">Need help? Check our FAQs or contact support.</p>
                                <div className="text-xs text-textMuted p-3 bg-background rounded border border-border inline-block">
                                    Upgrade to <strong>Syndicate</strong> for 1:1 Founder Support.
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-bold text-textMain mb-2">Contact Us</h4>
                                <p className="text-sm text-textMuted mb-4">
                                    For general inquiries, bugs, or feature requests.
                                </p>
                                <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Mail size={18} className="text-textMuted" />
                                        <div>
                                            <p className="text-sm font-medium text-textMain">rizdigi.co@gmail.com</p>
                                            {user.plan === 'syndicate' && (
                                                <p className="text-[10px] text-yellow-500 font-bold flex items-center gap-1 mt-0.5">
                                                    <Zap size={8} fill="currentColor" /> Priority Support Active
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <a href="mailto:rizdigi.co@gmail.com" className="text-xs font-bold text-accent hover:underline">
                                        Send Email
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- DEVELOPERS TAB --- */}
                {activeTab === 'developers' && (
                    <div className="max-w-xl animate-fade-in-up">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-textMain">GhostNote API</h3>
                            {user.plan === 'syndicate' && <div className="px-2 py-1 bg-surface border border-border rounded text-[10px] text-textMuted font-mono">v1.0.0</div>}
                        </div>

                        {user.plan !== 'syndicate' ? (
                            <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-border rounded-xl bg-surface/20 text-center">
                                <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mb-4 text-textMuted">
                                    <Lock size={20} />
                                </div>
                                <h4 className="text-lg font-bold text-textMain mb-2">Developer Access Locked</h4>
                                <p className="text-sm text-textMuted mb-6 max-w-sm">
                                    API access is exclusively available to Syndicate members. Integrate GhostNote's rewriting engine directly into your CMS.
                                </p>
                                <button className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-md text-sm transition-colors opacity-50 cursor-not-allowed">
                                    Upgrade to Syndicate
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div>
                                    <p className="text-sm text-textMuted mb-6">
                                        Integrate GhostNote's rewriting engine directly into your internal tools or CMS. 
                                        Authentication is performed via Bearer token.
                                    </p>

                                    <div className="bg-black/50 border border-border rounded-lg p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-xs font-bold text-textMuted uppercase tracking-wider">Your API Secret Key</label>
                                            {user.apiKey && <span className="text-[10px] text-green-400 font-mono">ACTIVE</span>}
                                        </div>
                                        
                                        {user.apiKey ? (
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <div className="flex-1 bg-surface border border-border rounded px-3 py-2 font-mono text-sm text-textMain truncate select-all">
                                                        {user.apiKey}
                                                    </div>
                                                    <button 
                                                        onClick={handleCopyKey}
                                                        className="p-2 bg-surface border border-border rounded hover:bg-border transition-colors text-textMuted hover:text-white"
                                                        title="Copy Key"
                                                    >
                                                        {copiedKey ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                                                    </button>
                                                </div>
                                                <div className="flex items-start gap-2 text-yellow-500/80 text-xs bg-yellow-500/5 p-3 rounded border border-yellow-500/10">
                                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                                    <p>Save this key securely. It allows full access to your plan's generation credits.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <button 
                                                    onClick={handleGenerateKey}
                                                    disabled={isGeneratingKey}
                                                    className="px-4 py-2 bg-surface border border-border hover:bg-border text-textMain font-bold rounded text-sm transition-colors flex items-center gap-2 mx-auto"
                                                >
                                                    {isGeneratingKey ? (
                                                        <span className="w-4 h-4 border-2 border-textMuted border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <Code size={16} />
                                                    )}
                                                    Generate New API Key
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-textMain mb-3">Usage Limits & Documentation</h4>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="p-4 bg-surface/50 border border-border rounded-lg">
                                            <p className="text-xs text-textMuted uppercase tracking-wider mb-1">Rate Limit</p>
                                            <p className="text-lg font-mono text-textMain">500 req/min</p>
                                        </div>
                                        <div className="p-4 bg-surface/50 border border-border rounded-lg">
                                            <p className="text-xs text-textMuted uppercase tracking-wider mb-1">Status</p>
                                            <p className="text-lg font-mono text-green-400">Operational</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowDocs(true)}
                                        className="flex items-center gap-2 text-sm text-accent hover:underline"
                                    >
                                        View Documentation <ExternalLink size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    </div>
    </>
  );
};

export default AccountModal;