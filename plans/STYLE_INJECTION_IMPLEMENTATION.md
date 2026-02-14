# Style Injection (The Voice Mixer) - Implementation Plan

## Overview
This document outlines the implementation plan for adding "Style Injection" to GhostNote, allowing users to mix a "Base Voice" (Client Facts) with "Modifier Voices" (Styles) to create unique content blends.

---

## Current State Analysis

### Existing Architecture
| Component | Current State |
|-----------|---------------|
| **types.ts** | `VoicePreset` interface with: `id`, `name`, `referenceText`, `isCustom`, `ownerId`, `createdBy`, `teamId`, `visibility`, `metadata` |
| **api/generate.ts** | Accepts: `draft`, `referenceText`, `fileContent`, `sessionId`, `intensity` |
| **constants.ts** | 6 default presets in `VOICE_PRESETS` array |
| **dbService.ts** | Uses localStorage; merges `VOICE_PRESETS` with custom user voices |
| **Dashboard.tsx** | Single `selectedPresetId`, single `intensity` slider |

---

## PHASE 1: Data Model & Backend Changes

### 1.1 Type Definition Updates (`types.ts`)

Add new types for style injection:

```typescript
// New type for voice injection with intensity
export interface VoiceInjection {
  voiceId: string;
  intensity: number; // 0.1 to 1.0
}

// Extended request payload for generation
export interface GenerationRequest {
  draft: string;
  primaryVoiceId: string;        // The Base Voice (DNA providing facts/structure)
  injections: VoiceInjection[];  // Max 2 injections (Modifier Voices)
  intensity?: number;            // Overall intensity (0-100)
  sessionId?: string;
  fileContent?: string;
}
```

### 1.2 VoicePreset Enhancement

Add `is_system_preset` flag to distinguish system voices from user/custom voices:

```typescript
export interface VoicePreset {
  id: string;
  name: string;
  referenceText: string;
  isCustom?: boolean;
  is_system_preset?: boolean;  // NEW: System-level voice
  ownerId?: string;
  createdBy?: string;
  teamId?: string;
  visibility?: VoicePresetVisibility;
  metadata?: {
    source?: 'manual' | 'url' | 'file';
    sourceUrl?: string;
    // NEW: Extracted linguistic DNA for efficient prompting
    linguisticDna?: {
      tone: string[];
      vocabulary: string[];
      sentencePatterns: string[];
      keywords: string[];
    };
  };
}
```

### 1.3 Database Schema Migration

Create migration file: `plans/migrations/005_add_system_preset_flag.sql`

```sql
-- Add is_system_preset column to voice_presets table
ALTER TABLE voice_presets 
ADD COLUMN IF NOT EXISTS is_system_preset BOOLEAN DEFAULT FALSE;

-- Add linguistic_dna JSONB column for pre-extracted style attributes
ALTER TABLE voice_presets 
ADD COLUMN IF NOT EXISTS linguistic_dna JSONB;

-- Index for faster system preset queries
CREATE INDEX IF NOT EXISTS idx_voice_presets_system 
ON voice_presets(is_system_preset) 
WHERE is_system_preset = TRUE;
```

---

## PHASE 2: API Endpoint Updates

### 2.1 Updated Generation Endpoint (`api/generate.ts`)

**Input Schema Change:**
- **Old:** `voiceProfileId: string`
- **New:**
  - `primaryVoiceId: string` (The DNA providing facts/structure)
  - `injections: Array<{ voiceId: string, intensity: number }>` (0.1 to 1.0)

**Constraints:**
- Limit to **Max 2 Injections** to prevent "muddy" output

### 2.2 Prompt Engineering Strategy

The key to successful voice mixing is NOT simply asking the AI to "mix them," but using a structured "Base + Modifier" approach.

**System Prompt Construction:**

```
Role: Ghostwriter.

Base Identity: Adopt the sentence structure and vocabulary of [Primary Voice Name].
- Key traits: [extracted tone, vocabulary, patterns from Primary Voice]

Style Modifier: Inject traits from [Injection Voice Name] (specifically: [Tone/Keywords]).
- Apply this modifier at [Intensity * 100]% intensity

Context: [User's Draft]

IMPORTANT: If styles conflict, prioritize the [Injection Voice] for tone/vibe, 
but keep [Primary Voice] for factual accuracy and terminology.
```

**Detailed Prompt Template:**

