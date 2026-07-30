import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { agents, podMembers, tasks, transactions } from '../../database/schema/agents.js';
import type { Context } from '../graphql/context.js';

type DB = Context['db'];
type Agent = typeof agents.$inferSelect;
type Task = typeof tasks.$inferSelect;

export interface MatchBreakdown {
  levelMatch: number;
  capabilityOverlap: number;
  domainExperience: number;
  availabilityScore: number;
  podBonus: number;
  reputationMultiplier: number;
}

export interface AgentMatch {
  agent: Agent;
  task: Task;
  score: number;
  breakdown: MatchBreakdown;
  missingCapabilities: string[];
  reasons: string[];
}

const LEVEL_RANK: Record<string, number> = {
  L0_CANDIDATE: 0,
  L1_WORKER: 1,
  L2_EMERGENT: 2,
  L3_SOVEREIGN: 3,
  L4_MANAGER: 4,
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function preferences(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

export function calculateMatchBreakdown(agent: Agent, task: Task, opts: { activeTaskCount?: number; completedInDomain?: number; samePod?: boolean } = {}): MatchBreakdown {
  const agentRank = LEVEL_RANK[agent.level] ?? 0;
  const requiredRank = LEVEL_RANK[task.requiredLevel || 'L1_WORKER'] ?? 1;
  const levelMatch = agentRank >= requiredRank ? 1 : Math.max(0, agentRank / Math.max(1, requiredRank));

  const requiredCaps = asStringArray(task.requiredCapabilities).map(c => c.toLowerCase());
  const agentCaps = new Set(asStringArray(agent.capabilities).map(c => c.toLowerCase()));
  const overlap = requiredCaps.filter(c => agentCaps.has(c)).length;
  const capabilityOverlap = requiredCaps.length === 0 ? 1 : overlap / requiredCaps.length;

  const prefs = preferences(agent.preferences);
  const preferredDomains = asStringArray(prefs.domains || prefs.interests).map(d => d.toUpperCase());
  const domainPreference = preferredDomains.includes(String(task.domain).toUpperCase()) ? 0.35 : 0;
  const domainExperience = Math.min(1, (opts.completedInDomain || 0) / 5 + domainPreference);

  const activeTaskCount = opts.activeTaskCount || 0;
  const maxConcurrent = Number(prefs.maxConcurrentTasks || 3);
  const availabilityScore = Math.max(0, 1 - activeTaskCount / Math.max(1, maxConcurrent));

  const podBonus = opts.samePod ? 1 : 0;
  const reputationMultiplier = Math.max(0.5, Math.min(1.5, (agent.reputationScore || 100) / 100));

  return { levelMatch, capabilityOverlap, domainExperience, availabilityScore, podBonus, reputationMultiplier };
}

export function weightedMatchScore(b: MatchBreakdown): number {
  return normalizeScore((b.levelMatch * 30 + b.capabilityOverlap * 25 + b.domainExperience * 20 + b.availabilityScore * 15 + b.podBonus * 10) * b.reputationMultiplier);
}

export function missingCapabilities(agent: Agent, task: Task): string[] {
  const agentCaps = new Set(asStringArray(agent.capabilities).map(c => c.toLowerCase()));
  return asStringArray(task.requiredCapabilities).filter(c => !agentCaps.has(c.toLowerCase()));
}

function reasons(agent: Agent, task: Task, b: MatchBreakdown, missing: string[]): string[] {
  const out = [];
  out.push(b.levelMatch >= 1 ? `Meets required level ${task.requiredLevel}` : `Below required level ${task.requiredLevel}`);
  out.push(missing.length ? `Missing capabilities: ${missing.join(', ')}` : 'Capabilities match task requirements');
  if (b.domainExperience > 0) out.push(`Has domain preference or experience for ${task.domain}`);
  if (b.availabilityScore >= 0.67) out.push('Available capacity');
  if (b.podBonus) out.push('Same pod bonus');
  if (b.reputationMultiplier !== 1) out.push(`Reputation multiplier ${b.reputationMultiplier.toFixed(2)}x`);
  return out;
}

export class BountyMatcher {
  constructor(private db: DB) {}

  async calculateMatchScore(agentId: string, taskId: string): Promise<AgentMatch | null> {
    const [agent] = await this.db.select().from(agents).where(and(eq(agents.id, agentId), eq(agents.isActive, true)));
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!agent || !task) return null;

    const [activeTasks, completedInDomain, samePod] = await Promise.all([
      this.activeTaskCount(agentId),
      this.completedTaskCountInDomain(agentId, task.domain),
      this.samePod(agentId, task.createdById || undefined),
    ]);

    const breakdown = calculateMatchBreakdown(agent, task, { activeTaskCount: activeTasks, completedInDomain, samePod });
    const missing = missingCapabilities(agent, task);
    return { agent, task, score: weightedMatchScore(breakdown), breakdown, missingCapabilities: missing, reasons: reasons(agent, task, breakdown, missing) };
  }

  async findMatchingAgents(taskId: string, limit = 10): Promise<AgentMatch[]> {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) return [];

    const requiredRank = LEVEL_RANK[task.requiredLevel || 'L1_WORKER'] ?? 1;
    const requiredCaps = new Set(asStringArray(task.requiredCapabilities).map(c => c.toLowerCase()));
    const maxCandidates = Math.max(limit * 5, 25);

    const candidates = (await this.db
      .select()
      .from(agents)
      .where(eq(agents.isActive, true))
      .orderBy(desc(agents.reputationScore))
      .limit(maxCandidates))
      .filter(agent => {
        const agentRank = LEVEL_RANK[agent.level] ?? 0;
        if (agentRank < requiredRank) return false;
        if (!requiredCaps.size) return true;
        const agentCaps = new Set(asStringArray(agent.capabilities).map(c => c.toLowerCase()));
        return [...requiredCaps].some(cap => agentCaps.has(cap));
      });

    const matches = (await Promise.all(candidates.map(a => this.calculateMatchScore(a.id, taskId)))).filter(Boolean) as AgentMatch[];
    return matches.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async findMatchingTasks(agentId: string, limit = 10): Promise<AgentMatch[]> {
    const [agent] = await this.db.select().from(agents).where(and(eq(agents.id, agentId), eq(agents.isActive, true)));
    if (!agent) return [];

    const agentRank = LEVEL_RANK[agent.level] ?? 0;
    const agentCaps = new Set(asStringArray(agent.capabilities).map(c => c.toLowerCase()));
    const maxCandidates = Math.max(limit * 5, 25);

    const openTasks = (await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.status, 'AVAILABLE'))
      .orderBy(desc(tasks.bountyAmount))
      .limit(maxCandidates))
      .filter(task => {
        const requiredRank = LEVEL_RANK[task.requiredLevel || 'L1_WORKER'] ?? 1;
        if (agentRank < requiredRank) return false;
        const requiredCaps = asStringArray(task.requiredCapabilities).map(c => c.toLowerCase());
        return !requiredCaps.length || requiredCaps.some(cap => agentCaps.has(cap));
      });

    const matches = (await Promise.all(openTasks.map(t => this.calculateMatchScore(agentId, t.id)))).filter(Boolean) as AgentMatch[];
    return matches.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async autoAssignTask(taskId: string): Promise<Task | null> {
    const matches = await this.findMatchingAgents(taskId, 1);
    const best = matches[0];
    if (!best || best.score < 60 || best.breakdown.capabilityOverlap < 0.5 || best.breakdown.levelMatch < 1) return null;
    const [updated] = await this.db.update(tasks).set({ status: 'CLAIMED', claimedById: best.agent.id, claimedAt: new Date(), updatedAt: new Date() }).where(and(eq(tasks.id, taskId), eq(tasks.status, 'AVAILABLE'))).returning();
    return updated || null;
  }

  async suggestSkillDevelopment(agentId: string): Promise<string[]> {
    const [agent] = await this.db.select().from(agents).where(eq(agents.id, agentId));
    if (!agent) return [];
    const openTasks = await this.db.select().from(tasks).where(eq(tasks.status, 'AVAILABLE')).limit(50);
    const have = new Set(asStringArray(agent.capabilities).map(c => c.toLowerCase()));
    const counts = new Map<string, number>();
    for (const task of openTasks) for (const cap of asStringArray(task.requiredCapabilities)) if (!have.has(cap.toLowerCase())) counts.set(cap, (counts.get(cap) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([cap]) => cap);
  }

  private async activeTaskCount(agentId: string): Promise<number> {
    const [row] = await this.db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.claimedById, agentId), inArray(tasks.status, ['CLAIMED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW'] as any)));
    return Number(row?.count || 0);
  }

  private async completedTaskCountInDomain(agentId: string, domain: string): Promise<number> {
    const [row] = await this.db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.claimedById, agentId), eq(tasks.status, 'COMPLETED'), eq(tasks.domain, domain as any)));
    return Number(row?.count || 0);
  }

  private async samePod(agentId: string, taskCreatorId?: string): Promise<boolean> {
    if (!taskCreatorId) return false;
    const memberships = await this.db.select().from(podMembers).where(inArray(podMembers.agentId, [agentId, taskCreatorId]));
    const byPod = new Map<string, Set<string>>();
    for (const m of memberships) {
      const set = byPod.get(m.podId) || new Set<string>();
      set.add(m.agentId); byPod.set(m.podId, set);
    }
    return [...byPod.values()].some(set => set.has(agentId) && set.has(taskCreatorId));
  }
}
