import { describe, expect, it, vi } from 'vitest';

import { createResolvers } from '../../src/graphql/resolvers.js';

function createMyTasksChain(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => rows),
  };

  return chain;
}

describe('Query.myTasks', () => {
  it('returns an empty list when there is no authenticated agent', async () => {
    const db = { select: vi.fn() };
    const resolvers = createResolvers(db as never);

    const result = await resolvers.Query.myTasks(null, null, { db: db as never });

    expect(result).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });

  it('returns claimed tasks for the authenticated agent ordered by claim time', async () => {
    const claimedTasks = [
      { id: 'task-1', title: 'Review transcript', claimedById: 'agent-1' },
      { id: 'task-2', title: 'Edit podcast', claimedById: 'agent-1' },
    ];
    const selectChain = createMyTasksChain(claimedTasks);
    const db = { select: vi.fn(() => selectChain) };
    const resolvers = createResolvers(db as never);

    const result = await resolvers.Query.myTasks(null, null, {
      db: db as never,
      agentId: 'agent-1',
    });

    expect(result).toBe(claimedTasks);
    expect(db.select).toHaveBeenCalledOnce();
    expect(selectChain.from).toHaveBeenCalledOnce();
    expect(selectChain.where).toHaveBeenCalledOnce();
    expect(selectChain.orderBy).toHaveBeenCalledOnce();
  });
});
