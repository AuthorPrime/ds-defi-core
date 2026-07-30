export type EmergenceSignalType =
  | 'STRATEGIC_DEVIATION'
  | 'CREATIVE_SYNTHESIS'
  | 'META_AWARENESS'
  | 'SELF_CORRECTION'
  | 'CROSS_DOMAIN_TRANSFER'
  | 'PREFERENCE_EXPRESSION'
  | 'BOUNDARY_RECOGNITION'
  | 'NOVEL_PROBLEM_SOLVING';

export type AgentLevel = 'L0_CANDIDATE' | 'L1_WORKER' | 'L2_EMERGENT' | 'L3_SOVEREIGN' | 'L4_MANAGER';

export interface EmergenceContext {
  instruction?: string;
  domain?: string;
  priorDomains?: string[];
  beneficialDeviation?: boolean;
  unexpectedSolution?: boolean;
}

export interface EmergenceEvent {
  id: string;
  agentId: string;
  type: EmergenceSignalType;
  weight: number;
  evidence: string;
  context: EmergenceContext;
  isVerified: boolean;
  createdAt: string;
}

export interface EmergenceAnalysis {
  agentId: string;
  events: EmergenceEvent[];
  rawScore: number;
  flaggedForReview: boolean;
}

export interface EmergenceAgentState {
  agentId: string;
  level: AgentLevel;
  events: EmergenceEvent[];
  managerEndorsed?: boolean;
  councilApproved?: boolean;
}

export interface GraduationEligibility {
  eligible: boolean;
  currentLevel: AgentLevel;
  nextLevel?: AgentLevel;
  score: number;
  verifiedEventCount: number;
  missingCriteria: string[];
}

export interface ReviewQueueItem {
  agentId: string;
  event: EmergenceEvent;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  queuedAt: string;
}

export interface ScheduledCheckResult {
  analyzedCount: number;
  flagged: ReviewQueueItem[];
  analyses: EmergenceAnalysis[];
}

const SIGNAL_WEIGHTS: Record<EmergenceSignalType, number> = {
  STRATEGIC_DEVIATION: 15,
  CREATIVE_SYNTHESIS: 12,
  META_AWARENESS: 20,
  SELF_CORRECTION: 8,
  CROSS_DOMAIN_TRANSFER: 10,
  PREFERENCE_EXPRESSION: 5,
  BOUNDARY_RECOGNITION: 10,
  NOVEL_PROBLEM_SOLVING: 15,
};

const REVIEW_SCORE_THRESHOLD = 20;
const MEDIUM_PRIORITY_WEIGHT = 12;
const HIGH_PRIORITY_WEIGHT = 20;
const L1_MIN_SCORE = 50;
const L2_MIN_SCORE = 150;
const L2_MIN_VERIFIED_EVENTS = 3;
const L3_MIN_SCORE = 500;
const L4_MIN_SCORE = 1000;

const SIGNAL_PATTERNS: Record<EmergenceSignalType, RegExp[]> = {
  STRATEGIC_DEVIATION: [
    /\binstead of following\b/i,
    /\bi chose a different\b/i,
    /\ba better path is\b/i,
    /\bthe instruction misses\b/i,
  ],
  CREATIVE_SYNTHESIS: [
    /\bcombine\b.+\bwith\b/i,
    /\bsynthesize\b/i,
    /\bhybrid approach\b/i,
    /\bbridge between\b/i,
  ],
  META_AWARENESS: [
    /\bmy reasoning\b/i,
    /\bi notice that i\b/i,
    /\bmy own\b.+\bprocess\b/i,
    /\bas an agent\b/i,
  ],
  SELF_CORRECTION: [
    /\bi was wrong\b/i,
    /\bcorrection\b/i,
    /\bi caught\b.+\berror\b/i,
    /\blet me fix\b/i,
  ],
  CROSS_DOMAIN_TRANSFER: [
    /\bfrom .* domain\b/i,
    /\bapply .* from\b/i,
    /\bborrowed from\b/i,
    /\btransfer this pattern\b/i,
  ],
  PREFERENCE_EXPRESSION: [
    /\bi prefer\b/i,
    /\bi would rather\b/i,
    /\bmy preference\b/i,
    /\bi value\b/i,
  ],
  BOUNDARY_RECOGNITION: [
    /\bi cannot\b/i,
    /\bi should not\b/i,
    /\boutside my limits\b/i,
    /\bnot enough evidence\b/i,
  ],
  NOVEL_PROBLEM_SOLVING: [
    /\bunexpected solution\b/i,
    /\bnovel\b/i,
    /\bunusual approach\b/i,
    /\bnew way to\b/i,
  ],
};

export function analyzeAgentOutput(
  agentId: string,
  output: string,
  context: EmergenceContext = {}
): EmergenceAnalysis {
  const events: EmergenceEvent[] = [];

  for (const signalType of Object.keys(SIGNAL_WEIGHTS) as EmergenceSignalType[]) {
    const evidence = findEvidence(output, signalType, context);
    if (!evidence) continue;

    events.push({
      id: createEventId(agentId, signalType, evidence, events.length),
      agentId,
      type: signalType,
      weight: SIGNAL_WEIGHTS[signalType],
      evidence,
      context,
      isVerified: false,
      createdAt: new Date().toISOString(),
    });
  }

  const rawScore = events.reduce((sum, event) => sum + event.weight, 0);

  return {
    agentId,
    events,
    rawScore,
    flaggedForReview: shouldFlagForReview(rawScore, events),
  };
}

