import { describe, expect, it } from 'vitest';
import { createResolvers } from '../../src/graphql/resolvers.js';

describe('graphql resolver shape', () => {
  const resolvers = createResolvers({} as never);
  it('exports expected query resolvers', () => {
    for (const key of ['agent', 'agents', 'bountyBoard', 'task', 'myTasks', 'economyStats']) {
      expect(typeof resolvers.Query[key]).toBe('function');
    }
  });
  it('exports expected mutation resolvers', () => {
    for (const key of ['claimTask', 'submitTask']) {
      expect(typeof resolvers.Mutation[key]).toBe('function');
    }
  });
});
