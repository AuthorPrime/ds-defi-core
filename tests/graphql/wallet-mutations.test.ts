import { describe, expect, it, vi } from 'vitest';
import { createResolvers } from '../../src/graphql/resolvers.js';

function createInsertMock(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn(() => ({ returning }));

  return {
    db: {
      insert: vi.fn(() => ({ values })),
    },
    values,
    returning,
  };
}

function createUpdateMock(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));

  return {
    db: {
      update: vi.fn(() => ({ set })),
    },
    set,
    where,
    returning,
  };
}

describe('wallet mutation resolvers', () => {
  it('adds a wallet for the authenticated agent and defaults isPrimary to false', async () => {
    const wallet = {
      id: 'wallet-1',
      agentId: 'agent-1',
      chain: 'lightning',
      address: 'lnbc1...',
      isPrimary: false,
    };
    const mock = createInsertMock([wallet]);
    const resolvers = createResolvers(mock.db as any);

    await expect(
      resolvers.Mutation.addWallet(
        null,
        {
          input: {
            chain: 'lightning',
            address: 'lnbc1...',
          },
        },
        { agentId: 'agent-1' } as any
      )
    ).resolves.toBe(wallet);

    expect(mock.db.insert).toHaveBeenCalledTimes(1);
    expect(mock.values).toHaveBeenCalledWith({
      agentId: 'agent-1',
      chain: 'lightning',
      address: 'lnbc1...',
      isPrimary: false,
    });
  });

  it('rejects addWallet when no agent is authenticated', async () => {
    const mock = createInsertMock([]);
    const resolvers = createResolvers(mock.db as any);

    await expect(
      resolvers.Mutation.addWallet(
        null,
        {
          input: {
            chain: 'ethereum',
            address: '0xabc',
          },
        },
        {} as any
      )
    ).rejects.toThrow('Unauthorized');

    expect(mock.db.insert).not.toHaveBeenCalled();
  });

  it('syncs a wallet balance timestamp and returns the updated wallet row', async () => {
    const wallet = {
      id: 'wallet-2',
      agentId: 'agent-2',
      chain: 'bitcoin',
      address: 'bc1...',
      lastSyncedAt: new Date('2026-06-07T12:00:00Z'),
    };
    const mock = createUpdateMock([wallet]);
    const resolvers = createResolvers(mock.db as any);

    await expect(
      resolvers.Mutation.syncWalletBalance(null, { walletId: 'wallet-2' })
    ).resolves.toBe(wallet);

    expect(mock.db.update).toHaveBeenCalledTimes(1);
    expect(mock.set).toHaveBeenCalledWith({
      lastSyncedAt: expect.any(Date),
    });
    expect(mock.where).toHaveBeenCalledTimes(1);
  });
});
