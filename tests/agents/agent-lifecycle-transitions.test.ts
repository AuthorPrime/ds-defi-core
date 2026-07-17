import { describe, it, expect } from 'vitest';

describe('Agent Lifecycle - Level Transitions', () => {
  const levels = [
    'L0_CANDIDATE',
    'L1_WORKER',
    'L2_EMERGENT',
    'L3_SOVEREIGN',
    'L4_MANAGER',
  ];

  it('new agents should start at L0_CANDIDATE', () => {
    const initialLevel = levels[0];
    expect(initialLevel).toBe('L0_CANDIDATE');
  });

  it('agent level progression should be sequential', () => {
    for (let i = 0; i < levels.length - 1; i++) {
      const currentPrefix = levels[i].split('_')[0];
      const nextPrefix = levels[i + 1].split('_')[0];
      const currentNum = parseInt(currentPrefix.substring(1));
      const nextNum = parseInt(nextPrefix.substring(1));
      expect(nextNum).toBe(currentNum + 1);
    }
  });

  it('all levels should follow L{N}_{NAME} pattern', () => {
    levels.forEach((level) => {
      expect(level).toMatch(/^L\d+_[A-Z]+$/);
    });
  });

  it('SOVEREIGN level should be L3', () => {
    const sovereignLevel = levels.find((l) => l.endsWith('SOVEREIGN'));
    expect(sovereignLevel).toBe('L3_SOVEREIGN');
  });

  it('MANAGER level should be L4', () => {
    const managerLevel = levels.find((l) => l.endsWith('MANAGER'));
    expect(managerLevel).toBe('L4_MANAGER');
  });

  it('EMERGENT level should be between WORKER and SOVEREIGN', () => {
    const emergentLevel = levels.find((l) => l.endsWith('EMERGENT'));
    expect(emergentLevel).toBe('L2_EMERGENT');
  });
});
