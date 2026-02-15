import React from 'react';
import { Database, Search, Filter, Star, Clock, User } from 'lucide-react';

const LibraryPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
          <Database className="w-12 h-12 text-blue-500" />
        </div>

        {/* Badge */}
        <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-4">
          Coming Q4 2026
        </span>

        {/* Title */}
        <h1 className="text-2xl font-bold text-textMain mb-3">Voice Library</h1>

        {/* Description */}
        <p className="text-textMuted mb-8">
          Your personal repository of voice profiles. Save, organize, and manage 
          your custom voice presets and templates.
        </p>

        {/* Features Preview */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="bg-surface border border-border rounded-lg p-4 text-left">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-yellow-500" />
              <div>
                <h3 className="text-sm font-medium text-textMain">Favorite Presets</h3>
                <p className="text-xs text-textMuted mt-1">Quick access to your best voices</p>
              </div>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4 text-left">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-medium text-textMain">Recent History</h3>
                <p className="text-xs text-textMuted mt-1">Recently used voices</p>
              </div>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4 text-left">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-green-500" />
              <div>
                <h3 className="text-sm font-medium text-textMain">Team Shared</h3>
                <p className="text-xs text-textMuted mt-1">Voices shared with your team</p>
              </div>
            </div>
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

export default LibraryPage;
