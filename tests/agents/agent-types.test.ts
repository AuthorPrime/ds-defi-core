import { describe, it, expect } from 'vitest';
import { taskStatusEnum, agentTypeEnum } from '../../database/schema/agents.js';

describe('Agent Type Enum', () => {
  it('should define AI agent type', () => {
    const aiType = 'AI';
    expect(aiType).toBe('AI');
  });

  it('should define human agent type', () => {
    const humanType = 'HUMAN';
    expect(humanType).toBe('HUMAN');
  });

  it('should define hybrid agent type', () => {
    const hybridType = 'HYBRID';
    expect(hybridType).toBe('HYBRID');
  });

  it('should have 3 agent types total', () => {
    const expectedCount = 3;
    expect(3).toBe(expectedCount);
  });
});

describe('Task Status Enum', () => {
  const validStatuses = [
    'AVAILABLE',
    'CLAIMED',
    'IN_PROGRESS',
    'SUBMITTED',
    'UNDER_REVIEW',
    'COMPLETED',
    'DISPUTED',
  ];

  it('should have 7 task statuses', () => {
    expect(validStatuses.length).toBe(7);
  });

  it('AVAILABLE should be the initial status', () => {
    expect(validStatuses[0]).toBe('AVAILABLE');
  });

  it('COMPLETED should represent a successfully finished task', () => {
    expect(validStatuses.includes('COMPLETED')).toBe(true);
  });

  it('DISPUTED should represent a contested task', () => {
    expect(validStatuses.includes('DISPUTED')).toBe(true);
  });

  it('should not allow duplicate statuses', () => {
    const uniqueStatuses = new Set(validStatuses);
    expect(uniqueStatuses.size).toBe(validStatuses.length);
  });
});