```typescript
function buildStyleInjectionPrompt(
  primaryVoice: VoicePreset,
  injections: VoiceInjection[],
  allVoices: VoicePreset[],
  draft: string,
  overallIntensity: number
): { system: string; user: string } {

  // Find the injection voice objects
  const injectionVoices = injections.map(inj => 
    allVoices.find(v => v.id === inj.voiceId)
  ).filter(Boolean) as VoicePreset[];

  // Build the system prompt
  const systemPrompt = `You are a professional ghostwriter with expertise in voice mimicry and style fusion.

BASE VOICE (Primary Identity - Provides Facts & Structure):
${primaryVoice.name}
Style Analysis:
- Tone: ${primaryVoice.metadata?.linguisticDna?.tone?.join(', ') || 'Neutral'}
- Vocabulary: ${primaryVoice.metadata?.linguisticDna?.vocabulary?.join(', ') || 'Standard'}
- Sentence Patterns: ${primaryVoice.metadata?.linguisticDna?.sentencePatterns?.join(', ') || 'Varied'}
- Reference Text: ${primaryVoice.referenceText.slice(0, 500)}

${injectionVoices.length > 0 ? `STYLE MODIFIERS (Injected Traits):
${injectionVoices.map((voice, idx) => `
Modifier ${idx + 1}: ${voice.name}
- Intensity: ${injections[idx].intensity * 100}%
- Tone: ${voice.metadata?.linguisticDna?.tone?.join(', ') || 'Distinctive'}
- Keywords: ${voice.metadata?.linguisticDna?.keywords?.join(', ') || 'N/A'}
- Reference: ${voice.referenceText.slice(0, 200)}
`).join('\n')}

CONFLICT RESOLUTION: If the Base Voice and Modifier styles conflict, 
prioritize the Modifier(s) for tone and vibe, but keep the Base Voice 
for factual accuracy, terminology, and structure.` : ''}

INTENSITY SETTING: ${overallIntensity}%
- At 0-20%: Subtle influence, maintain original voice
- At 21-50%: Moderate blending of styles
- At 51-80%: Strong style injection
- At 81-100%: Dominant style influence

Rewrite the user's draft according to these guidelines. 
Return ONLY the rewritten text, no explanations.`;

  const userPrompt = `Rewrite this text with style injection:\n\n${draft}`;

  return { system: systemPrompt, user: userPrompt };
}
```

---

## PHASE 3: System Presets (The Preset Library)

### 3.1 New System Voices

Create 5 "System Voices" available to everyone (Global Visibility). These serve as "Modifier Voices" that users can mix with their own Client Voices.

| ID | Name | Description | Use Case |
|----|------|-------------|----------|
| `sys-closer` | The Closer | Persuasive, short punchy sentences, action-oriented | Sales emails, CTAs |
| `sys-storyteller` | The Storyteller | Metaphor-heavy, emotive, narrative flow | Brand stories, blog posts |
| `sys-minimalist` | The Minimalist | Ultra-concise, lower case, remove fluff | Technical docs, announcements |
| `sys-viral` | The Viral | Hook-heavy, Twitter-style, attention-grabbing | Social media, ads |
| `sys-academic` | The Academic | Data-driven, formal, cited, sophisticated | Whitepapers, reports |

### 3.2 Seeding Script (`plans/scripts/seed-system-presets.ts`)

