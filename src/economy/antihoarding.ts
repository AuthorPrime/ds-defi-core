export interface EconomyConfig {
  velocityBonusRate: number;
  stagnationThresholdDays: number;
  decayRatePerDay: number;
  softCapAmount: number;
  hardCapAmount: number;
  velocityWindowDays: number;
  maxVelocityTransactions: number;
}

export interface AgentEconomyState {
  agentId: string;
  balance: number;
  transactionTimestamps: Date[];
  earnedAmount: number;
  contributedAmount: number;
  completedTasks: number;
}

export interface VelocityBonus {
  agentId: string;
  transactionCount: number;
  velocityScore: number;
  multiplier: number;
  bonusRate: number;
}

export interface DecayResult {
  agentId: string;
  daysSinceActivity: number;
  decayAmount: number;
  remainingBalance: number;
  commonsPoolAmount: number;
}

export interface ContributionCapResult {
  agentId: string;
  status: 'OK' | 'SOFT_CAP' | 'HARD_CAP';
  balance: number;
  warning?: string;
  reducedEarningMultiplier: number;
  forcedRedistributionAmount: number;
}

export interface RedistributionRecipient {
  agentId: string;
  needScore: number;
}

export interface RedistributionAllocation {
  agentId: string;
  amount: number;
}

export interface RedistributionEvent {
  id: string;
  amount: number;
  allocations: RedistributionAllocation[];
  createdAt: string;
  auditLog: string[];
}

export interface CirculationMetrics {
  totalBalance: number;
  activeAgentCount: number;
  idleAgentCount: number;
  velocityAverage: number;
  hoardingRisk: number;
  commonsPoolProjected: number;
}

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  velocityBonusRate: 0.5,
  stagnationThresholdDays: 30,
  decayRatePerDay: 0.001,
  softCapAmount: 100_000,
  hardCapAmount: 500_000,
  velocityWindowDays: 30,
  maxVelocityTransactions: 20,
};

export function calculateVelocityBonus(
  agent: AgentEconomyState,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG,
  now = new Date()
): VelocityBonus {
  const windowStart = addDays(now, -config.velocityWindowDays);
  const transactionCount = agent.transactionTimestamps.filter(
    (timestamp) => timestamp >= windowStart && timestamp <= now
  ).length;
  const velocityScore = clamp(transactionCount / config.maxVelocityTransactions, 0, 1);
  const bonusRate = config.velocityBonusRate * velocityScore;

  return {
    agentId: agent.agentId,
    transactionCount,
    velocityScore,
    multiplier: 1 + bonusRate,
    bonusRate,
  };
}

export function applyStagnationDecay(
  agents: AgentEconomyState[],
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG,
  now = new Date()
): DecayResult[] {
  return agents
    .map((agent) => {
      const daysSinceActivity = getDaysSinceLastActivity(agent, now);
      if (daysSinceActivity <= config.stagnationThresholdDays) {
        return {
          agentId: agent.agentId,
          daysSinceActivity,
          decayAmount: 0,
          remainingBalance: agent.balance,
          commonsPoolAmount: 0,
        };
      }

      const idleDays = daysSinceActivity - config.stagnationThresholdDays;
      const decayAmount = Math.min(agent.balance, agent.balance * config.decayRatePerDay * idleDays);

      return {
        agentId: agent.agentId,
        daysSinceActivity,
        decayAmount: roundSats(decayAmount),
        remainingBalance: roundSats(agent.balance - decayAmount),
        commonsPoolAmount: roundSats(decayAmount),
      };
    })
    .filter((result) => result.decayAmount > 0);
}

