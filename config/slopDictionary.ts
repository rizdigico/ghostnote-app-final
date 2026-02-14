// --- SLOPS: Banned AI Phrases Dictionary ---
// Categorized by type for better UX and scoring

export type SlopCategory = 'hype' | 'fluff' | 'corporate' | 'ai';

export interface SlopWord {
  word: string;
  category: SlopCategory;
  severity: 'warning' | 'critical'; // warning = yellow, critical = red
}

export const SLOP_DICTIONARY: Record<SlopCategory, string[]> = {
  // Hype words - startup/tech jargon
  hype: [
    'game-changer',
    'game changer',
    'cutting-edge',
    'cutting edge',
    'revolutionize',
    'revolutionizing',
    'seamlessly',
    'unlock',
    'unlocking',
    'transform',
    'transforming',
    'innovative',
    'disrupt',
    'disrupting',
    'elevate',
    'elevating',
    'breakthrough',
    'turbocharge',
    'supercharge',
    'next-level',
    'next level',
    'best-in-class',
    'best in class',
    'world-class',
    'world class',
    'unparalleled',
    'gamechanging',
  ],

  // Fluff - filler words that add no value
  fluff: [
    'delve',
    'delving',
    'tapestry',
    'digital landscape',
    'in today\'s world',
    'in todays world',
    'underscore',
    'underscoring',
    'it is worth noting',
    'it is important to note',
    'it goes without saying',
    'last but not least',
    'needless to say',
    'by and large',
    'at the end of the day',
    'in the final analysis',
    'all things considered',
    'on the flip side',
    'paints a picture',
    'it is crucial',
    'it is essential',
    'goes to show',
    'speaks volumes',
    'drives home',
    'rings true',
    'hits home',
    'cuts both ways',
    'throws light',
    'sheds light',
    'far be it',
    'make no mistake',
  ],

  // Corporate speak - buzzword bingo
  corporate: [
    'synergy',
    'synergies',
    'align',
    'aligning',
    'alignment',
    'paradigm shift',
    'circle back',
    'deep dive',
    'move the needle',
    'low-hanging fruit',
    'low hanging fruit',
    'think outside the box',
    'think outside the box',
    'leverage',
    'leveraging',
    'holistic approach',
    'best practice',
    'best practices',
    'take offline',
    'touch base',
    'ping me',
    'loop back',
    'bandwidth',
    'at scale',
    'on my radar',
    'off my radar',
    'blue sky thinking',
    'boil the ocean',
    'change management',
    'core competency',
    'deliverables',
    'drill down',
    'ecosystem',
    'go-to-market',
    'granular',
    'ideate',
    'incentivize',
    'KPIs',
    'metrics',
    'mission-critical',
    'north star',
    'optimize',
    'pain points',
    'pivot',
    'runway',
    'scaling',
    'stakeholder',
    'streamline',
    'synergize',
    'value-add',
    'value proposition',
    'win-win',
  ],

  // AI patterns - phrases that sound like AI wrote them
  ai: [
    'as an AI',
    'I cannot',
    'please note',
    'however',
    'additionally',
    'in conclusion',
    'to summarize',
    'ultimately',
    'it is recommended',
    'it is important to understand',
    'it should be noted',
    'one might argue',
    'some might say',
    'it is worth considering',
    'as you can see',
    'as previously mentioned',
    'it goes without saying that',
    'needless to say',
    'first and foremost',
    'last but not least',
    'lastly',
    'furthermore',
    'moreover',
    'consequently',
    'therefore',
    'thus',
    'hence',
    'accordingly',
    'in other words',
    'that is to say',
    'namely',
    'specifically',
    'in particular',
    'for example',
    'for instance',
    'such as',
  ],
};

// Create a flat list for efficient searching
export function getAllSlopWords(): SlopWord[] {
  const words: SlopWord[] = [];
  
  for (const [category, wordList] of Object.entries(SLOP_DICTIONARY)) {
    const cat = category as SlopCategory;
    const severity = cat === 'ai' || cat === 'corporate' ? 'critical' : 'warning';
    
    for (const word of wordList) {
      words.push({ word, category: cat, severity });
    }
  }
  
  return words;
}

// Get category display names
export const CATEGORY_LABELS: Record<SlopCategory, string> = {
  hype: 'Startup Hype',
  fluff: 'Empty Fluff',
  corporate: 'Corporate Speak',
  ai: 'AI Pattern',
};

// Get severity colors
export const SEVERITY_COLORS = {
  warning: '#FBBF24', // Yellow
  critical: '#EF4444', // Red
};
