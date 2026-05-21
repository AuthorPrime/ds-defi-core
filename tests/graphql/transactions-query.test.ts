import { describe, expect, it, vi } from 'vitest';

import { createResolvers } from '../../src/graphql/resolvers.js';

type ResolverDb = Parameters<typeof createResolvers>[0];

function createTransactionsQuery(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    orderBy: vi.fn(() => rows),
  };

  return chain;
}

describe('Query.transactions', () => {
  it('returns transactions with default pagination and ordering', async () => {
    const transactionRows = [
      { id: 'tx-1', amount: '25', transactionType: 'ZAP' },
      { id: 'tx-2', amount: '100', transactionType: 'STIPEND' },
    ];
    const query = createTransactionsQuery(transactionRows);
    const db = { select: vi.fn(() => query) };

    const resolvers = createResolvers(db as unknown as ResolverDb);
    const result = await resolvers.Query.transactions(null, {});

    expect(result).toBe(transactionRows);
    expect(db.select).toHaveBeenCalledOnce();
    expect(query.from).toHaveBeenCalledOnce();
    expect(query.where).toHaveBeenCalledWith(undefined);
    expect(query.limit).toHaveBeenCalledWith(50);
    expect(query.offset).toHaveBeenCalledWith(0);
    expect(query.orderBy).toHaveBeenCalledOnce();
  });

  it('applies agent, type, limit, and offset filters', async () => {
    const transactionRows = [{ id: 'tx-3', fromAgentId: 'agent-1', transactionType: 'TASK_PAYMENT' }];
    const query = createTransactionsQuery(transactionRows);
    const db = { select: vi.fn(() => query) };

    const resolvers = createResolvers(db as unknown as ResolverDb);
    const result = await resolvers.Query.transactions(null, {
      agentId: 'agent-1',
      type: 'TASK_PAYMENT',
      limit: 10,
      offset: 20,
    });

    expect(result).toBe(transactionRows);
    expect(query.where).toHaveBeenCalledOnce();
    expect(query.where.mock.calls[0][0]).toBeDefined();
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(query.offset).toHaveBeenCalledWith(20);
    expect(query.orderBy).toHaveBeenCalledOnce();
  });
});
