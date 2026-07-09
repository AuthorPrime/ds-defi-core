import { describe, expect, it, vi } from 'vitest';
import { createResolvers } from '../../src/graphql/resolvers.js';

type ResolverDb = Parameters<typeof createResolvers>[0];

function mockSelectChain(result: unknown[], terminal: 'where' | 'orderBy' = 'where') {
  const orderBy = vi.fn().mockResolvedValue(result);
  const where = terminal === 'where' ? vi.fn().mockResolvedValue(result) : vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));

  return {
    chain: { from },
    from,
    where,
    orderBy,
  };
}

describe('bountyBoard resolver', () => {
  it('returns available tasks and aggregate bounty stats', async () => {
    const availableTasks = [
      { id: 'task-1', status: 'AVAILABLE', bountyAmount: '2500' },
      { id: 'task-2', status: 'AVAILABLE', bountyAmount: '1000' },
    ];
    const availableQuery = mockSelectChain(availableTasks, 'orderBy');
    const taskCountQuery = mockSelectChain([{ count: 2 }]);
    const totalBountyQuery = mockSelectChain([{ total: '3500' }]);
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(availableQuery.chain)
        .mockReturnValueOnce(taskCountQuery.chain)
        .mockReturnValueOnce(totalBountyQuery.chain),
    };

    const resolvers = createResolvers(db as unknown as ResolverDb);
    const board = await resolvers.Query.bountyBoard();

    expect(board.availableTasks()).toEqual(availableTasks);
    expect(board.taskCount).toBe(2);
    expect(board.totalBountyPool).toBe('3500');
    expect(board.domainStats).toEqual([]);
    expect(db.select).toHaveBeenCalledTimes(3);
    expect(availableQuery.orderBy).toHaveBeenCalledTimes(1);
    expect(taskCountQuery.where).toHaveBeenCalledTimes(1);
    expect(totalBountyQuery.where).toHaveBeenCalledTimes(1);
  });

  it('falls back to zero aggregate values when no rows are returned', async () => {
    const availableQuery = mockSelectChain([], 'orderBy');
    const taskCountQuery = mockSelectChain([]);
    const totalBountyQuery = mockSelectChain([]);
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(availableQuery.chain)
        .mockReturnValueOnce(taskCountQuery.chain)
        .mockReturnValueOnce(totalBountyQuery.chain),
    };

    const resolvers = createResolvers(db as unknown as ResolverDb);
    const board = await resolvers.Query.bountyBoard();

    expect(board.availableTasks()).toEqual([]);
    expect(board.taskCount).toBe(0);
    expect(board.totalBountyPool).toBe('0');
  });
});
