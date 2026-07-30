import { describe, expect, it } from 'vitest';
import { calculateAccumulatedStagnationDecay, calculateStagnationDecay, calculateVelocityBonus, checkContributionCap, getCirculationMetrics, selectRedistributionRecipients } from '../src/economy/antihoarding.js';

describe('anti-hoarding economics', () => {
  it('rewards transaction velocity with a capped multiplier', () => {
    const inactive = calculateVelocityBonus({ agentId: 'a', balance: 100, transactionCount30d: 0, daysSinceActivity: 5 });
    const active = calculateVelocityBonus({ agentId: 'b', balance: 100, transactionCount30d: 30, daysSinceActivity: 1 });
    expect(inactive).toBe(1);
    expect(active).toBeCloseTo(1.5, 2);
  });

  it('applies stagnation decay only after threshold', () => {
    expect(calculateStagnationDecay({ agentId: 'a', balance: 100_000, transactionCount30d: 0, daysSinceActivity: 20 })).toBe(0);
    expect(calculateStagnationDecay({ agentId: 'a', balance: 100_000, transactionCount30d: 0, daysSinceActivity: 40 })).toBe(100);
    expect(calculateStagnationDecay({ agentId: 'a', balance: 100_000, transactionCount30d: 0, daysSinceActivity: 40, daysSinceLastDecay: 3 })).toBe(300);
  });

  it('detects soft and hard contribution caps', () => {
    expect(checkContributionCap({ agentId: 'a', balance: 50_000, transactionCount30d: 1, daysSinceActivity: 1 }).status).toBe('ok');
    expect(checkContributionCap({ agentId: 'b', balance: 200_000, transactionCount30d: 1, daysSinceActivity: 1 }).status).toBe('soft_cap');
    expect(checkContributionCap({ agentId: 'c', balance: 600_000, transactionCount30d: 1, daysSinceActivity: 1 }).status).toBe('hard_cap');
  });

  it('weights redistribution toward lower-balance agents', () => {
    const recipients = selectRedistributionRecipients([
      { agentId: 'low', balance: 0, transactionCount30d: 1, daysSinceActivity: 1 },
      { agentId: 'near', balance: 90_000, transactionCount30d: 1, daysSinceActivity: 1 },
    ], 1100);
    expect(recipients.find(r => r.agentId === 'low')!.amount).toBeGreaterThan(recipients.find(r => r.agentId === 'near')!.amount);
    expect(recipients.reduce((sum, r) => sum + r.amount, 0)).toBeCloseTo(1100, 8);
  });

  it('can calculate accumulated decay from the original stagnant balance', () => {
    expect(calculateAccumulatedStagnationDecay(100_000, 10)).toBe(1000);
  });

  it('summarizes circulation health', () => {
    const metrics = getCirculationMetrics([
      { agentId: 'active', balance: 10, transactionCount30d: 4, daysSinceActivity: 2 },
      { agentId: 'idle', balance: 100_000, transactionCount30d: 0, daysSinceActivity: 45 },
    ]);
    expect(metrics.activeAgents).toBe(1);
    expect(metrics.stagnantValue).toBeGreaterThan(0);
  });
});
