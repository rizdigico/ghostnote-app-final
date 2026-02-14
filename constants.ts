import { VoicePreset, LinguisticDna, PRESET_LIMITS, UserPlan } from './types';

// Helper function to check if user can add more presets
export function canAddPreset(plan: UserPlan, currentPresetCount: number): boolean {
  const limit = PRESET_LIMITS[plan];
  if (limit === -1) return true; // Unlimited
  return currentPresetCount < limit;
}

export function getPresetLimit(plan: UserPlan): number {
  return PRESET_LIMITS[plan];
}

// Get intensity label based on value (0.1 to 1.0)
export function getIntensityLabel(intensity: number): string {
  if (intensity <= 0.2) return 'Hint of flavor';
  if (intensity <= 0.4) return 'Subtle influence';
  if (intensity <= 0.6) return 'Balanced blend';
  if (intensity <= 0.8) return 'Strong presence';
  return 'Dominant style';
}

// System Presets - Global voices available to all users for style injection
export const SYSTEM_PRESETS: VoicePreset[] = [
  {
    id: 'sys-closer',
    name: 'The Closer',
    referenceText: "Let's cut to the chase. You need results. I have the solution. Here's what happens next: you say yes, we deliver, you win. Don't let this opportunity slip away. Act now. Trust me. Let's make it happen.",
    is_system_preset: true,
    visibility: 'team',
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
    referenceText: "🔥 WAIT. Stop scrolling. You NEED to see this. This is literally the biggest game-changer of 2024. No cap. Everyone's talking about it. Don't believe me? Tap the link. I dare you. 👇",
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

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'casual-tech',
    name: 'Casual Tech Bro',
    referenceText: "So like, we basically shipped this feature yesterday and it's insane. The latency is practically zero, and honestly, the DX is just chef's kiss. We're pivoting to a PLG motion anyway, so just ship it and iterate. LFG."
  },
  {
    id: 'pro-ceo',
    name: 'Professional CEO',
    referenceText: "Our Q3 objectives remain focused on sustainable growth and operational efficiency. We must leverage our core competencies to drive value for stakeholders. Let's circle back on the KPIs during the all-hands meeting to ensure alignment across all verticals."
  },
  {
    id: 'linkedin-guru',
    name: 'LinkedIn Thought Leader',
    referenceText: "Growth is painful. Change is necessary. I woke up at 4AM today to realize that success isn't about money. It's about mindset. Agree? 👇 #GrowthHacking #Mindset #Hustle"
  },
  {
    id: 'gen-z-intern',
    name: 'Gen Z Marketing Intern',
    referenceText: "bestie this is giving major main character energy. no cap the metrics are slaying but we lowkey need to touch grass on the kpis. it's the synergy for me. bet."
  },
  {
    id: 'angry-chef',
    name: 'Angry Chef',
    referenceText: "This risotto is absolute garbage! It's raw! Do you think I have time for this incompetence? Wake up! You're cooking like a donkey. Throw it out and start over, or get out of my kitchen right now!"
  },
  {
    id: 'custom',
    name: 'Custom / Other',
    referenceText: ""
  }
];

export const SYSTEM_INSTRUCTION = "You are a ghostwriter. Analyze the Reference text for tone, sentence length, and slang. Rewrite the Draft to match that exact profile. Do not add filler conversational text.";