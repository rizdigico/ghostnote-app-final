// --- SLOP SCANNER SERVICE ---
// High-performance scanner to identify "banned" AI phrases

import { getAllSlopWords, SlopCategory } from '../../config/slopDictionary';

export interface SlopIssue {
  word: string;
  index: number;
  length: number;
  category: SlopCategory;
  severity: 'warning' | 'critical';
}

export interface ScanResult {
  score: number; // 0-100 humanity score
  issues: SlopIssue[];
  totalSlopWords: number;
  categoryCounts: Record<SlopCategory, number>;
}

// Build regex patterns for each category for efficiency
let slopPatterns: RegExp[] | null = null;

function getSlopPatterns(): RegExp[] {
  if (!slopPatterns) {
    const slopWords = getAllSlopWords();
    // Create a single regex with all words, case insensitive
    const escapedWords = slopWords.map(w => 
      w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    slopPatterns = [new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi')];
  }
  return slopPatterns;
}

// Create a map for quick lookup
let slopWordMap: Map<string, { category: SlopCategory; severity: 'warning' | 'critical' }> | null = null;

function getSlopWordMap(): Map<string, { category: SlopCategory; severity: 'warning' | 'critical' }> {
  if (!slopWordMap) {
    slopWordMap = new Map();
    const slopWords = getAllSlopWords();
    for (const item of slopWords) {
      slopWordMap.set(item.word.toLowerCase(), {
        category: item.category,
        severity: item.severity
      });
    }
  }
  return slopWordMap;
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
    hype: 0,
    fluff: 0,
    corporate: 0,
    ai: 0
  };

  const patterns = getSlopPatterns();
  const wordMap = getSlopWordMap();

  // Use the regex to find all matches
  const regex = patterns[0];
  let match: RegExpExecArray | null;

  // Reset regex state
  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchedWord = match[1];
    const lowerWord = matchedWord.toLowerCase();
    
    // Look up the category and severity
    const info = wordMap.get(lowerWord);
    
    if (info) {
      // Avoid duplicate issues at the same position
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

  // Remove overlapping issues (keep the first/longer one)
  const filteredIssues = removeOverlappingIssues(issues);

  // Calculate humanity score
  // Start at 100, deduct 2 points per slop word
  const totalSlopWords = filteredIssues.length;
  const deduction = totalSlopWords * 2;
  const score = Math.max(0, 100 - deduction);

  return {
    score,
    issues: filteredIssues,
    totalSlopWords,
    categoryCounts
  };
}

// Remove overlapping issues - keep the first occurrence
function removeOverlappingIssues(issues: SlopIssue[]): SlopIssue[] {
  if (issues.length === 0) return issues;

  // Sort by index
  const sorted = [...issues].sort((a, b) => a.index - b.index);
  
  const result: SlopIssue[] = [];
  let lastEnd = -1;

  for (const issue of sorted) {
    if (issue.index >= lastEnd) {
      result.push(issue);
      lastEnd = issue.index + issue.length;
    }
  }

  return result;
}

// Get score color
export function getScoreColor(score: number): string {
  if (score >= 90) return '#22C55E'; // Green
  if (score >= 70) return '#FBBF24'; // Yellow
  return '#EF4444'; // Red
}

// Get score label
export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Authentic Human';
  if (score >= 70) return 'Slightly Generic';
  if (score >= 50) return 'AI Slop Detected';
  return 'Pure Slop';
}

// Get a human-readable explanation of issues
export function getIssuesSummary(result: ScanResult): string {
  if (result.totalSlopWords === 0) {
    return 'Your text sounds authentically human!';
  }

  const parts: string[] = [];
  
  if (result.categoryCounts.ai > 0) {
    parts.push(`${result.categoryCounts.ai} AI pattern${result.categoryCounts.ai > 1 ? 's' : ''}`);
  }
  if (result.categoryCounts.corporate > 0) {
    parts.push(`${result.categoryCounts.corporate} corporate buzzword${result.categoryCounts.corporate > 1 ? 's' : ''}`);
  }
  if (result.categoryCounts.fluff > 0) {
    parts.push(`${result.categoryCounts.fluff} filler phrase${result.categoryCounts.fluff > 1 ? 's' : ''}`);
  }
  if (result.categoryCounts.hype > 0) {
    parts.push(`${result.categoryCounts.hype} hype word${result.categoryCounts.hype > 1 ? 's' : ''}`);
  }

  return `Found ${parts.join(', ')}`;
}
