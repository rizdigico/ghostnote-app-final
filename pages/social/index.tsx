import React from 'react';
import { Rocket, Calendar, Clock, BarChart3 } from 'lucide-react';

const SocialPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Rocket className="w-12 h-12 text-orange-500" />
        </div>

        {/* Badge */}
        <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-4">
          Coming Q4 2026
        </span>

        {/* Title */}
        <h1 className="text-2xl font-bold text-textMain mb-3">Social Scheduler</h1>

        {/* Description */}
        <p className="text-textMuted mb-8">
          Schedule and automate your content across social media platforms. 
          Plan your posts, track engagement, and grow your audience.
        </p>

        {/* Features Preview */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-surface border border-border rounded-lg p-4 text-left">
            <Calendar className="w-5 h-5 text-primary mb-2" />
            <h3 className="text-sm font-medium text-textMain">Calendar View</h3>
            <p className="text-xs text-textMuted mt-1">Plan content in advance</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4 text-left">
            <BarChart3 className="w-5 h-5 text-primary mb-2" />
            <h3 className="text-sm font-medium text-textMain">Analytics</h3>
            <p className="text-xs text-textMuted mt-1">Track performance</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4 text-left">
            <Clock className="w-5 h-5 text-primary mb-2" />
            <h3 className="text-sm font-medium text-textMain">Auto-Post</h3>
            <p className="text-xs text-textMuted mt-1">Schedule and forget</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4 text-left">
            <Rocket className="w-5 h-5 text-primary mb-2" />
            <h3 className="text-sm font-medium text-textMain">Viral Tips</h3>
            <p className="text-xs text-textMuted mt-1">AI-powered suggestions</p>
          </div>
        </div>

        {/* Notify Me */}
        <button className="px-6 py-3 bg-surface border border-border text-textMain rounded-lg hover:border-primary hover:text-primary transition-colors">
          Get notified when available
        </button>
      </div>
    </div>
  );
};

export default SocialPage;
