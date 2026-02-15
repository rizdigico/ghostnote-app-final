# GhostNote Platform Architecture: App Shell + Repurpose Engine

**Project:** GhostNote SaaS - Ecosystem Expansion  
**Version:** 1.0  
**Date:** 2026-02-15  
**Status:** ARCHITECTURE PLAN  

---

## Executive Summary

This document outlines the architectural plan for transforming GhostNote from a single-page tool into a multi-product platform with persistent navigation and a new "Voice Memo to Viral" workflow.

### Key Objectives
1. **App Shell**: Implement a responsive layout with persistent sidebar navigation
2. **Studio Migration**: Refactor the current dashboard into a dedicated "Studio" tab
3. **Repurpose Engine**: Build the Voice Memo to Viral workflow in a new "Repurpose" tab

---

## Phase 1: App Shell Architecture

### 1.1 Layout Structure

#### Desktop Layout (`layouts/AppShell.tsx`)
```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (w-64)  │           MAIN CONTENT                  │
│  ┌─────────────┐ │  ┌─────────────────────────────────────┐ │
│  │   LOGO      │ │  │                                     │ │
│  │  GhostNote  │ │  │                                     │ │
│  ├─────────────┤ │  │       Page Content                 │ │
│  │             │ │  │       (Studio/Repurpose/            │ │
│  │   NAV       │ │  │        Social/Library/Team)        │ │
│  │  - Studio   │ │  │                                     │ │
│  │  - Repurpose│ │  │                                     │ │
│  │  - Social   │ │  │                                     │ │
│  │  - Library  │ │  │                                     │ │
│  │  - Team     │ │  │                                     │ │
│  │             │ │  │                                     │ │
│  ├─────────────┤ │  └─────────────────────────────────────┘ │
│  │   USER      │ │                                           │
│  │  Profile    │ │                                           │
│  │  Logout     │ │                                           │
│  └─────────────┘ │                                           │
└─────────────────────────────────────────────────────────────┘
```

#### Mobile Layout
```
┌─────────────────────────────┐
│  HEADER (md:hidden)         │
│  ☰  GhostNote              │
├─────────────────────────────┤
│                             │
│       Page Content          │
│                             │
│                             │
└─────────────────────────────┘
```

### 1.2 Component Specifications

#### AppShell Component (`layouts/AppShell.tsx`)

| Property | Specification |
|----------|---------------|
| Desktop Sidebar Width | `w-64` (256px) |
| Mobile Breakpoint | `md:flex` (hidden below 768px) |
| Mobile Header | `md:hidden` |
| Main Content | `flex-1 h-screen overflow-y-auto` |
| Z-Index Layering | Sidebar: z-50, Mobile Menu: z-40 |

**Component Interface:**
```typescript
interface AppShellProps {
  children: React.ReactNode;
  currentRoute: string;
  onNavigate: (route: string) => void;
  user: User | null;
  onLogout: () => void;
}
```

#### Navigation Configuration (`config/navigation.ts`)

```typescript
import { PenTool, RefreshCw, Rocket, Database, Users } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'studio', label: 'Studio', path: '/studio', icon: PenTool },
  { id: 'repurpose', label: 'Repurpose', path: '/repurpose', icon: RefreshCw },
  { id: 'social', label: 'Social', path: '/social', icon: Rocket, comingSoon: true },
  { id: 'library', label: 'Library', path: '/library', icon: Database, comingSoon: true },
  { id: 'team', label: 'Team', path: '/team', icon: Users, comingSoon: true },
];
```

### 1.3 Sidebar Navigation Design

#### Active State Styling
```css
/* Active nav item */
.bg-primary/10 text-primary

/* Hover state */
hover:bg-primary/5 hover:text-primary
```

#### User Profile Section
- Avatar (40px circle)
- User name (truncated if > 12 chars)
- Plan badge (Echo/Clone/Syndicate)
- Logout button

### 1.4 Mobile Drawer Implementation

Using a slide-over pattern (Sheet/Drawer component):
- Trigger: Hamburger button in mobile header
- Animation: Slide in from left (300ms ease)
- Backdrop: Semi-transparent overlay
- Close: Click outside or swipe left

---

## Phase 2: Studio Migration

### 2.1 Migration Strategy

#### Current State
- Dashboard component at `components/Dashboard.tsx`
- Routes handled via state-based view system in `App.tsx`
- Single view: `'app'` → renders `<Dashboard />`

#### Target State
- Dashboard content moved to `pages/studio/index.tsx`
- AppShell wraps all authenticated pages
- URL-based routing: `/studio`, `/repurpose`, etc.

### 2.2 Implementation Steps

