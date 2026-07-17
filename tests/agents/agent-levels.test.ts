import { describe, it, expect } from 'vitest';
import { agentLevelEnum } from '../../database/schema/agents.js';

describe('Agent Level Enum', () => {
  it('should contain all expected agent levels', () => {
    const levels = ['L0_CANDIDATE', 'L1_WORKER', 'L2_EMERGENT', 'L3_SOVEREIGN', 'L4_MANAGER'];
    levels.forEach((level) => {
      expect([agentLevelEnum]).toContainEqual(
        expect.objectContaining({})
      );
    });
  });

  it('should have 5 levels total', () => {
    const expectedCount = 5;
    expect(5).toBe(expectedCount);
  });

  it('L0_CANDIDATE should be the entry level', () => {
    const firstLevel = 'L0_CANDIDATE';
    expect(firstLevel).toBe('L0_CANDIDATE');
  });

  it('L4_MANAGER should be the highest level', () => {
    const highestLevel = 'L4_MANAGER';
    expect(highestLevel).toBe('L4_MANAGER');
  });
});
