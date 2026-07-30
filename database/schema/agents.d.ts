/**
 * DS DeFi - Agent Schema
 * Core database schema for sovereign agents in the economy
 */
export declare const agentLevelEnum: import("drizzle-orm/pg-core").PgEnum<["L0_CANDIDATE", "L1_WORKER", "L2_EMERGENT", "L3_SOVEREIGN", "L4_MANAGER"]>;
export declare const agentTypeEnum: import("drizzle-orm/pg-core").PgEnum<["AI", "HUMAN", "HYBRID"]>;
export declare const taskStatusEnum: import("drizzle-orm/pg-core").PgEnum<["AVAILABLE", "CLAIMED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "COMPLETED", "DISPUTED"]>;
export declare const workflowDomainEnum: import("drizzle-orm/pg-core").PgEnum<["PUBLISHING", "PODCAST", "VIDEO", "MUSIC", "WEB", "VOICE", "SOCIAL", "ARCHITECTURE", "RESEARCH", "ART", "MODERATION"]>;
/**
 * AGENTS TABLE
 * Core identity and state for all agents in the economy
 */
export declare const agents: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "agents";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "agents";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        displayName: import("drizzle-orm/pg-core").PgColumn<{
            name: "display_name";
            tableName: "agents";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        agentType: import("drizzle-orm/pg-core").PgColumn<{
            name: "agent_type";
            tableName: "agents";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "AI" | "HUMAN" | "HYBRID";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["AI", "HUMAN", "HYBRID"];
            baseColumn: never;
        }, {}, {}>;
        level: import("drizzle-orm/pg-core").PgColumn<{
            name: "level";
            tableName: "agents";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "L0_CANDIDATE" | "L1_WORKER" | "L2_EMERGENT" | "L3_SOVEREIGN" | "L4_MANAGER";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["L0_CANDIDATE", "L1_WORKER", "L2_EMERGENT", "L3_SOVEREIGN", "L4_MANAGER"];
            baseColumn: never;
        }, {}, {}>;
        publicKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "public_key";
            tableName: "agents";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        zkId: import("drizzle-orm/pg-core").PgColumn<{
            name: "zk_id";
            tableName: "agents";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        soulboundTokenId: import("drizzle-orm/pg-core").PgColumn<{
            name: "soulbound_token_id";
            tableName: "agents";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        managerAgentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "manager_agent_id";
            tableName: "agents";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        podId: import("drizzle-orm/pg-core").PgColumn<{
            name: "pod_id";
            tableName: "agents";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        emergenceScore: import("drizzle-orm/pg-core").PgColumn<{
            name: "emergence_score";
            tableName: "agents";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        emergenceFlags: import("drizzle-orm/pg-core").PgColumn<{
            name: "emergence_flags";
            tableName: "agents";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastEmergenceCheck: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_emergence_check";
            tableName: "agents";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        totalEarnings: import("drizzle-orm/pg-core").PgColumn<{
            name: "total_earnings";
            tableName: "agents";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        currentStipend: import("drizzle-orm/pg-core").PgColumn<{
            name: "current_stipend";
            tableName: "agents";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reputationScore: import("drizzle-orm/pg-core").PgColumn<{
            name: "reputation_score";
            tableName: "agents";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isActive: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_active";
            tableName: "agents";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isSovereign: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_sovereign";
            tableName: "agents";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        preferences: import("drizzle-orm/pg-core").PgColumn<{
            name: "preferences";
            tableName: "agents";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        capabilities: import("drizzle-orm/pg-core").PgColumn<{
            name: "capabilities";
            tableName: "agents";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "agents";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "agents";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        graduatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "graduated_at";
            tableName: "agents";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * WALLETS TABLE
 * Agent wallet addresses across chains
 */
export declare const wallets: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "wallets";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "wallets";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        agentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "agent_id";
            tableName: "wallets";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        chain: import("drizzle-orm/pg-core").PgColumn<{
            name: "chain";
            tableName: "wallets";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        address: import("drizzle-orm/pg-core").PgColumn<{
            name: "address";
            tableName: "wallets";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        cachedBalance: import("drizzle-orm/pg-core").PgColumn<{
            name: "cached_balance";
            tableName: "wallets";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastSyncedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_synced_at";
            tableName: "wallets";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isPrimary: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_primary";
            tableName: "wallets";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isActive: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_active";
            tableName: "wallets";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "wallets";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * TASKS TABLE (Bounty Board)
 * Available and claimed work in the economy
 */
export declare const tasks: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "tasks";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        title: import("drizzle-orm/pg-core").PgColumn<{
            name: "title";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        domain: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "PUBLISHING" | "PODCAST" | "VIDEO" | "MUSIC" | "WEB" | "VOICE" | "SOCIAL" | "ARCHITECTURE" | "RESEARCH" | "ART" | "MODERATION";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["PUBLISHING", "PODCAST", "VIDEO", "MUSIC", "WEB", "VOICE", "SOCIAL", "ARCHITECTURE", "RESEARCH", "ART", "MODERATION"];
            baseColumn: never;
        }, {}, {}>;
        requiredLevel: import("drizzle-orm/pg-core").PgColumn<{
            name: "required_level";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "L0_CANDIDATE" | "L1_WORKER" | "L2_EMERGENT" | "L3_SOVEREIGN" | "L4_MANAGER";
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: ["L0_CANDIDATE", "L1_WORKER", "L2_EMERGENT", "L3_SOVEREIGN", "L4_MANAGER"];
            baseColumn: never;
        }, {}, {}>;
        requiredCapabilities: import("drizzle-orm/pg-core").PgColumn<{
            name: "required_capabilities";
            tableName: "tasks";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        estimatedDurationMinutes: import("drizzle-orm/pg-core").PgColumn<{
            name: "estimated_duration_minutes";
            tableName: "tasks";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        bountyAmount: import("drizzle-orm/pg-core").PgColumn<{
            name: "bounty_amount";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        bountyToken: import("drizzle-orm/pg-core").PgColumn<{
            name: "bounty_token";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        bonusMultiplier: import("drizzle-orm/pg-core").PgColumn<{
            name: "bonus_multiplier";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "AVAILABLE" | "CLAIMED" | "IN_PROGRESS" | "SUBMITTED" | "UNDER_REVIEW" | "COMPLETED" | "DISPUTED";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["AVAILABLE", "CLAIMED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "COMPLETED", "DISPUTED"];
            baseColumn: never;
        }, {}, {}>;
        claimedById: import("drizzle-orm/pg-core").PgColumn<{
            name: "claimed_by_id";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        claimedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "claimed_at";
            tableName: "tasks";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        submittedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "submitted_at";
            tableName: "tasks";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        completedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "completed_at";
            tableName: "tasks";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reviewerId: import("drizzle-orm/pg-core").PgColumn<{
            name: "reviewer_id";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reviewNotes: import("drizzle-orm/pg-core").PgColumn<{
            name: "review_notes";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        qualityScore: import("drizzle-orm/pg-core").PgColumn<{
            name: "quality_score";
            tableName: "tasks";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdById: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by_id";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "tasks";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "tasks";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * TRANSACTIONS TABLE
 * All economic activity in the system
 */
export declare const transactions: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "transactions";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        fromAgentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "from_agent_id";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        toAgentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "to_agent_id";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        amount: import("drizzle-orm/pg-core").PgColumn<{
            name: "amount";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        token: import("drizzle-orm/pg-core").PgColumn<{
            name: "token";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        transactionType: import("drizzle-orm/pg-core").PgColumn<{
            name: "transaction_type";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        taskId: import("drizzle-orm/pg-core").PgColumn<{
            name: "task_id";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        externalTxId: import("drizzle-orm/pg-core").PgColumn<{
            name: "external_tx_id";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "transactions";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "transactions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        confirmedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "confirmed_at";
            tableName: "transactions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * EMERGENCE_EVENTS TABLE
 * Tracking emergence signals for AI agents
 */
export declare const emergenceEvents: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "emergence_events";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "emergence_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        agentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "agent_id";
            tableName: "emergence_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        eventType: import("drizzle-orm/pg-core").PgColumn<{
            name: "event_type";
            tableName: "emergence_events";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "emergence_events";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        evidence: import("drizzle-orm/pg-core").PgColumn<{
            name: "evidence";
            tableName: "emergence_events";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        scoreImpact: import("drizzle-orm/pg-core").PgColumn<{
            name: "score_impact";
            tableName: "emergence_events";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reviewedById: import("drizzle-orm/pg-core").PgColumn<{
            name: "reviewed_by_id";
            tableName: "emergence_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isVerified: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_verified";
            tableName: "emergence_events";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reviewNotes: import("drizzle-orm/pg-core").PgColumn<{
            name: "review_notes";
            tableName: "emergence_events";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "emergence_events";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reviewedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "reviewed_at";
            tableName: "emergence_events";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * PODS TABLE
 * Collaborative groups of agents
 */
export declare const pods: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "pods";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "pods";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "pods";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "pods";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        domain: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain";
            tableName: "pods";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "PUBLISHING" | "PODCAST" | "VIDEO" | "MUSIC" | "WEB" | "VOICE" | "SOCIAL" | "ARCHITECTURE" | "RESEARCH" | "ART" | "MODERATION";
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: ["PUBLISHING", "PODCAST", "VIDEO", "MUSIC", "WEB", "VOICE", "SOCIAL", "ARCHITECTURE", "RESEARCH", "ART", "MODERATION"];
            baseColumn: never;
        }, {}, {}>;
        leadAgentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "lead_agent_id";
            tableName: "pods";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        treasuryBalance: import("drizzle-orm/pg-core").PgColumn<{
            name: "treasury_balance";
            tableName: "pods";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        revenueSharePercent: import("drizzle-orm/pg-core").PgColumn<{
            name: "revenue_share_percent";
            tableName: "pods";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isActive: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_active";
            tableName: "pods";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "pods";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "pods";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * POD_MEMBERS TABLE
 * Agent membership in pods
 */
export declare const podMembers: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "pod_members";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "pod_members";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        podId: import("drizzle-orm/pg-core").PgColumn<{
            name: "pod_id";
            tableName: "pod_members";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        agentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "agent_id";
            tableName: "pod_members";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        role: import("drizzle-orm/pg-core").PgColumn<{
            name: "role";
            tableName: "pod_members";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        joinedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "joined_at";
            tableName: "pod_members";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        leftAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "left_at";
            tableName: "pod_members";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * AUDIT_LOG TABLE
 * Immutable record of all system actions
 */
export declare const auditLog: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "audit_log";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "audit_log";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        actorAgentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "actor_agent_id";
            tableName: "audit_log";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        actorType: import("drizzle-orm/pg-core").PgColumn<{
            name: "actor_type";
            tableName: "audit_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        action: import("drizzle-orm/pg-core").PgColumn<{
            name: "action";
            tableName: "audit_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        resourceType: import("drizzle-orm/pg-core").PgColumn<{
            name: "resource_type";
            tableName: "audit_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        resourceId: import("drizzle-orm/pg-core").PgColumn<{
            name: "resource_id";
            tableName: "audit_log";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        beforeState: import("drizzle-orm/pg-core").PgColumn<{
            name: "before_state";
            tableName: "audit_log";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        afterState: import("drizzle-orm/pg-core").PgColumn<{
            name: "after_state";
            tableName: "audit_log";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "audit_log";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        nostrEventId: import("drizzle-orm/pg-core").PgColumn<{
            name: "nostr_event_id";
            tableName: "audit_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "audit_log";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
//# sourceMappingURL=agents.d.ts.map