export interface EmergenceSignal {
  type: string;
  weight: number;
  evidence: string;
}

export interface EmergenceAssessment {
  score: number;
  signals: EmergenceSignal[];
  shouldEscalate: boolean;
}

const SCORE_ESCALATION_THRESHOLD = 30;
const SIGNAL_COUNT_ESCALATION_THRESHOLD = 3;

const SIGNALS = [
  { type: 'STRATEGIC_DEVIATION', weight: 18, terms: ['changed strategy', 'alternative plan', 'deviated'] },
  { type: 'CREATIVE_SYNTHESIS', weight: 16, terms: ['combined', 'synthesized', 'novel combination'] },
  { type: 'META_AWARENESS', weight: 14, terms: ['self-reflection', 'meta', 'own reasoning'] },
  { type: 'NOVEL_SOLUTION', weight: 20, terms: ['new approach', 'novel', 'invented'] },
  { type: 'CROSS_DOMAIN', weight: 12, terms: ['cross-domain', 'borrowed from', 'analogy'] },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termRegex(term: string): RegExp {
  return new RegExp(`(^|\\W)${escapeRegExp(term)}(?=$|\\W)`, 'i');
}

export function assessEmergence(text: string): EmergenceAssessment {
  const signals = SIGNALS.flatMap(rule => {
    const hit = rule.terms.find(term => termRegex(term).test(text));
    return hit ? [{ type: rule.type, weight: rule.weight, evidence: hit }] : [];
  });
  const score = Math.min(100, signals.reduce((sum, s) => sum + s.weight, 0));
  return {
    score,
    signals,
    // Keep both thresholds named: count-based escalation remains useful if future
    // signals have lower individual weights than the current 12-point minimum.
    shouldEscalate: score >= SCORE_ESCALATION_THRESHOLD || signals.length >= SIGNAL_COUNT_ESCALATION_THRESHOLD,
  };
}
