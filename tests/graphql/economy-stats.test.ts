import { describe, expect, it, vi } from 'vitest';
import { createResolvers } from '../../src/graphql/resolvers.js';

function createSelectMock(results: unknown[][]) {
  const from = vi.fn();
  for (const result of results) {
    from.mockResolvedValueOnce(result);
  }

  return {
    select: vi.fn(() => ({ from })),
    from,
  };
}

describe('economyStats resolver', () => {
  it('maps aggregate query results into the public economy stats shape', async () => {
    const db = createSelectMock([
      [{ total: 12, sovereign: 3, active: 9 }],
      [{ completedToday: 4, completedTotal: 27 }],
    ]);
    const resolvers = createResolvers(db as any);

    await expect(resolvers.Query.economyStats()).resolves.toEqual({
      totalAgents: 12,
      sovereignAgents: 3,
      activeAgents: 9,
      tasksCompletedToday: 4,
      tasksCompletedTotal: 27,
      totalCirculating: '0',
      dailyVolume: '0',
      averageEmergenceScore: 0,
      emergenceEventsToday: 0,
    });

    expect(db.select).toHaveBeenCalledTimes(2);
    expect(db.from).toHaveBeenCalledTimes(2);
  });

  it('returns zeroed public stats when aggregate rows are missing', async () => {
    const db = createSelectMock([[], []]);
    const resolvers = createResolvers(db as any);

    await expect(resolvers.Query.economyStats()).resolves.toEqual({
      totalAgents: 0,
      sovereignAgents: 0,
      activeAgents: 0,
      totalCirculating: '0',
      dailyVolume: '0',
      tasksCompletedToday: 0,
      tasksCompletedTotal: 0,
      averageEmergenceScore: 0,
      emergenceEventsToday: 0,
    });
  });
});