```typescript
import { VoicePreset } from '../../types';

export const SYSTEM_PRESETS: VoicePreset[] = [
  {
    id: 'sys-closer',
    name: 'The Closer',
    referenceText: "Let's cut to the chase. You need results. I have the solution. Here's what happens next: you say yes, we deliver, you win. Don't let this opportunity slip away. Act now. Trust me. Let's make it happen.",
    is_system_preset: true,
    visibility: 'team', // Available to all team members
    metadata: {
      source: 'manual',
      linguisticDna: {
        tone: ['persuasive', 'action-oriented', 'direct'],
        vocabulary: ['results', 'win', 'opportunity', 'trust', 'action'],
        sentencePatterns: ['short-declarative', 'imperative', 'rhetorical-questions'],
        keywords: ['now', 'today', 'immediately', 'stop', 'start']
      }
    }
  },
  {
    id: 'sys-storyteller',
    name: 'The Storyteller',
    referenceText: "Picture this: a young entrepreneur with nothing but a laptop and a dream. She faced rejection after rejection, but she never gave up. One day, everything changed. This isn't just a story—it's your potential waiting to unfold.",
    is_system_preset: true,
    visibility: 'team',
    metadata: {
      source: 'manual',
      linguisticDna: {
        tone: ['emotive', 'narrative', 'inspirational'],
        vocabulary: ['journey', 'transform', 'potential', 'dream', 'unfold'],
        sentencePatterns: ['vivid-imagery', 'metaphors', 'narrative-arc'],
        keywords: ['imagine', 'picture', 'once-upon-a-time', 'what-if']
      }
    }
  },
  {
    id: 'sys-minimalist',
    name: 'The Minimalist',
    referenceText: "less is more. say more with less. cut the fluff. get to the point. no filler. just facts. simple. clean. direct.",
    is_system_preset: true,
    visibility: 'team',
    metadata: {
      source: 'manual',
      linguisticDna: {
        tone: ['minimal', 'direct', 'utilitarian'],
        vocabulary: ['simple', 'direct', 'clean', 'essential'],
        sentencePatterns: ['fragment', 'imperative', 'lowercase'],
        keywords: ['less', 'more', 'cut', 'point', 'fact']
      }
    }
  },
  {
    id: 'sys-viral',
    name: 'The Viral',
    referenceText: "🔥 WAIT. Stop scrolling. You NEED to see this. 

This is literally the biggest game-changer of 2024. No cap. Everyone's talking about it. Don't believe me? Tap the link. I dare you. 👇",
    is_system_preset: true,
    visibility: 'team',
    metadata: {
      source: 'manual',
      linguisticDna: {
        tone: ['exciting', 'urgent', 'attention-grabbing'],
        vocabulary: ['game-changer', 'viral', 'breaking', 'exclusive'],
        sentencePatterns: ['hooks', 'questions', 'emoji-heavy', 'short-punchy'],
        keywords: ['wait', 'stop', 'literally', 'no-cap', 'dare-you']
      }
    }
  },
  {
    id: 'sys-academic',
    name: 'The Academic',
    referenceText: "This study examines the correlation between strategic implementation and organizational outcomes. Based on empirical data, we propose the following hypothesis: effective resource allocation directly influences competitive advantage. Further research is warranted.",
    is_system_preset: true,
    visibility: 'team',
    metadata: {
      source: 'manual',
      linguisticDna: {
        tone: ['formal', 'analytical', 'objective'],
        vocabulary: ['empirical', 'correlation', 'hypothesis', 'analysis', 'methodology'],
        sentencePatterns: ['complex', 'qualified', 'passive-voice'],
        keywords: ['research', 'data', 'study', 'evidence', 'analysis']
      }
    }
  }
];
```

---

## PHASE 4: Frontend UI - StyleMixer Component

### 4.1 Component Architecture

Create `components/StyleMixer.tsx` - A DJ Deck-style interface for mixing voices.

### 4.2 UI Layout Design

```
┌─────────────────────────────────────────────────────────────┐
│  🎛️ STYLE MIXER                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎤 THE BASE (Primary Voice)                         │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  [Voice Selector Dropdown]                          │   │
│  │  "Client Voice - Facts & Structure"                 │   │
│  │  [Preview: 2-3 sentences from reference]            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│           ┌───────────────────────┐                         │
│           │   + ADD INJECTION     │  (Primary Button)       │
│           └───────────────────────┘                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎵 INJECTION 1 (Modifier Voice)                    │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  [Voice Selector]  [× Remove]                       │   │
│  │                                                        │   │
│  │  Intensity: ━━━━━━●━━━━━━━  [70%]                    │   │
│  │  Label: "Dominant Style" ← Visual Feedback            │   │
│  │                                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [+ Add Another Injection] (If < 2 injections)             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Overall Intensity: ━━━━━━━●━━━━  [50%]            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 State Management

```typescript
interface StyleMixerState {
  // The Base Voice (provides facts/structure)
  primaryVoice: VoicePreset | null;
  
  // The Modifier Voices (style injections)
  activeInjections: Array<{
    voiceId: string;
    intensity: number; // 0.1 to 1.0
    voice: VoicePreset;
  }>;
  
  // Overall output intensity
  overallIntensity: number;
}

