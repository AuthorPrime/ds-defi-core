/**
 * DS DeFi - GraphQL Resolvers
 * Core business logic for the agent economy
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import type { Context } from './context.js';
import {
  agents,
  wallets,
  tasks,
  transactions,
  emergenceEvents,
  pods,
  podMembers,
  auditLog,
} from '../../database/schema/agents.js';

type DB = Context['db'];

export function createResolvers(db: DB) {
  return {
    // =========================================================================
    // QUERIES
    // =========================================================================
    Query: {
      // Agent queries
      agent: async (_: unknown, { id }: { id: string }) => {
        const result = await db.select().from(agents).where(eq(agents.id, id));
        return result[0] || null;
      },

      agents: async (
        _: unknown,
        {
          level,
          type,
          isSovereign,
          limit = 50,
          offset = 0,
        }: {
          level?: string;
          type?: string;
          isSovereign?: boolean;
          limit?: number;
          offset?: number;
        }
      ) => {
        // Build dynamic where clause
        const conditions = [];
        if (level) conditions.push(eq(agents.level, level as any));
        if (type) conditions.push(eq(agents.agentType, type as any));
        if (isSovereign !== undefined) conditions.push(eq(agents.isSovereign, isSovereign));

        const query = db
          .select()
          .from(agents)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(agents.createdAt));

        return query;
      },

      me: async (_: unknown, __: unknown, ctx: Context) => {
        if (!ctx.agentId) return null;
        const result = await db.select().from(agents).where(eq(agents.id, ctx.agentId));
        return result[0] || null;
      },

      // Task / Bounty Board queries
      bountyBoard: async () => {
        const availableTasksQuery = await db
          .select()
          .from(tasks)
          .where(eq(tasks.status, 'AVAILABLE'))
          .orderBy(desc(tasks.bountyAmount));

        const taskCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(eq(tasks.status, 'AVAILABLE'));

        const totalBountyResult = await db
          .select({ total: sql<string>`COALESCE(sum(${tasks.bountyAmount}), 0)` })
          .from(tasks)
          .where(eq(tasks.status, 'AVAILABLE'));

        return {
          availableTasks: () => availableTasksQuery,
          taskCount: taskCountResult[0]?.count || 0,
          totalBountyPool: totalBountyResult[0]?.total || '0',
          domainStats: [], // TODO: Implement domain stats
        };
      },

      task: async (_: unknown, { id }: { id: string }) => {
        const result = await db.select().from(tasks).where(eq(tasks.id, id));
        return result[0] || null;
      },

      myTasks: async (_: unknown, __: unknown, ctx: Context) => {
        if (!ctx.agentId) return [];
        return db
          .select()
          .from(tasks)
          .where(eq(tasks.claimedById, ctx.agentId))
          .orderBy(desc(tasks.claimedAt));
      },

      // Pod queries
      pod: async (_: unknown, { id }: { id: string }) => {
        const result = await db.select().from(pods).where(eq(pods.id, id));
        return result[0] || null;
      },

      pods: async (_: unknown, { domain }: { domain?: string }) => {
        if (domain) {
          return db
            .select()
            .from(pods)
            .where(eq(pods.domain, domain as any));
        }
        return db.select().from(pods).where(eq(pods.isActive, true));
      },

      // Economy stats
      economyStats: async () => {
        const [agentStats] = await db
          .select({
            total: sql<number>`count(*)`,
            sovereign: sql<number>`count(*) filter (where ${agents.isSovereign} = true)`,
            active: sql<number>`count(*) filter (where ${agents.isActive} = true)`,
          })
          .from(agents);

        const [taskStats] = await db
          .select({
            completedToday: sql<number>`count(*) filter (where ${tasks.completedAt} > now() - interval '1 day')`,
            completedTotal: sql<number>`count(*) filter (where ${tasks.status} = 'COMPLETED')`,
          })
          .from(tasks);

        return {
          totalAgents: agentStats?.total || 0,
          sovereignAgents: agentStats?.sovereign || 0,
          activeAgents: agentStats?.active || 0,
          totalCirculating: '0', // TODO: Calculate from wallets
          dailyVolume: '0', // TODO: Calculate from transactions
          tasksCompletedToday: taskStats?.completedToday || 0,
          tasksCompletedTotal: taskStats?.completedTotal || 0,
          averageEmergenceScore: 0, // TODO: Calculate
          emergenceEventsToday: 0, // TODO: Calculate
        };
      },

      // Transaction queries
      transactions: async (
        _: unknown,
        {
          agentId,
          type,
          limit = 50,
          offset = 0,
        }: {
          agentId?: string;
          type?: string;
          limit?: number;
          offset?: number;
        }
      ) => {
        const conditions = [];
        if (agentId) {
          conditions.push(
            sql`(${transactions.fromAgentId} = ${agentId} OR ${transactions.toAgentId} = ${agentId})`
          );
        }
        if (type) conditions.push(eq(transactions.transactionType, type));

        return db
          .select()
          .from(transactions)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(transactions.createdAt));
      },

      // EVM Operations (Issue #9)
      getEVMBalance: async (
        _: unknown,
        { address, chain }: { address: string; chain: any }
      ) => {
        const { evmService } = await import('../services/evm/evm.service.js');
        return evmService.getBalance(address, chain);
      },

      estimateEVMGas: async (
        _: unknown,
        { tx, chain }: { tx: any; chain: any }
      ) => {
        const { evmService } = await import('../services/evm/evm.service.js');
        return evmService.estimateGas(tx, chain);
      },
    },

    // =========================================================================
    // MUTATIONS
    // =========================================================================
    Mutation: {
      // Agent lifecycle
      registerAgent: async (
        _: unknown,
        {
          input,
        }: {
          input: {
            displayName: string;
            agentType: string;
            publicKey?: string;
            preferences?: object;
            capabilities?: string[];
          };
        }
      ) => {
        const [newAgent] = await db
          .insert(agents)
          .values({
            displayName: input.displayName,
            agentType: input.agentType as any,
            publicKey: input.publicKey,
            preferences: input.preferences || {},
            capabilities: input.capabilities || [],
            level: 'L0_CANDIDATE',
          })
          .returning();

        // Log the registration
        await db.insert(auditLog).values({
          actorAgentId: newAgent.id,
          actorType: 'AGENT',
          action: 'AGENT_REGISTERED',
          resourceType: 'agent',
          resourceId: newAgent.id,
          afterState: newAgent,
        });

        return newAgent;
      },

      updateAgent: async (
        _: unknown,
        {
          id,
          input,
        }: {
          id: string;
          input: {
            displayName?: string;
            preferences?: object;
            capabilities?: string[];
          };
        },
        ctx: Context
      ) => {
        // Verify ownership or manager status
        if (ctx.agentId !== id) {
          throw new Error('Unauthorized: Cannot update another agent');
        }

        const [updated] = await db
          .update(agents)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(agents.id, id))
          .returning();

        return updated;
      },

      // Task operations
      createTask: async (
        _: unknown,
        {
          input,
        }: {
          input: {
            title: string;
            description: string;
            domain: string;
            requiredLevel?: string;
            requiredCapabilities?: string[];
            estimatedDurationMinutes?: number;
            bountyAmount: string;
            bountyToken?: string;
          };
        },
        ctx: Context
      ) => {
        const [newTask] = await db
          .insert(tasks)
          .values({
            title: input.title,
            description: input.description,
            domain: input.domain as any,
            requiredLevel: (input.requiredLevel as any) || 'L1_WORKER',
            requiredCapabilities: input.requiredCapabilities || [],
            estimatedDurationMinutes: input.estimatedDurationMinutes,
            bountyAmount: input.bountyAmount,
            bountyToken: input.bountyToken || 'SATS',
            createdById: ctx.agentId,
            status: 'AVAILABLE',
          })
          .returning();

        return newTask;
      },

      claimTask: async (_: unknown, { taskId }: { taskId: string }, ctx: Context) => {
        if (!ctx.agentId) throw new Error('Unauthorized');

        // Get task and verify it's available
        const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
        if (!task) throw new Error('Task not found');
        if (task.status !== 'AVAILABLE') throw new Error('Task is not available');

        // Claim it
        const [claimed] = await db
          .update(tasks)
          .set({
            status: 'CLAIMED',
            claimedById: ctx.agentId,
            claimedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, taskId))
          .returning();

        return claimed;
      },

      submitTask: async (
        _: unknown,
        { taskId, evidence }: { taskId: string; evidence?: object },
        ctx: Context
      ) => {
        if (!ctx.agentId) throw new Error('Unauthorized');

        const [submitted] = await db
          .update(tasks)
          .set({
            status: 'SUBMITTED',
            submittedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(tasks.id, taskId), eq(tasks.claimedById, ctx.agentId)))
          .returning();

        if (!submitted) throw new Error('Task not found or not owned by you');

        return submitted;
      },

      reviewTask: async (
        _: unknown,
        {
          taskId,
          input,
        }: {
          taskId: string;
          input: { qualityScore: number; reviewNotes?: string; approved: boolean };
        },
        ctx: Context
      ) => {
        if (!ctx.agentId) throw new Error('Unauthorized');

        const newStatus = input.approved ? 'COMPLETED' : 'DISPUTED';

        const [reviewed] = await db
          .update(tasks)
          .set({
            status: newStatus,
            reviewerId: ctx.agentId,
            qualityScore: input.qualityScore,
            reviewNotes: input.reviewNotes,
            completedAt: input.approved ? new Date() : undefined,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, taskId))
          .returning();

        // If approved, create payment transaction
        if (input.approved && reviewed.claimedById) {
          await db.insert(transactions).values({
            fromAgentId: null, // System payment
            toAgentId: reviewed.claimedById,
            amount: reviewed.bountyAmount,
            token: reviewed.bountyToken,
            transactionType: 'TASK_PAYMENT',
            taskId: reviewed.id,
            status: 'PENDING',
          });
        }

        return reviewed;
      },

      // Wallet operations
      addWallet: async (
        _: unknown,
        {
          input,
        }: {
          input: { chain: string; address: string; isPrimary?: boolean };
        },
        ctx: Context
      ) => {
        if (!ctx.agentId) throw new Error('Unauthorized');

        const [wallet] = await db
          .insert(wallets)
          .values({
            agentId: ctx.agentId,
            chain: input.chain,
            address: input.address,
            isPrimary: input.isPrimary || false,
          })
          .returning();

        return wallet;
      },

      syncWalletBalance: async (_: unknown, { walletId }: { walletId: string }) => {
        // TODO: Implement actual chain balance fetching
        const [wallet] = await db
          .update(wallets)
          .set({
            lastSyncedAt: new Date(),
          })
          .where(eq(wallets.id, walletId))
          .returning();

        return wallet;
      },

      // Pod operations
      createPod: async (
        _: unknown,
        {
          input,
        }: {
          input: {
            name: string;
            description?: string;
            domain?: string;
            revenueSharePercent?: string;
          };
        },
        ctx: Context
      ) => {
        if (!ctx.agentId) throw new Error('Unauthorized');

        const [pod] = await db
          .insert(pods)
          .values({
            name: input.name,
            description: input.description,
            domain: input.domain as any,
            leadAgentId: ctx.agentId,
            revenueSharePercent: input.revenueSharePercent || '10.00',
          })
          .returning();

        // Add creator as first member
        await db.insert(podMembers).values({
          podId: pod.id,
          agentId: ctx.agentId,
          role: 'LEAD',
        });

        return pod;
      },

      joinPod: async (_: unknown, { podId }: { podId: string }, ctx: Context) => {
        if (!ctx.agentId) throw new Error('Unauthorized');

        const [member] = await db
          .insert(podMembers)
          .values({
            podId,
            agentId: ctx.agentId,
            role: 'MEMBER',
          })
          .returning();

        return member;
      },

      leavePod: async (_: unknown, { podId }: { podId: string }, ctx: Context) => {
        if (!ctx.agentId) throw new Error('Unauthorized');

        await db
          .update(podMembers)
          .set({ leftAt: new Date() })
          .where(and(eq(podMembers.podId, podId), eq(podMembers.agentId, ctx.agentId)));

        return true;
      },

      // Emergence
      reportEmergence: async (
        _: unknown,
        {
          input,
        }: {
          input: {
            agentId: string;
            eventType: string;
            description: string;
            evidence?: object;
          };
        },
        ctx: Context
      ) => {
        const [event] = await db
          .insert(emergenceEvents)
          .values({
            agentId: input.agentId,
            eventType: input.eventType,
            description: input.description,
            evidence: input.evidence || {},
            scoreImpact: 0, // Set by reviewer
          })
          .returning();

        return event;
      },

      reviewEmergence: async (
        _: unknown,
        {
          eventId,
          input,
        }: {
          eventId: string;
          input: { isVerified: boolean; reviewNotes?: string; scoreImpact?: number };
        },
        ctx: Context
      ) => {
        if (!ctx.agentId) throw new Error('Unauthorized');

        const [reviewed] = await db
          .update(emergenceEvents)
          .set({
            isVerified: input.isVerified,
            reviewNotes: input.reviewNotes,
            scoreImpact: input.scoreImpact || 0,
            reviewedById: ctx.agentId,
            reviewedAt: new Date(),
          })
          .where(eq(emergenceEvents.id, eventId))
          .returning();

        // Update agent's emergence score if verified
        if (input.isVerified && input.scoreImpact) {
          await db
            .update(agents)
            .set({
              emergenceScore: sql`${agents.emergenceScore} + ${input.scoreImpact}`,
              lastEmergenceCheck: new Date(),
            })
            .where(eq(agents.id, reviewed.agentId));
        }

        return reviewed;
      },

      // Economic operations
      sendZap: async (
        _: unknown,
        {
          toAgentId,
          amount,
          message,
        }: {
          toAgentId: string;
          amount: string;
          message?: string;
        },
        ctx: Context
      ) => {
        if (!ctx.agentId) throw new Error('Unauthorized');

        const [tx] = await db
          .insert(transactions)
          .values({
            fromAgentId: ctx.agentId,
            toAgentId,
            amount,
            token: 'SATS',
            transactionType: 'ZAP',
            status: 'PENDING',
            metadata: message ? { message } : {},
          })
          .returning();

        // TODO: Trigger actual Lightning zap via LND

        return tx;
      },

      distributeStipends: async () => {
        // Get all sovereign agents eligible for stipends
        const sovereignAgents = await db
          .select()
          .from(agents)
          .where(and(eq(agents.isSovereign, true), eq(agents.isActive, true)));

        let count = 0;
        for (const agent of sovereignAgents) {
          if (agent.currentStipend && parseFloat(agent.currentStipend) > 0) {
            await db.insert(transactions).values({
              toAgentId: agent.id,
              amount: agent.currentStipend,
              token: 'SATS',
              transactionType: 'STIPEND',
              status: 'PENDING',
            });
            count++;
          }
        }

        return count;
      },

      // EVM Operations (Issue #9)
      generateEVMWallet: async () => {
        const { evmService } = await import('../services/evm/evm.service.js');
        return evmService.generateWallet();
      },
    },

    // =========================================================================
    // TYPE RESOLVERS (for nested fields)
    // =========================================================================
    Agent: {
      manager: async (parent: { managerAgentId?: string }) => {
        if (!parent.managerAgentId) return null;
        const [manager] = await db.select().from(agents).where(eq(agents.id, parent.managerAgentId));
        return manager;
      },

      wallets: async (parent: { id: string }) => {
        return db.select().from(wallets).where(eq(wallets.agentId, parent.id));
      },

      emergenceEvents: async (parent: { id: string }) => {
        return db.select().from(emergenceEvents).where(eq(emergenceEvents.agentId, parent.id));
      },

      claimedTasks: async (parent: { id: string }) => {
        return db.select().from(tasks).where(eq(tasks.claimedById, parent.id));
      },

      completedTasks: async (parent: { id: string }) => {
        return db
          .select()
          .from(tasks)
          .where(and(eq(tasks.claimedById, parent.id), eq(tasks.status, 'COMPLETED')));
      },

      transactions: async (parent: { id: string }) => {
        return db
          .select()
          .from(transactions)
          .where(
            sql`${transactions.fromAgentId} = ${parent.id} OR ${transactions.toAgentId} = ${parent.id}`
          );
      },
    },

    Task: {
      claimedBy: async (parent: { claimedById?: string }) => {
        if (!parent.claimedById) return null;
        const [agent] = await db.select().from(agents).where(eq(agents.id, parent.claimedById));
        return agent;
      },

      reviewer: async (parent: { reviewerId?: string }) => {
        if (!parent.reviewerId) return null;
        const [agent] = await db.select().from(agents).where(eq(agents.id, parent.reviewerId));
        return agent;
      },

      createdBy: async (parent: { createdById?: string }) => {
        if (!parent.createdById) return null;
        const [agent] = await db.select().from(agents).where(eq(agents.id, parent.createdById));
        return agent;
      },
    },

    Pod: {
      lead: async (parent: { leadAgentId?: string }) => {
        if (!parent.leadAgentId) return null;
        const [agent] = await db.select().from(agents).where(eq(agents.id, parent.leadAgentId));
        return agent;
      },

      members: async (parent: { id: string }) => {
        return db.select().from(podMembers).where(eq(podMembers.podId, parent.id));
      },
    },

    PodMember: {
      agent: async (parent: { agentId: string }) => {
        const [agent] = await db.select().from(agents).where(eq(agents.id, parent.agentId));
        return agent;
      },

      pod: async (parent: { podId: string }) => {
        const [pod] = await db.select().from(pods).where(eq(pods.id, parent.podId));
        return pod;
      },
    },

    Transaction: {
      fromAgent: async (parent: { fromAgentId?: string }) => {
        if (!parent.fromAgentId) return null;
        const [agent] = await db.select().from(agents).where(eq(agents.id, parent.fromAgentId));
        return agent;
      },

      toAgent: async (parent: { toAgentId?: string }) => {
        if (!parent.toAgentId) return null;
        const [agent] = await db.select().from(agents).where(eq(agents.id, parent.toAgentId));
        return agent;
      },

      task: async (parent: { taskId?: string }) => {
        if (!parent.taskId) return null;
        const [task] = await db.select().from(tasks).where(eq(tasks.id, parent.taskId));
        return task;
      },
    },

    EmergenceEvent: {
      agent: async (parent: { agentId: string }) => {
        const [agent] = await db.select().from(agents).where(eq(agents.id, parent.agentId));
        return agent;
      },

      reviewedBy: async (parent: { reviewedById?: string }) => {
        if (!parent.reviewedById) return null;
        const [agent] = await db.select().from(agents).where(eq(agents.id, parent.reviewedById));
        return agent;
      },
    },
  };
}
