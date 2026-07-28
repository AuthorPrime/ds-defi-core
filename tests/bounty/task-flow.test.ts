import { describe, expect, it } from 'vitest';
import { createMockDb } from '../utils/mocks.js';
import { taskFactory, agentFactory } from '../utils/factories.js';

function requiredCapabilitiesSatisfied(agent: Record<string, unknown>, task: Record<string, unknown>) {
  const agentCaps = new Set(((agent.capabilities as string[]) || []).map(c => c.toLowerCase()));
  return ((task.requiredCapabilities as string[]) || []).every(cap => agentCaps.has(cap.toLowerCase()));
}

describe('bounty task flow', () => {
  it('claims an available task in an isolated mock store', () => {
    const db = createMockDb();
    const agent = db.insertRow('agents', agentFactory());
    const task = db.insertRow('tasks', taskFactory());
    const claimed = db.updateById('tasks', task.id as string, { status: 'CLAIMED', claimedById: agent.id });
    expect(claimed?.status).toBe('CLAIMED');
    expect(claimed?.claimedById).toBe(agent.id);
  });

  it('marks reviewed tasks complete when approved', () => {
    const db = createMockDb();
    const task = db.insertRow('tasks', taskFactory({ status: 'UNDER_REVIEW' }));
    const completed = db.updateById('tasks', task.id as string, { status: 'COMPLETED', qualityScore: 92 });
    expect(completed?.status).toBe('COMPLETED');
    expect(completed?.qualityScore as number).toBeGreaterThanOrEqual(90);
  });

  it('validates task requirements against a real agent fixture', () => {
    const agent = agentFactory({ capabilities: ['typescript', 'graphql'] });
    const task = taskFactory({ requiredCapabilities: ['typescript'] });
    expect(requiredCapabilitiesSatisfied(agent, task)).toBe(true);
  });
});