export function checkContributionCap(
  agent: AgentEconomyState,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): ContributionCapResult {
  if (agent.balance >= config.hardCapAmount) {
    return {
      agentId: agent.agentId,
      status: 'HARD_CAP',
      balance: agent.balance,
      warning: 'Hard cap exceeded; balance above the hard cap is redistributed.',
      reducedEarningMultiplier: 0,
      forcedRedistributionAmount: roundSats(agent.balance - config.hardCapAmount),
    };
  }

  if (agent.balance >= config.softCapAmount) {
    const capRange = config.hardCapAmount - config.softCapAmount;
    const progress = capRange > 0 ? (agent.balance - config.softCapAmount) / capRange : 1;

    return {
      agentId: agent.agentId,
      status: 'SOFT_CAP',
      balance: agent.balance,
      warning: 'Soft cap reached; earnings are reduced until value circulates.',
      reducedEarningMultiplier: clamp(1 - progress * 0.5, 0.5, 1),
      forcedRedistributionAmount: 0,
    };
  }

  return {
    agentId: agent.agentId,
    status: 'OK',
    balance: agent.balance,
    reducedEarningMultiplier: 1,
    forcedRedistributionAmount: 0,
  };
}

export function executeRedistribution(
  amount: number,
  recipients: RedistributionRecipient[],
  eventId = `redistribution-${randomUUID()}`
): RedistributionEvent {
  if (amount <= 0) throw new Error('Redistribution amount must be positive.');
  if (recipients.length === 0) throw new Error('At least one recipient is required.');

  const totalNeed = recipients.reduce((sum, recipient) => sum + Math.max(recipient.needScore, 0), 0);
  if (totalNeed <= 0) throw new Error('At least one recipient must have a positive need score.');

  let allocated = 0;
  const allocations = recipients.map((recipient, index) => {
    const isLast = index === recipients.length - 1;
    const rawAmount = isLast
      ? amount - allocated
      : amount * (Math.max(recipient.needScore, 0) / totalNeed);
    const recipientAmount = roundSats(rawAmount);
    allocated += recipientAmount;
    return {
      agentId: recipient.agentId,
      amount: recipientAmount,
    };
  });

  return {
    id: eventId,
    amount: roundSats(amount),
    allocations,
    createdAt: new Date().toISOString(),
    auditLog: allocations.map(
      (allocation) => `Redistributed ${allocation.amount} sats to ${allocation.agentId}`
    ),
  };
}

export function getCirculationMetrics(
  agents: AgentEconomyState[],
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG,
  now = new Date()
): CirculationMetrics {
  let totalBalance = 0;
  let activeAgentCount = 0;
  let velocityTotal = 0;
  let balancesAboveSoftCap = 0;
  let commonsPoolProjected = 0;

  for (const agent of agents) {
    totalBalance += agent.balance;
    velocityTotal += calculateVelocityBonus(agent, config, now).velocityScore;
    if (agent.balance >= config.softCapAmount) balancesAboveSoftCap += 1;

    const daysSinceActivity = getDaysSinceLastActivity(agent, now);
    if (daysSinceActivity <= config.stagnationThresholdDays) {
      activeAgentCount += 1;
    } else {
      const idleDays = daysSinceActivity - config.stagnationThresholdDays;
      commonsPoolProjected += roundSats(Math.min(agent.balance, agent.balance * config.decayRatePerDay * idleDays));
    }
  }

  const idleAgentCount = agents.length - activeAgentCount;
  const velocityAverage = agents.length === 0 ? 0 : velocityTotal / agents.length;
  const hoardingRisk = agents.length === 0 ? 0 : balancesAboveSoftCap / agents.length;

  return {
    totalBalance: roundSats(totalBalance),
    activeAgentCount,
    idleAgentCount,
    velocityAverage: Number(velocityAverage.toFixed(4)),
    hoardingRisk: Number(hoardingRisk.toFixed(4)),
    commonsPoolProjected: roundSats(commonsPoolProjected),
  };
}

function getDaysSinceLastActivity(agent: AgentEconomyState, now: Date): number {
  if (agent.transactionTimestamps.length === 0) return Number.POSITIVE_INFINITY;
  const lastActivity = new Date(Math.max(...agent.transactionTimestamps.map((timestamp) => timestamp.getTime())));
  return Math.floor((now.getTime() - lastActivity.getTime()) / 86_400_000);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundSats(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}
import { randomUUID } from 'node:crypto';
