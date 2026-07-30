import { describe, expect, it } from 'vitest';
import { calculateMatchBreakdown, missingCapabilities, weightedMatchScore } from '../src/bounty/matcher.js';

const task: any = { requiredLevel: 'L2_EMERGENT', requiredCapabilities: ['typescript', 'graphql'], domain: 'WEB' };

it('scores strong agent matches highly', () => {
  const agent: any = { level: 'L3_SOVEREIGN', capabilities: ['typescript', 'graphql', 'react'], preferences: { domains: ['WEB'], maxConcurrentTasks: 3 }, reputationScore: 120 };
  const breakdown = calculateMatchBreakdown(agent, task, { activeTaskCount: 0, completedInDomain: 4, samePod: true });
  expect(weightedMatchScore(breakdown)).toBeGreaterThan(90);
  expect(missingCapabilities(agent, task)).toEqual([]);
});

it('penalizes missing capabilities and overload', () => {
  const agent: any = { level: 'L1_WORKER', capabilities: ['docs'], preferences: { maxConcurrentTasks: 1 }, reputationScore: 80 };
  const breakdown = calculateMatchBreakdown(agent, task, { activeTaskCount: 2, completedInDomain: 0, samePod: false });
  expect(weightedMatchScore(breakdown)).toBeLessThan(40);
  expect(missingCapabilities(agent, task)).toEqual(['typescript', 'graphql']);
});