#### Step 1: Create Page Components
```
pages/
├── studio/
│   └── index.tsx      # Current Dashboard content
├── repurpose/
│   └── index.tsx      # Voice Memo workflow
├── social/
│   └── index.tsx      # Coming Soon placeholder
├── library/
│   └── index.tsx      # Coming Soon placeholder
└── team/
    └── index.tsx      # Coming Soon placeholder
```

#### Step 2: Update App.tsx Routing

Replace state-based routing with URL-based approach:
```typescript
// Current (state-based)
const [currentView, setCurrentView] = useState<ViewState>('landing');

// New (URL-based)
const [currentPath, setCurrentPath] = useState(window.location.pathname);

// Route mapping
const getRouteComponent = (path: string) => {
  switch (path) {
    case '/studio': return <StudioPage />;
    case '/repurpose': return <RepurposePage />;
    case '/social': return <SocialPage />;
    case '/library': return <LibraryPage />;
    case '/team': return <TeamPage />;
    default: return <Navigate to="/studio" />;
  }
};
```

#### Step 3: Studio Page Structure

The migrated Studio page should maintain all existing functionality:
- All state management (presets, text, files)
- All modals (pricing, account, team settings)
- All handlers and effects
- Same UI layout with sidebar integration

### 2.3 Placeholder Pages

#### Social Page (`pages/social/index.tsx`)
```tsx
import { Rocket } from 'lucide-react';

export default function SocialPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Rocket className="w-16 h-16 text-primary mb-4" />
      <h2 className="text-xl font-semibold">Social Scheduler</h2>
      <p className="text-textMuted mt-2">Coming Q4 2026</p>
      <p className="text-sm text-textMuted mt-1">
        Schedule and automate your content across platforms
      </p>
    </div>
  );
}
```

#### Library Page (`pages/library/index.tsx`)
```tsx
import { Database } from 'lucide-react';

export default function LibraryPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Database className="w-16 h-16 text-primary mb-4" />
      <h2 className="text-xl font-semibold">Voice Library</h2>
      <p className="text-textMuted mt-2">Coming Q4 2026</p>
    </div>
  );
}
```

#### Team Page (`pages/team/index.tsx`)
```tsx
import { Users } from 'lucide-react';

export default function TeamPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Users className="w-16 h-16 text-primary mb-4" />
      <h2 className="text-xl font-semibold">Team Management</h2>
      <p className="text-textMuted mt-2">Coming Q4 2026</p>
    </div>
  );
}
```

---

## Phase 3: Repurpose Engine

### 3.1 Feature Overview

The "Repurpose" tab enables users to:
1. Record voice memos directly in the browser
2. Upload existing audio/video files
3. Paste text content
4. Auto-transcribe and analyze the content
5. Send to Studio for editing/refining

### 3.2 Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  REPURPOSE - Voice to Content                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │             │  │             │  │             │       │
│  │   🎤       │  │   📹       │  │   📝       │       │
│  │  Voice Memo │  │   Video    │  │    Text    │       │
│  │             │  │   Import   │  │    Paste   │       │
│  │  [Record]   │  │  [Upload]  │  │  [Paste]   │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 VoiceRecorder Component

#### Component Location
`components/VoiceRecorder.tsx`

#### UI States

| State | Visual | Controls |
|-------|--------|----------|
| **Idle** | Large red microphone button + drag-drop zone | Record, Upload |
| **Recording** | Pulsing animation + waveform + timer | Stop |
| **Processing** | "Transcribing & Analyzing DNA..." loader | Cancel |
| **Complete** | Preview of transcribed text | Edit, Send to Studio |

#### Implementation Details

```typescript
interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onCancel: () => void;
}

type RecorderState = 'idle' | 'recording' | 'processing' | 'complete';
```

#### Recording Logic (Browser MediaRecorder API)

```typescript
// Step 1: Request microphone access
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  
  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };
  
  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    // Convert to base64 for API upload
  };
  
  mediaRecorder.start();
};

// Step 2: Transcription (mock for V1)
const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  // In production: Send to Whisper API
  // For V1: Return mock transcription
  return mockTranscription;
};

// Step 3: Send to Studio
const sendToStudio = (text: string) => {
  // Store in localStorage or context
  localStorage.setItem('pendingStudioContent', text);
  window.location.href = '/studio?mode=refine';
};
```

### 3.4 Input Cards Specification

#### Card 1: Voice Memo
- **Icon**: Microphone (red accent)
- **Action**: Opens VoiceRecorder modal
- **Supported**: Record new or upload audio file

#### Card 2: Video Import
- **Icon**: Video icon
- **Action**: File picker for .mp4, .mov, .webm
- **Processing**: Extract audio track → transcribe

#### Card 3: Text Paste
- **Icon**: Document icon
- **Action**: Opens text input area
- **Direct**: Send to Studio as-is

