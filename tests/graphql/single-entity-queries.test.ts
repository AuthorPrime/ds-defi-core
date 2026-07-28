import { describe, expect, it, vi } from 'vitest';

import { createResolvers } from '../../src/graphql/resolvers.js';

type ResolverDb = Parameters<typeof createResolvers>[0];

function createSingleEntityQuery(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => rows),
  };

  return chain;
}

describe('single entity GraphQL queries', () => {
  it('returns the first matching agent', async () => {
    const agent = { id: 'agent-1', displayName: 'Sovereign Builder' };
    const query = createSingleEntityQuery([agent]);
    const db = { select: vi.fn(() => query) };

    const resolvers = createResolvers(db as unknown as ResolverDb);
    const result = await resolvers.Query.agent(null, { id: 'agent-1' });

    expect(result).toBe(agent);
    expect(db.select).toHaveBeenCalledOnce();
    expect(query.from).toHaveBeenCalledOnce();
    expect(query.where).toHaveBeenCalledOnce();
  });

  it('returns null when an agent is not found', async () => {
    const query = createSingleEntityQuery([]);
    const db = { select: vi.fn(() => query) };

    const resolvers = createResolvers(db as unknown as ResolverDb);
    const result = await resolvers.Query.agent(null, { id: 'missing-agent' });

    expect(result).toBeNull();
    expect(query.where).toHaveBeenCalledOnce();
  });

  it('returns the first matching task', async () => {
    const task = { id: 'task-1', title: 'Write tests', status: 'AVAILABLE' };
    const query = createSingleEntityQuery([task]);
    const db = { select: vi.fn(() => query) };

    const resolvers = createResolvers(db as unknown as ResolverDb);
    const result = await resolvers.Query.task(null, { id: 'task-1' });

    expect(result).toBe(task);
    expect(db.select).toHaveBeenCalledOnce();
    expect(query.from).toHaveBeenCalledOnce();
    expect(query.where).toHaveBeenCalledOnce();
  });

  it('returns null when a task is not found', async () => {
    const query = createSingleEntityQuery([]);
    const db = { select: vi.fn(() => query) };

    const resolvers = createResolvers(db as unknown as ResolverDb);
    const result = await resolvers.Query.task(null, { id: 'missing-task' });

    expect(result).toBeNull();
    expect(query.where).toHaveBeenCalledOnce();
  });

  it('returns the first matching pod', async () => {
    const pod = { id: 'pod-1', name: 'Testing Pod', isActive: true };
    const query = createSingleEntityQuery([pod]);
    const db = { select: vi.fn(() => query) };

    const resolvers = createResolvers(db as unknown as ResolverDb);
    const result = await resolvers.Query.pod(null, { id: 'pod-1' });

    expect(result).toBe(pod);
    expect(db.select).toHaveBeenCalledOnce();
    expect(query.from).toHaveBeenCalledOnce();
    expect(query.where).toHaveBeenCalledOnce();
  });

  it('returns null when a pod is not found', async () => {
    const query = createSingleEntityQuery([]);
    const db = { select: vi.fn(() => query) };

    const resolvers = createResolvers(db as unknown as ResolverDb);
    const result = await resolvers.Query.pod(null, { id: 'missing-pod' });

    expect(result).toBeNull();
    expect(query.where).toHaveBeenCalledOnce();
  });
});
