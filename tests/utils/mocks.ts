export function createMockDb() {
  const state: Record<string, Record<string, unknown>[]> = { agents: [], tasks: [], wallets: [], transactions: [], pods: [] };
  return {
    state,
    insertRow(table: string, row: Record<string, unknown>) {
      state[table] = state[table] || [];
      const cloned = { ...row };
      state[table].push(cloned);
      return cloned;
    },
    findById(table: string, id: string) { return (state[table] || []).find(row => row.id === id) || null; },
    updateById(table: string, id: string, patch: Record<string, unknown>) {
      const row = this.findById(table, id);
      if (row) Object.assign(row, patch);
      return row;
    },
    findWhere(table: string, predicate: (row: Record<string, unknown>) => boolean) { return (state[table] || []).filter(predicate); },
  };
}

export function mockGraphQLContext(agentId = 'agent-1', db?: ReturnType<typeof createMockDb>) {
  return { agentId, db, request: {} as never, reply: {} as never };
}
