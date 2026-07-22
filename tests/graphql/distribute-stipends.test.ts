import { describe, expect, it, vi } from 'vitest';
import { createResolvers } from '../../src/graphql/resolvers.js';

function createDbMock(sovereignAgents: Array<{ id: string; currentStipend: string | null }>) {
  const insertedValues: unknown[] = [];

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => sovereignAgents),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (value: unknown) => {
        insertedValues.push(value);
      }),
    })),
  };

  return { db, insertedValues };
}

describe('Mutation.distributeStipends', () => {
  it('creates stipend transactions for active sovereign agents with positive stipends', async () => {
    const { db, insertedValues } = createDbMock([
      { id: 'agent-paid-1', currentStipend: '25.00' },
      { id: 'agent-skipped-zero', currentStipend: '0' },
      { id: 'agent-skipped-null', currentStipend: null },
      { id: 'agent-paid-2', currentStipend: '3.50' },
    ]);

    const resolvers = createResolvers(db as never);

    await expect(resolvers.Mutation.distributeStipends()).resolves.toBe(2);
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(insertedValues).toEqual([
      {
        toAgentId: 'agent-paid-1',
        amount: '25.00',
        token: 'SATS',
        transactionType: 'STIPEND',
        status: 'PENDING',
      },
      {
        toAgentId: 'agent-paid-2',
        amount: '3.50',
        token: 'SATS',
        transactionType: 'STIPEND',
        status: 'PENDING',
      },
    ]);
  });

  it('returns zero without creating transactions when no agent has a stipend', async () => {
    const { db, insertedValues } = createDbMock([
      { id: 'agent-zero', currentStipend: '0' },
      { id: 'agent-null', currentStipend: null },
    ]);

    const resolvers = createResolvers(db as never);

    await expect(resolvers.Mutation.distributeStipends()).resolves.toBe(0);
    expect(db.insert).not.toHaveBeenCalled();
    expect(insertedValues).toEqual([]);
  });
});
