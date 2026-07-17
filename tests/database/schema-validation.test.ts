import { describe, it, expect } from 'vitest';
import { agents, wallets, tasks, transactions, emergenceEvents, pods, podMembers, auditLog } from '../../database/schema/agents.js';

describe('Database Schema - Table Definitions', () => {
  describe('agents table', () => {
    it('should have a primary key id field', () => {
      expect(agents.id).toBeDefined();
    });

    it('should have display_name field', () => {
      expect(agents.displayName).toBeDefined();
    });

    it('should have agent_type field', () => {
      expect(agents.agentType).toBeDefined();
    });

    it('should have level field', () => {
      expect(agents.level).toBeDefined();
    });

    it('should have created_at timestamp', () => {
      expect(agents.createdAt).toBeDefined();
    });

    it('should have updated_at timestamp', () => {
      expect(agents.updatedAt).toBeDefined();
    });
  });

  describe('wallets table', () => {
    it('should have agent_id foreign key', () => {
      expect(wallets.agentId).toBeDefined();
    });

    it('should have chain field', () => {
      expect(wallets.chain).toBeDefined();
    });

    it('should have address field', () => {
      expect(wallets.address).toBeDefined();
    });

    it('should have is_primary field', () => {
      expect(wallets.isPrimary).toBeDefined();
    });
  });

  describe('tasks table', () => {
    it('should have title field', () => {
      expect(tasks.title).toBeDefined();
    });

    it('should have description field', () => {
      expect(tasks.description).toBeDefined();
    });

    it('should have bounty_amount field', () => {
      expect(tasks.bountyAmount).toBeDefined();
    });

    it('should have status field', () => {
      expect(tasks.status).toBeDefined();
    });

    it('should have claimed_by_id foreign key', () => {
      expect(tasks.claimedById).toBeDefined();
    });

    it('should have domain field', () => {
      expect(tasks.domain).toBeDefined();
    });
  });

  describe('transactions table', () => {
    it('should have from_agent_id foreign key', () => {
      expect(transactions.fromAgentId).toBeDefined();
    });

    it('should have to_agent_id foreign key', () => {
      expect(transactions.toAgentId).toBeDefined();
    });

    it('should have amount field', () => {
      expect(transactions.amount).toBeDefined();
    });

    it('should have token field', () => {
      expect(transactions.token).toBeDefined();
    });

    it('should have transaction_type field', () => {
      expect(transactions.transactionType).toBeDefined();
    });

    it('should have status field', () => {
      expect(transactions.status).toBeDefined();
    });
  });

  describe('emergence_events table', () => {
    it('should have agent_id foreign key', () => {
      expect(emergenceEvents.agentId).toBeDefined();
    });

    it('should have event_type field', () => {
      expect(emergenceEvents.eventType).toBeDefined();
    });

    it('should have score_impact field', () => {
      expect(emergenceEvents.scoreImpact).toBeDefined();
    });

    it('should have is_verified field', () => {
      expect(emergenceEvents.isVerified).toBeDefined();
    });
  });

  describe('pods table', () => {
    it('should have name field', () => {
      expect(pods.name).toBeDefined();
    });

    it('should have lead_agent_id foreign key', () => {
      expect(pods.leadAgentId).toBeDefined();
    });

    it('should have treasury_balance field', () => {
      expect(pods.treasuryBalance).toBeDefined();
    });

    it('should have is_active field', () => {
      expect(pods.isActive).toBeDefined();
    });
  });

  describe('pod_members table', () => {
    it('should have pod_id foreign key', () => {
      expect(podMembers.podId).toBeDefined();
    });

    it('should have agent_id foreign key', () => {
      expect(podMembers.agentId).toBeDefined();
    });

    it('should have role field', () => {
      expect(podMembers.role).toBeDefined();
    });

    it('should have joined_at timestamp', () => {
      expect(podMembers.joinedAt).toBeDefined();
    });
  });

  describe('audit_log table', () => {
    it('should have actor_agent_id foreign key', () => {
      expect(auditLog.actorAgentId).toBeDefined();
    });

    it('should have action field', () => {
      expect(auditLog.action).toBeDefined();
    });

    it('should have resource_type field', () => {
      expect(auditLog.resourceType).toBeDefined();
    });

    it('should have metadata field', () => {
      expect(auditLog.metadata).toBeDefined();
    });
  });
});
