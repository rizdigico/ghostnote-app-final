import React from 'react';
import { Users, Shield, MessageSquare, Settings, Bell } from 'lucide-react';

const TeamPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6">
          <Users className="w-12 h-12 text-purple-500" />
        </div>

        {/* Badge */}
        <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-4">
          Coming Q4 2026
        </span>

        {/* Title */}
        <h1 className="text-2xl font-bold text-textMain mb-3">Team Management</h1>

        {/* Description */}
        <p className="text-textMuted mb-8">
          Collaborate with your team. Manage roles, permissions, and shared 
          resources across your organization.
        </p>

        {/* Features Preview */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-surface border border-border rounded-lg p-4 text-left">
            <Users className="w-5 h-5 text-primary mb-2" />
            <h3 className="text-sm font-medium text-textMain">Members</h3>
            <p className="text-xs text-textMuted mt-1">Invite and manage</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4 text-left">
            <Shield className="w-5 h-5 text-primary mb-2" />
            <h3 className="text-sm font-medium text-textMain">Roles</h3>
            <p className="text-xs text-textMuted mt-1">Permission levels</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4 text-left">
            <MessageSquare className="w-5 h-5 text-primary mb-2" />
            <h3 className="text-sm font-medium text-textMain">Comments</h3>
            <p className="text-xs text-textMuted mt-1">Collaborate on content</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4 text-left">
            <Settings className="w-5 h-5 text-primary mb-2" />
            <h3 className="text-sm font-medium text-textMain">Settings</h3>
            <p className="text-xs text-textMuted mt-1">Team configuration</p>
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

export default TeamPage;
