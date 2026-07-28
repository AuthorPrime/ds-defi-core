import { describe, expect, it } from 'vitest';
import { mockGraphQLContext } from '../utils/mocks.js';

describe('identity context', () => {
  it('carries authenticated agent id', () => {
    expect(mockGraphQLContext('agent-42').agentId).toBe('agent-42');
  });
});
