export interface EconomyConfig {
  velocityBonusRate: number;
  stagnationThresholdDays: number;
  decayRatePerDay: number;
  softCapAmount: number;
  hardCapAmount: number;
}

export interface AgentEconomyState {
  agentId: string;
  balance: number;
  transactionCount30d: number;
  daysSinceActivity: number;
  daysSinceLastDecay?: number;
  contributionScore?: number;
}

export interface CapStatus {
  status: 'ok' | 'soft_cap' | 'hard_cap';
  excess: number;
  earningMultiplier: number;
  warning?: string;
}

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  velocityBonusRate: 0.5,
  stagnationThresholdDays: 30,
  decayRatePerDay: 0.001,
  softCapAmount: 100_000,
  hardCapAmount: 500_000,
};

export function calculateVelocityScore(transactionCount30d: number): number {
  if (!Number.isFinite(transactionCount30d) || transactionCount30d <= 0) return 0;
  return Math.min(1, Math.log1p(transactionCount30d) / Math.log1p(30));
}

export function calculateVelocityBonus(agent: AgentEconomyState, config: EconomyConfig = DEFAULT_ECONOMY_CONFIG): number {
  const velocityScore = calculateVelocityScore(agent.transactionCount30d);
  return 1 + velocityScore * config.velocityBonusRate;
}

export function calculateStagnationDecay(agent: AgentEconomyState, config: EconomyConfig = DEFAULT_ECONOMY_CONFIG): number {
  if (agent.daysSinceActivity <= config.stagnationThresholdDays || agent.balance <= 0) return 0;
  const elapsedDays = Math.max(1, agent.daysSinceLastDecay ?? 1);
  return Math.min(agent.balance, agent.balance * config.decayRatePerDay * elapsedDays);
}

export function calculateAccumulatedStagnationDecay(balanceAtStagnation: number, daysPastThreshold: number, config: EconomyConfig = DEFAULT_ECONOMY_CONFIG): number {
  if (balanceAtStagnation <= 0 || daysPastThreshold <= 0) return 0;
  return Math.min(balanceAtStagnation, balanceAtStagnation * config.decayRatePerDay * daysPastThreshold);
}

export function checkContributionCap(agent: AgentEconomyState, config: EconomyConfig = DEFAULT_ECONOMY_CONFIG): CapStatus {
  if (agent.balance >= config.hardCapAmount) {
    return {
      status: 'hard_cap',
      excess: agent.balance - config.hardCapAmount,
      earningMultiplier: 0,
      warning: 'Hard cap reached: excess should be redistributed',
    };
  }
  if (agent.balance >= config.softCapAmount) {
    const capRange = Math.max(1, config.hardCapAmount - config.softCapAmount);
    const pressure = (agent.balance - config.softCapAmount) / capRange;
    return {
      status: 'soft_cap',
      excess: agent.balance - config.softCapAmount,
      earningMultiplier: Math.max(0.25, 1 - pressure * 0.75),
      warning: 'Soft cap reached: circulation is encouraged',
    };
  }
  return { status: 'ok', excess: 0, earningMultiplier: 1 };
}

export function selectRedistributionRecipients(agents: AgentEconomyState[], amount: number, config: EconomyConfig = DEFAULT_ECONOMY_CONFIG): Array<{ agentId: string; amount: number }> {
  const eligible = agents.filter(a => a.balance < config.softCapAmount);
  if (!eligible.length || amount <= 0) return [];
  const weights = eligible.map(a => Math.max(1, config.softCapAmount - a.balance));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let distributed = 0;
  return eligible.map((agent, i) => {
    const raw = amount * weights[i] / totalWeight;
    const rounded = i === eligible.length - 1 ? Math.round((amount - distributed) * 1e8) / 1e8 : Math.round(raw * 1e8) / 1e8;
    distributed += rounded;
    return { agentId: agent.agentId, amount: rounded };
  });
}

export function getCirculationMetrics(agents: AgentEconomyState[], config: EconomyConfig = DEFAULT_ECONOMY_CONFIG) {
  const totalBalance = agents.reduce((sum, a) => sum + a.balance, 0);
  const stagnantValue = agents.reduce((sum, a) => sum + calculateStagnationDecay(a, config), 0);
  const activeAgents = agents.filter(a => a.daysSinceActivity <= config.stagnationThresholdDays).length;
  const cappedAgents = agents.filter(a => checkContributionCap(a, config).status !== 'ok').length;
  return {
    totalBalance,
    stagnantValue,
    activeAgents,
    cappedAgents,
    averageVelocityScore: agents.length ? agents.reduce((s, a) => s + calculateVelocityScore(a.transactionCount30d), 0) / agents.length : 0,
    circulationRatio: agents.length ? activeAgents / agents.length : 0,
  };
}
