import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ECONOMY_CONFIG,
  applyStagnationDecay,
  calculateVelocityBonus,
  checkContributionCap,
  executeRedistribution,
  getCirculationMetrics,
  type AgentEconomyState,
} from '../../src/economy/antihoarding.js';

const now = new Date('2026-05-10T00:00:00Z');

function agent(overrides: Partial<AgentEconomyState>): AgentEconomyState {
  return {
    agentId: 'agent-1',
    balance: 0,
    transactionTimestamps: [],
    earnedAmount: 0,
    contributedAmount: 0,
    completedTasks: 0,
    ...overrides,
  };
}

describe('anti-hoarding economy mechanisms', () => {
  it('calculates velocity bonus from recent transaction activity', () => {
    const active = agent({
      transactionTimestamps: Array.from({ length: 10 }, (_, index) =>
        new Date(`2026-05-${String(index + 1).padStart(2, '0')}T00:00:00Z`)
      ),
    });

    const bonus = calculateVelocityBonus(active, DEFAULT_ECONOMY_CONFIG, now);

    expect(bonus.transactionCount).toBe(10);
    expect(bonus.velocityScore).toBe(0.5);
    expect(bonus.multiplier).toBe(1.25);
  });

  it('applies stagnation decay only after the configured idle threshold', () => {
    const results = applyStagnationDecay(
      [
        agent({
          agentId: 'idle',
          balance: 10_000,
          transactionTimestamps: [new Date('2026-03-01T00:00:00Z')],
        }),
        agent({
          agentId: 'active',
          balance: 10_000,
          transactionTimestamps: [new Date('2026-05-01T00:00:00Z')],
        }),
      ],
      DEFAULT_ECONOMY_CONFIG,
      now
    );

    expect(results).toHaveLength(1);
    expect(results[0].agentId).toBe('idle');
    expect(results[0].decayAmount).toBeGreaterThan(0);
    expect(results[0].commonsPoolAmount).toBe(results[0].decayAmount);
  });

  it('checks soft and hard contribution caps', () => {
    const soft = checkContributionCap(agent({ balance: 200_000 }));
    const hard = checkContributionCap(agent({ balance: 650_000 }));

    expect(soft.status).toBe('SOFT_CAP');
    expect(soft.reducedEarningMultiplier).toBeLessThan(1);
    expect(hard.status).toBe('HARD_CAP');
    expect(hard.reducedEarningMultiplier).toBe(0);
    expect(hard.forcedRedistributionAmount).toBe(150_000);
  });

  it('executes weighted redistribution with an audit log', () => {
    const event = executeRedistribution(
      1_000,
      [
        { agentId: 'low-need', needScore: 1 },
        { agentId: 'high-need', needScore: 3 },
      ],
      'event-1'
    );

    expect(event.id).toBe('event-1');
    expect(event.allocations).toEqual([
      { agentId: 'low-need', amount: 250 },
      { agentId: 'high-need', amount: 750 },
    ]);
    expect(event.auditLog).toHaveLength(2);
  });

  it('reports circulation metrics for active, idle, and capped agents', () => {
    const metrics = getCirculationMetrics(
      [
        agent({
          agentId: 'active',
          balance: 50_000,
          transactionTimestamps: [new Date('2026-05-08T00:00:00Z')],
        }),
        agent({
          agentId: 'idle',
          balance: 20_000,
          transactionTimestamps: [new Date('2026-03-01T00:00:00Z')],
        }),
        agent({
          agentId: 'capped',
          balance: 600_000,
          transactionTimestamps: [new Date('2026-05-02T00:00:00Z')],
        }),
      ],
      DEFAULT_ECONOMY_CONFIG,
      now
    );

    expect(metrics.totalBalance).toBe(670_000);
    expect(metrics.activeAgentCount).toBe(2);
    expect(metrics.idleAgentCount).toBe(1);
    expect(metrics.hoardingRisk).toBeCloseTo(1 / 3, 4);
    expect(metrics.commonsPoolProjected).toBeGreaterThan(0);
  });
});