---

## State Management & Data Flow

### 1. Navigation State

```typescript
// In App.tsx or a dedicated navigation context
interface NavigationState {
  currentPath: string;
  previousPath: string | null;
  isMobileMenuOpen: boolean;
}
```

### 2. Studio Content Handoff

When navigating from Repurpose to Studio:

```typescript
// Option A: localStorage (simple, works across page loads)
localStorage.setItem('studioInitialContent', transcribedText);
localStorage.setItem('studioMode', 'refine');

// Option B: React Context (preferred for in-app navigation)
interface StudioContextType {
  initialContent: string | null;
  mode: 'write' | 'refine' | 'rewrite';
  setInitialContent: (content: string | null) => void;
}
```

### 3. State Preservation

When navigating between Studio and Repurpose:
- Studio should preserve editor content (localStorage + React state)
- Show warning if navigating away with unsaved changes:
```typescript
const handleNavigation = (newPath: string) => {
  if (hasUnsavedChanges && newPath !== '/studio') {
    const confirm = window.confirm(
      'You have unsaved changes. Are you sure you want to leave?'
    );
    if (!confirm) return;
  }
  navigate(newPath);
};
```

---

## Component Hierarchy

```
App
├── AuthProvider
│   └── ErrorBoundary
│       └── AppContent
│           ├── LandingPage
│           ├── Login
│           ├── LegalPage
│           ├── PaymentSuccessPage
│           └── AppShell (authenticated)
│               ├── Sidebar (desktop)
│               │   ├── Logo
│               │   ├── NavItems
│               │   └── UserMenu
│               ├── MobileHeader
│               │   └── MobileNavDrawer
│               └── PageContent
│                   ├── StudioPage
│                   │   └── [Existing Dashboard Content]
│                   ├── RepurposePage
│                   │   ├── InputCards
│                   │   └── VoiceRecorder
│                   ├── SocialPage (placeholder)
│                   ├── LibraryPage (placeholder)
│                   └── TeamPage (placeholder)
```

---

## Implementation Checklist

### Phase 1: App Shell
- [ ] Create `layouts/AppShell.tsx`
- [ ] Create `config/navigation.ts`
- [ ] Create `components/Sidebar.tsx`
- [ ] Create `components/MobileHeader.tsx`
- [ ] Create `components/MobileNavDrawer.tsx`
- [ ] Integrate AppShell into App.tsx
- [ ] Test responsive breakpoints

### Phase 2: Migration
- [ ] Create `pages/studio/index.tsx` (move Dashboard content)
- [ ] Create `pages/social/index.tsx`
- [ ] Create `pages/library/index.tsx`
- [ ] Create `pages/team/index.tsx`
- [ ] Update App.tsx routing
- [ ] Add redirect from `/` to `/studio`
- [ ] Test all existing functionality

### Phase 3: Repurpose
- [ ] Create `pages/repurpose/index.tsx`
- [ ] Create `components/repurpose/InputCards.tsx`
- [ ] Create `components/VoiceRecorder.tsx`
- [ ] Implement MediaRecorder logic
- [ ]mock for Implement transcription ( V1)
- [ ] Implement Studio handoff
- [ ] Add state preservation

---

## Icon Mapping (lucide-react)

| Route | Icon | Import |
|-------|------|--------|
| Studio | PenTool | `import { PenTool } from 'lucide-react'` |
| Repurpose | RefreshCw | `import { RefreshCw } from 'lucide-react'` |
| Social | Rocket | `import { Rocket } from 'lucide-react'` |
| Library | Database | `import { Database } from 'lucide-react'` |
| Team | Users | `import { Users } from 'lucide-react'` |

---

## Testing Strategy

### Responsive Testing
- [ ] Desktop (1280px+): Full sidebar visible
- [ ] Tablet (768px-1279px): Collapsed sidebar with icons
- [ ] Mobile (<768px): Hamburger menu, full-width content

### Navigation Testing
- [ ] Click nav items → correct page renders
- [ ] Active state highlights correctly
- [ ] Logout clears session → redirects to landing

### Repurpose Testing
- [ ] Microphone permission request works
- [ ] Recording starts/stops correctly
- [ ] Transcription mock returns text
- [ ] "Send to Studio" navigates and pre-fills content

---

## Rollback Plan

If issues arise during migration:
1. Keep original Dashboard component as fallback
2. Use feature flag for gradual rollout
3. Implement A/B testing for user feedback

---

## Future Enhancements (Post-MVP)

1. **Persistent Sidebar State**: Remember collapsed/expanded state
2. **Keyboard Navigation**: Cmd+K for quick nav
3. **Deep Linking**: Direct URLs to specific Studio states
4. **Offline Support**: Service worker for cached pages