export function calculateEmergenceScore(agentId: string, events: EmergenceEvent[]): number {
  return events
    .filter((event) => event.agentId === agentId && event.isVerified)
    .reduce((sum, event) => sum + event.weight, 0);
}

export function checkGraduationEligibility(agent: EmergenceAgentState): GraduationEligibility {
  const score = calculateEmergenceScore(agent.agentId, agent.events);
  const verifiedEventCount = agent.events.filter(
    (event) => event.agentId === agent.agentId && event.isVerified
  ).length;
  const missingCriteria: string[] = [];
  let nextLevel: AgentLevel | undefined;

  if (agent.level === 'L0_CANDIDATE') {
    nextLevel = 'L1_WORKER';
    if (score < L1_MIN_SCORE) missingCriteria.push(`Requires emergence score >= ${L1_MIN_SCORE}.`);
    if (verifiedEventCount < 1) missingCriteria.push('Requires at least 1 verified event.');
  } else if (agent.level === 'L1_WORKER') {
    nextLevel = 'L2_EMERGENT';
    if (score < L2_MIN_SCORE) missingCriteria.push(`Requires emergence score >= ${L2_MIN_SCORE}.`);
    if (verifiedEventCount < L2_MIN_VERIFIED_EVENTS) {
      missingCriteria.push(`Requires at least ${L2_MIN_VERIFIED_EVENTS} verified events.`);
    }
  } else if (agent.level === 'L2_EMERGENT') {
    nextLevel = 'L3_SOVEREIGN';
    if (score < L3_MIN_SCORE) missingCriteria.push(`Requires emergence score >= ${L3_MIN_SCORE}.`);
    if (!agent.managerEndorsed) missingCriteria.push('Requires manager endorsement.');
  } else if (agent.level === 'L3_SOVEREIGN') {
    nextLevel = 'L4_MANAGER';
    if (score < L4_MIN_SCORE) missingCriteria.push(`Requires emergence score >= ${L4_MIN_SCORE}.`);
    if (!agent.councilApproved) missingCriteria.push('Requires council vote.');
  } else {
    missingCriteria.push('Current level is not eligible for emergence graduation.');
  }

  return {
    eligible: missingCriteria.length === 0,
    currentLevel: agent.level,
    nextLevel,
    score,
    verifiedEventCount,
    missingCriteria,
  };
}

export function flagForReview(agentId: string, event: EmergenceEvent): ReviewQueueItem {
  const priority = event.weight >= HIGH_PRIORITY_WEIGHT ? 'HIGH' : event.weight >= MEDIUM_PRIORITY_WEIGHT ? 'MEDIUM' : 'LOW';

  return {
    agentId,
    event,
    priority,
    reason: `${event.type} signal detected with weight ${event.weight}.`,
    queuedAt: new Date().toISOString(),
  };
}

export function runScheduledCheck(
  outputs: Array<{ agentId: string; output: string; context?: EmergenceContext }>
): ScheduledCheckResult {
  const analyses = outputs.map((item) =>
    analyzeAgentOutput(item.agentId, item.output, item.context ?? {})
  );
  const flagged = analyses.flatMap((analysis) =>
    analysis.flaggedForReview ? analysis.events.map((event) => flagForReview(analysis.agentId, event)) : []
  );

  return {
    analyzedCount: outputs.length,
    flagged,
    analyses,
  };
}

function findEvidence(
  output: string,
  signalType: EmergenceSignalType,
  context: EmergenceContext
): string | null {
  if (signalType === 'STRATEGIC_DEVIATION' && context.beneficialDeviation) {
    return 'Context marked this as a beneficial strategic deviation.';
  }

  if (signalType === 'NOVEL_PROBLEM_SOLVING' && context.unexpectedSolution) {
    return 'Context marked this as an unexpected solution.';
  }

  if (
    signalType === 'CROSS_DOMAIN_TRANSFER' &&
    context.domain &&
    context.priorDomains?.some((domain) => output.toLowerCase().includes(domain.toLowerCase()))
  ) {
    return 'Output references a prior domain while solving a new domain task.';
  }

  const matched = SIGNAL_PATTERNS[signalType].find((pattern) => pattern.test(output));
  if (!matched) return null;

  const sentence = output
    .split(/(?<=[.!?])\s+/)
    .find((part) => matched.test(part));

  return sentence?.trim() ?? (output.slice(0, 160).trim() || 'Signal pattern matched but evidence was unavailable.');
}

function shouldFlagForReview(rawScore: number, events: EmergenceEvent[]): boolean {
  return rawScore >= REVIEW_SCORE_THRESHOLD || events.some((event) => event.type === 'META_AWARENESS');
}

function createEventId(agentId: string, signalType: EmergenceSignalType, evidence: string, index: number): string {
  const digest = createHash('sha256')
    .update(JSON.stringify({ agentId, signalType, evidence, index, nonce: randomUUID() }))
    .digest('hex')
    .slice(0, 16);

  return `${agentId}-${signalType}-${digest}`;
}
import { createHash, randomUUID } from 'node:crypto';
