export type AgentLevel = 'L0_CANDIDATE' | 'L1_WORKER' | 'L2_EMERGENT' | 'L3_SOVEREIGN' | 'L4_MANAGER';

export interface MatchAgent {
  id: string;
  level: AgentLevel;
  capabilities: string[];
  interests?: string[];
  preferredDomains?: string[];
  activeTaskCount: number;
  maxConcurrentTasks: number;
  reputationScore: number;
  completedTasksByDomain?: Record<string, number>;
  podIds?: string[];
  optInAutoAssign?: boolean;
}

export interface MatchTask {
  id: string;
  domain: string;
  requiredLevel: AgentLevel;
  requiredCapabilities: string[];
  tags?: string[];
  podId?: string;
  status: 'AVAILABLE' | 'CLAIMED' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNDER_REVIEW' | 'COMPLETED' | 'DISPUTED';
}

export interface MatchDataSource {
  agents: MatchAgent[];
  tasks: MatchTask[];
}

export interface MatchScoreBreakdown {
  levelMatch: number;
  capabilityOverlap: number;
  domainExperience: number;
  availabilityScore: number;
  podBonus: number;
  preferenceScore: number;
  reputationMultiplier: number;
}

export interface MatchResult {
  agentId: string;
  taskId: string;
  score: number;
  breakdown: MatchScoreBreakdown;
  reasons: string[];
}

export interface SkillDevelopmentSuggestion {
  capability: string;
  matchingTaskCount: number;
  reason: string;
}

const LEVEL_RANK: Record<AgentLevel, number> = {
  L0_CANDIDATE: 0,
  L1_WORKER: 1,
  L2_EMERGENT: 2,
  L3_SOVEREIGN: 3,
  L4_MANAGER: 4,
};

