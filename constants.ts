import { VoicePreset, LinguisticDNA, PRESET_LIMITS, UserPlan } from './types';

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
        tone: 'persuasive',
        cadence: { avgSentenceLength: 8, variance: 'low', minLength: 3, maxLength: 15 },
        vocabulary: { complexity: 'simple', jargonLevel: 'low', uniqueWordRatio: 0.5 },
        formatting: { casing: 'sentence', punctuation: 'standard', emojiFrequency: 'none', usesOxfordComma: false, doubleSpacing: false },
        signaturePhrases: ['let\'s cut to the chase', 'act now'],
        topWords: ['results', 'win', 'opportunity', 'trust', 'action'],
        sampleSentences: ["Let's cut to the chase.", "You need results.", "Act now."]
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
        tone: 'emotive',
        cadence: { avgSentenceLength: 18, variance: 'medium', minLength: 8, maxLength: 28 },
        vocabulary: { complexity: 'moderate', jargonLevel: 'low', uniqueWordRatio: 0.6 },
        formatting: { casing: 'sentence', punctuation: 'standard', emojiFrequency: 'none', usesOxfordComma: true, doubleSpacing: false },
        signaturePhrases: ['picture this', 'one day'],
        topWords: ['journey', 'transform', 'potential', 'dream', 'unfold'],
        sampleSentences: ["Picture this: a young entrepreneur.", "She faced rejection after rejection.", "This isn't just a story."]
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
        tone: 'minimal',
        cadence: { avgSentenceLength: 4, variance: 'low', minLength: 2, maxLength: 8 },
        vocabulary: { complexity: 'simple', jargonLevel: 'none', uniqueWordRatio: 0.3 },
        formatting: { casing: 'lowercase', punctuation: 'minimal', emojiFrequency: 'none', usesOxfordComma: false, doubleSpacing: false },
        signaturePhrases: ['less is more', 'cut the fluff'],
        topWords: ['simple', 'direct', 'clean', 'essential', 'point'],
        sampleSentences: ["less is more.", "cut the fluff.", "just facts."]
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
        tone: 'energetic',
        cadence: { avgSentenceLength: 6, variance: 'high', minLength: 2, maxLength: 12 },
        vocabulary: { complexity: 'simple', jargonLevel: 'low', uniqueWordRatio: 0.4 },
        formatting: { casing: 'uppercase', punctuation: 'heavy', emojiFrequency: 'high', usesOxfordComma: false, doubleSpacing: false },
        signaturePhrases: ['stop scrolling', 'no cap', 'i dare you'],
        topWords: ['game-changer', 'viral', 'breaking', 'exclusive', 'wait'],
        sampleSentences: ["🔥 WAIT. Stop scrolling.", "You NEED to see this.", "No cap."]
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
        tone: 'professional',
        cadence: { avgSentenceLength: 22, variance: 'low', minLength: 12, maxLength: 35 },
        vocabulary: { complexity: 'complex', jargonLevel: 'high', uniqueWordRatio: 0.7 },
        formatting: { casing: 'sentence', punctuation: 'heavy', emojiFrequency: 'none', usesOxfordComma: true, doubleSpacing: false },
        signaturePhrases: ['further research is warranted', 'based on empirical data'],
        topWords: ['empirical', 'correlation', 'hypothesis', 'analysis', 'methodology'],
        sampleSentences: ["This study examines the correlation.", "Based on empirical data.", "Further research is warranted."]
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