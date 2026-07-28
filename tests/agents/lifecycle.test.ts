import { describe, expect, it } from 'vitest';
import { agentFactory } from '../utils/factories.js';

describe('agent lifecycle fixtures', () => {
  it('creates an L0 candidate by default when requested', () => {
    const agent = agentFactory({ level: 'L0_CANDIDATE' });
    expect(agent.level).toBe('L0_CANDIDATE');
    expect(agent.isActive).toBe(true);
  });

  it('supports level transition assertions', () => {
    const agent = agentFactory();
    const promoted = { ...agent, level: 'L2_EMERGENT', emergenceScore: 75 };
    expect(promoted.level).toBe('L2_EMERGENT');
    expect(promoted.emergenceScore).toBeGreaterThan(50);
  });
});
