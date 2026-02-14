// --- CLIENT-SIDE SLOP SCANNER ---
// Runs in browser for real-time scanning without API calls

// Categories and phrases (duplicated from config for client-side use)
type SlopCategory = 'hype' | 'fluff' | 'corporate' | 'ai';

export interface SlopIssue {
  word: string;
  index: number;
  length: number;
  category: SlopCategory;
  severity: 'warning' | 'critical';
}

export interface ScanResult {
  score: number;
  issues: SlopIssue[];
  totalSlopWords: number;
  categoryCounts: Record<SlopCategory, number>;
}

// Dictionary
const SLOPS: Record<SlopCategory, string[]> = {
  hype: [
    'game-changer', 'game changer', 'cutting-edge', 'cutting edge',
    'revolutionize', 'revolutionizing', 'seamlessly', 'unlock', 'unlocking',
    'transform', 'transforming', 'innovative', 'disrupt', 'disrupting',
    'elevate', 'elevating', 'breakthrough', 'turbocharge', 'supercharge',
    'next-level', 'next level', 'best-in-class', 'best in class',
    'world-class', 'world class', 'unparalleled', 'gamechanging',
  ],
  fluff: [
    'delve', 'delving', 'tapestry', 'digital landscape', 'in today\'s world',
    'in todays world', 'underscore', 'underscoring', 'it is worth noting',
    'it is important to note', 'it goes without saying', 'last but not least',
    'needless to say', 'by and large', 'at the end of the day',
    'in the final analysis', 'all things considered', 'on the flip side',
    'paints a picture', 'it is crucial', 'it is essential', 'goes to show',
    'speaks volumes', 'drives home', 'rings true', 'hits home', 'cuts both ways',
    'throws light', 'sheds light', 'far be it', 'make no mistake',
  ],
  corporate: [
    'synergy', 'synergies', 'align', 'aligning', 'alignment', 'paradigm shift',
    'circle back', 'deep dive', 'move the needle', 'low-hanging fruit',
    'low hanging fruit', 'think outside the box', 'leverage', 'leveraging',
    'holistic approach', 'best practice', 'best practices', 'take offline',
    'touch base', 'ping me', 'loop back', 'bandwidth', 'at scale',
    'on my radar', 'off my radar', 'blue sky thinking', 'boil the ocean',
    'change management', 'core competency', 'deliverables', 'drill down',
    'ecosystem', 'go-to-market', 'granular', 'ideate', 'incentivize',
    'KPIs', 'metrics', 'mission-critical', 'north star', 'optimize',
    'pain points', 'pivot', 'runway', 'scaling', 'stakeholder', 'streamline',
    'synergize', 'value-add', 'value proposition', 'win-win',
  ],
  ai: [
    'as an AI', 'I cannot', 'please note', 'however', 'additionally',
    'in conclusion', 'to summarize', 'ultimately', 'it is recommended',
    'it is important to understand', 'it should be noted', 'one might argue',
    'some might say', 'it is worth considering', 'as you can see',
    'as previously mentioned', 'it goes without saying that', 'needless to say',
    'first and foremost', 'last but not least', 'lastly', 'furthermore',
    'moreover', 'consequently', 'therefore', 'thus', 'hence', 'accordingly',
    'in other words', 'that is to say', 'namely', 'specifically',
    'in particular', 'for example', 'for instance', 'such as',
  ],
};

// Build regex patterns
let slopPatterns: RegExp | null = null;

function getPatterns(): RegExp {
  if (!slopPatterns) {
    const allWords: string[] = [];
    for (const category of Object.keys(SLOPS)) {
      for (const word of SLOPS[category as SlopCategory]) {
        allWords.push(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      }
    }
    slopPatterns = new RegExp(`\\b(${allWords.join('|')})\\b`, 'gi');
  }
  return slopPatterns;
}

// Category/severity lookup
function getCategoryInfo(word: string): { category: SlopCategory; severity: 'warning' | 'critical' } | null {
  const lower = word.toLowerCase();
  for (const [category, words] of Object.entries(SLOPS)) {
    if (words.includes(lower)) {
      return {
        category: category as SlopCategory,
        severity: (category === 'ai' || category === 'corporate') ? 'critical' : 'warning'
      };
    }
  }
  return null;
}

export function scanForSlop(text: string): ScanResult {
  if (!text || text.trim().length === 0) {
    return {
      score: 100,
      issues: [],
      totalSlopWords: 0,
      categoryCounts: { hype: 0, fluff: 0, corporate: 0, ai: 0 }
    };
  }

  const issues: SlopIssue[] = [];
  const categoryCounts: Record<SlopCategory, number> = {
    hype: 0, fluff: 0, corporate: 0, ai: 0
  };

  const regex = getPatterns();
  let match: RegExpExecArray | null;
  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchedWord = match[1];
    const info = getCategoryInfo(matchedWord);
    
    if (info) {
      const alreadyFound = issues.some(
        i => i.index === match!.index && i.word === matchedWord
      );

      if (!alreadyFound) {
        issues.push({
          word: matchedWord,
          index: match.index,
          length: matchedWord.length,
          category: info.category,
          severity: info.severity
        });
        categoryCounts[info.category]++;
      }
    }
  }

  // Remove overlapping issues
  const sorted = [...issues].sort((a, b) => a.index - b.index);
  const filtered: SlopIssue[] = [];
  let lastEnd = -1;

  for (const issue of sorted) {
    if (issue.index >= lastEnd) {
      filtered.push(issue);
      lastEnd = issue.index + issue.length;
    }
  }

  const totalSlopWords = filtered.length;
  const score = Math.max(0, 100 - totalSlopWords * 2);

  return {
    score,
    issues: filtered,
    totalSlopWords,
    categoryCounts
  };
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#22C55E';
  if (score >= 70) return '#FBBF24';
  return '#EF4444';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Authentic Human';
  if (score >= 70) return 'Slightly Generic';
  if (score >= 50) return 'AI Slop Detected';
  return 'Pure Slop';
}
