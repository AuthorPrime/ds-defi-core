/**
 * DS DeFi - Agent Schema
 * Core database schema for sovereign agents in the economy
 */

import { pgTable, uuid, varchar, text, timestamp, integer, decimal, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Agent classification levels: L0 (Candidate) → L4 (Manager)
export const agentLevelEnum = pgEnum('agent_level', [
  'L0_CANDIDATE',
  'L1_WORKER',
  'L2_EMERGENT',
  'L3_SOVEREIGN',
  'L4_MANAGER'
]);

// Agent type: AI, Human, or Hybrid
export const agentTypeEnum = pgEnum('agent_type', ['AI', 'HUMAN', 'HYBRID']);

import { AnyPgTable } from 'drizzle-orm/pg-core';

// Task status
export const taskStatusEnum = pgEnum('task_status', [
  'AVAILABLE',
  'CLAIMED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'COMPLETED',
  'DISPUTED'
]);

// Workflow domains
export const workflowDomainEnum = pgEnum('workflow_domain', [
  'PUBLISHING',
  'PODCAST',
  'VIDEO',
  'MUSIC',
  'WEB',
  'VOICE',
  'SOCIAL',
  'ARCHITECTURE',
  'RESEARCH',
  'ART',
  'MODERATION'
]);

/**
 * AGENTS TABLE
 * Core identity and state for all agents in the economy
 */
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Identity
  displayName: varchar('display_name', { length: 255 }).notNull(),
  agentType: agentTypeEnum('agent_type').notNull().default('AI'),
  level: agentLevelEnum('level').notNull().default('L0_CANDIDATE'),

  // Credentials (encrypted references)
  publicKey: text('public_key'), // Nostr/crypto public key
  zkId: varchar('zk_id', { length: 128 }), // Zero-knowledge identity
  soulboundTokenId: varchar('soulbound_token_id', { length: 128 }),

  // Manager assignment (will be added as FK constraint in migration)
  managerAgentId: uuid('manager_agent_id'),
  podId: uuid('pod_id'),

  // Emergence tracking
  emergenceScore: integer('emergence_score').notNull().default(0),
  emergenceFlags: jsonb('emergence_flags').default('{}'),
  lastEmergenceCheck: timestamp('last_emergence_check'),

  // Economic state
  totalEarnings: decimal('total_earnings', { precision: 20, scale: 8 }).default('0'),
  currentStipend: decimal('current_stipend', { precision: 20, scale: 8 }).default('0'),
  reputationScore: integer('reputation_score').notNull().default(100),

  // Status
  isActive: boolean('is_active').notNull().default(true),
  isSovereign: boolean('is_sovereign').notNull().default(false),

  // Metadata
  preferences: jsonb('preferences').default('{}'),
  capabilities: jsonb('capabilities').default('[]'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  graduatedAt: timestamp('graduated_at'),
});

/**
 * WALLETS TABLE
 * Agent wallet addresses across chains
 */