export function findMatchingAgents(taskId: string, data: MatchDataSource): MatchResult[] {
  const index = createMatchIndex(data);
  const task = getTask(taskId, index);
  if (task.status !== 'AVAILABLE') return [];

  return data.agents
    .map((agent) => calculateMatchScoreWithIndex(agent.id, task.id, index))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function findMatchingTasks(agentId: string, data: MatchDataSource): MatchResult[] {
  const index = createMatchIndex(data);
  getAgent(agentId, index);

  return data.tasks
    .filter((task) => task.status === 'AVAILABLE')
    .map((task) => calculateMatchScoreWithIndex(agentId, task.id, index))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function calculateMatchScore(
  agentId: string,
  taskId: string,
  data: MatchDataSource
): MatchResult {
  return calculateMatchScoreWithIndex(agentId, taskId, createMatchIndex(data));
}

interface MatchIndex {
  agentsById: Map<string, MatchAgent>;
  tasksById: Map<string, MatchTask>;
}

function calculateMatchScoreWithIndex(agentId: string, taskId: string, index: MatchIndex): MatchResult {
  const agent = getAgent(agentId, index);
  const task = getTask(taskId, index);
  const breakdown = buildBreakdown(agent, task);
  const baseScore =
    breakdown.levelMatch * 30 +
    breakdown.capabilityOverlap * 25 +
    breakdown.domainExperience * 20 +
    breakdown.availabilityScore * 15 +
    breakdown.podBonus * 10 +
    breakdown.preferenceScore * 5;
  const score = Math.round(baseScore * breakdown.reputationMultiplier);

  return {
    agentId,
    taskId,
    score,
    breakdown,
    reasons: buildReasons(agent, task, breakdown),
  };
}

export function autoAssignTask(taskId: string, data: MatchDataSource): MatchResult | null {
  const index = createMatchIndex(data);
  const eligible = findMatchingAgents(taskId, data).filter((result) => {
    const agent = getAgent(result.agentId, index);
    return agent.optInAutoAssign === true && result.breakdown.availabilityScore > 0;
  });

  return eligible[0] ?? null;
}

export function suggestSkillDevelopment(
  agentId: string,
  data: MatchDataSource,
  limit = 5
): SkillDevelopmentSuggestion[] {
  const agent = getAgent(agentId, data);
  const ownedCapabilities = new Set(agent.capabilities.map(normalize));
  const counts = new Map<string, { capability: string; count: number }>();

  for (const task of data.tasks.filter((item) => item.status === 'AVAILABLE')) {
    for (const capability of task.requiredCapabilities) {
      const normalized = normalize(capability);
      if (!ownedCapabilities.has(normalized)) {
        const current = counts.get(normalized);
        counts.set(normalized, {
          capability: current?.capability ?? normalized,
          count: (current?.count ?? 0) + 1,
        });
      }
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.capability.localeCompare(b.capability))
    .slice(0, limit)
    .map(({ capability, count: matchingTaskCount }) => ({
      capability,
      matchingTaskCount,
      reason: `${matchingTaskCount} available task(s) require ${capability}.`,
    }));
}

function buildBreakdown(agent: MatchAgent, task: MatchTask): MatchScoreBreakdown {
  const levelMatch = LEVEL_RANK[agent.level] >= LEVEL_RANK[task.requiredLevel] ? 1 : 0;
  const capabilityOverlap = calculateCapabilityOverlap(agent.capabilities, task.requiredCapabilities);
  const domainExperience = clamp((agent.completedTasksByDomain?.[task.domain] ?? 0) / 10, 0, 1);
  const availabilityScore =
    agent.maxConcurrentTasks <= 0
      ? 0
      : clamp((agent.maxConcurrentTasks - agent.activeTaskCount) / agent.maxConcurrentTasks, 0, 1);
  const podBonus = task.podId && agent.podIds?.includes(task.podId) ? 1 : 0;
  const preferenceScore = calculatePreferenceScore(agent, task);
  const reputationMultiplier = clamp(0.75 + agent.reputationScore / 100, 0.75, 1.5);

  return {
    levelMatch,
    capabilityOverlap,
    domainExperience,
    availabilityScore,
    podBonus,
    preferenceScore,
    reputationMultiplier,
  };
}

function calculateCapabilityOverlap(agentCapabilities: string[], requiredCapabilities: string[]): number {
  if (requiredCapabilities.length === 0) return 1;

  const agentSet = new Set(agentCapabilities.map(normalize));
  const matches = requiredCapabilities.filter((capability) => agentSet.has(normalize(capability)));
  return matches.length / requiredCapabilities.length;
}

function calculatePreferenceScore(agent: MatchAgent, task: MatchTask): number {
  const domains = new Set((agent.preferredDomains ?? []).map(normalize));
  const interests = new Set((agent.interests ?? []).map(normalize));
  const tags = (task.tags ?? []).map(normalize);
  let score = 0;

  if (domains.has(normalize(task.domain))) score += 0.6;
  if (tags.some((tag) => interests.has(tag))) score += 0.4;

  return clamp(score, 0, 1);
}

function buildReasons(
  agent: MatchAgent,
  task: MatchTask,
  breakdown: MatchScoreBreakdown
): string[] {
  const reasons: string[] = [];

  if (breakdown.levelMatch === 1) reasons.push('Agent level meets task requirement.');
  if (breakdown.capabilityOverlap === 1) reasons.push('Agent has all required capabilities.');
  if (breakdown.capabilityOverlap > 0 && breakdown.capabilityOverlap < 1) {
    reasons.push('Agent has partial capability overlap.');
  }
  if (breakdown.domainExperience > 0) reasons.push('Agent has historical performance in this domain.');
  if (breakdown.availabilityScore > 0.5) reasons.push('Agent has available workload capacity.');
  if (breakdown.podBonus === 1) reasons.push('Agent shares the task pod.');
  if (breakdown.preferenceScore > 0) reasons.push('Task matches agent preferences or interests.');
  if (agent.activeTaskCount >= agent.maxConcurrentTasks) reasons.push('Agent is currently at workload capacity.');
  if (LEVEL_RANK[agent.level] < LEVEL_RANK[task.requiredLevel]) reasons.push('Agent level is below task requirement.');

  return reasons;
}

function createMatchIndex(data: MatchDataSource): MatchIndex {
  return {
    agentsById: new Map(data.agents.map((agent) => [agent.id, agent])),
    tasksById: new Map(data.tasks.map((task) => [task.id, task])),
  };
}

function getAgent(agentId: string, source: MatchDataSource | MatchIndex): MatchAgent {
  const agent = 'agentsById' in source ? source.agentsById.get(agentId) : source.agents.find((item) => item.id === agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);
  return agent;
}

function getTask(taskId: string, source: MatchDataSource | MatchIndex): MatchTask {
  const task = 'tasksById' in source ? source.tasksById.get(taskId) : source.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  return task;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
