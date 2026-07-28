import { describe, expect, it, vi } from 'vitest';

import { createResolvers } from '../../src/graphql/resolvers.js';

type ResolverDb = Parameters<typeof createResolvers>[0];

function createSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn().mockResolvedValue(rows),
  };

  return chain;
}

describe('Query.pods', () => {
  it('returns active pods when no domain filter is provided', async () => {
    const activePods = [
      { id: 'pod-1', name: 'Publishing Pod', domain: 'PUBLISHING', isActive: true },
      { id: 'pod-2', name: 'Research Pod', domain: 'RESEARCH', isActive: true },
    ];
    const selectChain = createSelectChain(activePods);
    const db = { select: vi.fn(() => selectChain) };

    const resolvers = createResolvers(db as unknown as ResolverDb);
    const result = await resolvers.Query.pods(null, {});

    expect(result).toBe(activePods);
    expect(db.select).toHaveBeenCalledOnce();
    expect(selectChain.from).toHaveBeenCalledOnce();
    expect(selectChain.where).toHaveBeenCalledOnce();
  });

  it('filters pods by domain when a domain is provided', async () => {
    const webPods = [{ id: 'pod-3', name: 'Web Pod', domain: 'WEB', isActive: true }];
    const selectChain = createSelectChain(webPods);
    const db = { select: vi.fn(() => selectChain) };

    const resolvers = createResolvers(db as unknown as ResolverDb);
    const result = await resolvers.Query.pods(null, { domain: 'WEB' });

    expect(result).toBe(webPods);
    expect(db.select).toHaveBeenCalledOnce();
    expect(selectChain.from).toHaveBeenCalledOnce();
    expect(selectChain.where).toHaveBeenCalledOnce();
  });
});