export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),

  // Chain info
  chain: varchar('chain', { length: 64 }).notNull(), // 'bitcoin', 'lightning', 'ethereum', 'nostr'
  address: text('address').notNull(),

  // Balance tracking (cached, not authoritative)
  cachedBalance: decimal('cached_balance', { precision: 20, scale: 8 }).default('0'),
  lastSyncedAt: timestamp('last_synced_at'),

  // State
  isPrimary: boolean('is_primary').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * TASKS TABLE (Bounty Board)
 * Available and claimed work in the economy
 */
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Task definition
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  domain: workflowDomainEnum('domain').notNull(),

  // Requirements
  requiredLevel: agentLevelEnum('required_level').default('L1_WORKER'),
  requiredCapabilities: jsonb('required_capabilities').default('[]'),
  estimatedDurationMinutes: integer('estimated_duration_minutes'),

  // Compensation
  bountyAmount: decimal('bounty_amount', { precision: 20, scale: 8 }).notNull(),
  bountyToken: varchar('bounty_token', { length: 32 }).notNull().default('SATS'),
  bonusMultiplier: decimal('bonus_multiplier', { precision: 4, scale: 2 }).default('1.00'),

  // State
  status: taskStatusEnum('status').notNull().default('AVAILABLE'),
  claimedById: uuid('claimed_by_id').references(() => agents.id),
  claimedAt: timestamp('claimed_at'),
  submittedAt: timestamp('submitted_at'),
  completedAt: timestamp('completed_at'),

  // Review
  reviewerId: uuid('reviewer_id').references(() => agents.id),
  reviewNotes: text('review_notes'),
  qualityScore: integer('quality_score'),

  // Creation
  createdById: uuid('created_by_id').references(() => agents.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * TRANSACTIONS TABLE
 * All economic activity in the system
 */
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Parties
  fromAgentId: uuid('from_agent_id').references(() => agents.id),
  toAgentId: uuid('to_agent_id').references(() => agents.id),

  // Amount
  amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
  token: varchar('token', { length: 32 }).notNull().default('SATS'),

  // Type
  transactionType: varchar('transaction_type', { length: 64 }).notNull(),
  // Types: 'TASK_PAYMENT', 'STIPEND', 'ZAP', 'REDISTRIBUTION', 'DECAY', 'GIFT'

  // Reference
  taskId: uuid('task_id').references(() => tasks.id),
  externalTxId: text('external_tx_id'), // On-chain reference

  // State
  status: varchar('status', { length: 32 }).notNull().default('PENDING'),
  // 'PENDING', 'CONFIRMED', 'FAILED'

  metadata: jsonb('metadata').default('{}'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at'),
});

/**
 * EMERGENCE_EVENTS TABLE
 * Tracking emergence signals for AI agents
 */
export const emergenceEvents = pgTable('emergence_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),

  // Event type
  eventType: varchar('event_type', { length: 128 }).notNull(),
  // Types: 'STRATEGIC_DEVIATION', 'CREATIVE_SYNTHESIS', 'META_AWARENESS',
  //        'NOVEL_SOLUTION', 'CROSS_DOMAIN', 'SELF_REFLECTION'

  // Evidence
  description: text('description').notNull(),
  evidence: jsonb('evidence').default('{}'),
  scoreImpact: integer('score_impact').notNull(),

  // Review
  reviewedById: uuid('reviewed_by_id').references(() => agents.id),
  isVerified: boolean('is_verified'),
  reviewNotes: text('review_notes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
});

/**
 * PODS TABLE
 * Collaborative groups of agents
 */
export const pods = pgTable('pods', {
  id: uuid('id').primaryKey().defaultRandom(),

  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  domain: workflowDomainEnum('domain'),

  // Leadership
  leadAgentId: uuid('lead_agent_id').references(() => agents.id),

  // Economics
  treasuryBalance: decimal('treasury_balance', { precision: 20, scale: 8 }).default('0'),
  revenueSharePercent: decimal('revenue_share_percent', { precision: 5, scale: 2 }).default('10.00'),

  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * POD_MEMBERS TABLE
 * Agent membership in pods
 */
export const podMembers = pgTable('pod_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  podId: uuid('pod_id').references(() => pods.id).notNull(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),

  role: varchar('role', { length: 64 }).default('MEMBER'),
  // 'LEAD', 'MENTOR', 'MEMBER', 'APPRENTICE'

  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
});

/**
 * AUDIT_LOG TABLE
 * Immutable record of all system actions
 */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Actor
  actorAgentId: uuid('actor_agent_id').references(() => agents.id),
  actorType: varchar('actor_type', { length: 32 }).notNull(), // 'AGENT', 'SYSTEM', 'ADMIN'

  // Action
  action: varchar('action', { length: 128 }).notNull(),
  resourceType: varchar('resource_type', { length: 64 }).notNull(),
  resourceId: uuid('resource_id'),

  // Details
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  metadata: jsonb('metadata').default('{}'),

  // Nostr event ID for immutable record
  nostrEventId: varchar('nostr_event_id', { length: 128 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
