import { VoicePreset } from './types';

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