// Visual feedback labels for intensity
const getIntensityLabel = (intensity: number): string => {
  if (intensity <= 0.2) return 'Hint of flavor';
  if (intensity <= 0.4) return 'Subtle influence';
  if (intensity <= 0.6) return 'Balanced blend';
  if (intensity <= 0.8) return 'Strong presence';
  return 'Dominant style';
};
```

### 4.4 Integration with Dashboard

The StyleMixer replaces the current single-voice selector in the Dashboard. It integrates with:

1. **Voice Preset Loading**: Fetches both user presets AND system presets
2. **Generation API**: Sends `primaryVoiceId` + `injections` array
3. **Linguistic DNA Display**: Shows extracted traits from selected voices

---

## PHASE 5: Integration Points

### 5.1 dbService Updates

Update `getVoicePresets` to include system presets:

```typescript
async getVoicePresets(userId: string): Promise<VoicePreset[]> {
  // 1. Get system presets (always available)
  const systemPresets = SYSTEM_PRESETS;
  
  // 2. Get user's custom presets
  const customVoices = this.getCustomVoices(userId);
  
  // 3. Get team's shared presets
  const teamPresets = await this.getTeamPresets(userId);
  
  return [...systemPresets, ...teamPresets, ...customVoices];
}
```

### 5.2 API Request Flow

```
Dashboard State:
{
  primaryVoiceId: "user-client-voice-123",
  injections: [
    { voiceId: "sys-closer", intensity: 0.7 },
    { voiceId: "sys-viral", intensity: 0.3 }
  ],
  intensity: 60
}

→ POST /api/generate
{
  draft: "We should discuss the quarterly results...",
  primaryVoiceId: "user-client-voice-123",
  injections: [
    { voiceId: "sys-closer", intensity: 0.7 },
    { voiceId: "sys-viral", intensity: 0.3 }
  ],
  intensity: 60
}
```

---

## Implementation Checklist

### Step 1: Database & Types
- [ ] Update `types.ts` - Add `VoiceInjection` interface
- [ ] Update `types.ts` - Add `is_system_preset` to `VoicePreset`
- [ ] Update `types.ts` - Add `linguisticDna` to metadata
- [ ] Create migration SQL file
- [ ] Create seed script for system presets

### Step 2: Backend API
- [ ] Update `api/generate.ts` - Accept new payload format
- [ ] Implement prompt building with injection logic
- [ ] Add validation (max 2 injections)
- [ ] Add conflict resolution instructions

### Step 3: Data Layer
- [ ] Update `constants.ts` - Add SYSTEM_PRESETS array
- [ ] Update `dbService.ts` - Include system presets in queries

### Step 4: Frontend Components
- [ ] Create `components/StyleMixer.tsx`
- [ ] Create `components/InjectionCard.tsx` (sub-component)
- [ ] Create `components/VoiceSelector.tsx` (reusable)
- [ ] Update `Dashboard.tsx` - Integrate StyleMixer

### Step 5: Testing & Polish
- [ ] Test voice mixing with various combinations
- [ ] Verify prompt output quality
- [ ] UI/UX refinement based on feedback

---

## Risk Mitigation

1. **Token Limit Issues**: 
   - Mitigation: Keep `linguisticDna` summaries concise (max 200 chars each)
   - Fallback: If prompt exceeds limit, use shortened reference text only

2. **Style Conflicts**:
   - Mitigation: Add explicit "Conflict Resolution" instruction in prompt
   - Default: Primary Voice provides facts, Injection provides tone

3. **Performance**:
   - Mitigation: Cache linguistic DNA extraction results
   - Only analyze reference text once when creating preset

---

## Files to Modify

| File | Changes |
|------|---------|
| `types.ts` | Add new interfaces |
| `constants.ts` | Add SYSTEM_PRESETS |
| `dbService.ts` | Update preset queries |
| `api/generate.ts` | Update endpoint & prompts |
| `components/StyleMixer.tsx` | **NEW** - DJ Deck UI |
| `components/Dashboard.tsx` | Integrate StyleMixer |

---

## Success Metrics

1. ✅ Users can select a Base Voice (their client/brand voice)
2. ✅ Users can add up to 2 Style Injections from system presets
3. ✅ Each injection has adjustable intensity (0.1 - 1.0)
4. ✅ Visual feedback shows intensity label (e.g., "Dominant Style")
5. ✅ Generated content reflects the mixed voice profile
6. ✅ System presets are visible to all users (read-only)
7. ✅ No breaking changes to existing single-voice functionality

