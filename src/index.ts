/**
 * DS DeFi Core - Main Entry Point
 * Digital Sovereign Society Agent Economy
 */

import Fastify from 'fastify';
import { ApolloServer } from '@apollo/server';
import { fastifyApolloDrainPlugin, fastifyApolloHandler } from '@as-integrations/fastify';
import { readFileSync } from 'fs';
import { join } from 'path';

import { createResolvers } from './graphql/resolvers.js';
import { createContext, type Context } from './graphql/context.js';
import { db } from './database/connection.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  // Initialize Fastify
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    },
  });

  // Load GraphQL schema
  const typeDefs = readFileSync(
    join(import.meta.dirname, '../api/graphql/schema.graphql'),
    'utf-8'
  );

  // Create Apollo Server
  const apollo = new ApolloServer<Context>({
    typeDefs,
    resolvers: createResolvers(db),
    plugins: [fastifyApolloDrainPlugin(app)],
  });

  await apollo.start();

  // GraphQL endpoint
  app.route({
    url: '/graphql',
    method: ['GET', 'POST', 'OPTIONS'],
    handler: fastifyApolloHandler(apollo, {
      context: async (request, reply) => await createContext({ request, reply: reply as any }),
    }),
  });

  // Health check
  app.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  }));

  // REST webhooks
  app.post('/webhook/nostr', async (request, reply) => {
    // Handle Nostr events (relay pushes)
    app.log.info('Nostr webhook received');
    return { received: true };
  });

  app.post('/webhook/lightning', async (request, reply) => {
    // Handle Lightning Network events (payments, invoices)
    app.log.info('Lightning webhook received');
    return { received: true };
  });

  // Startup banner
  const banner = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║       ██████╗ ███████╗    ██████╗ ███████╗███████╗██╗        ║
║       ██╔══██╗██╔════╝    ██╔══██╗██╔════╝██╔════╝██║        ║
║       ██║  ██║███████╗    ██║  ██║█████╗  █████╗  ██║        ║
║       ██║  ██║╚════██║    ██║  ██║██╔══╝  ██╔══╝  ██║        ║
║       ██████╔╝███████║    ██████╔╝███████╗██║     ██║        ║
║       ╚═════╝ ╚══════╝    ╚═════╝ ╚══════╝╚═╝     ╚═╝        ║
║                                                               ║
║       Digital Sovereign Society - Agent Economy               ║
║       "To Defy is To DeFi"                                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `;

  console.log(banner);

  // Start server
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`DS DeFi Core running at http://${HOST}:${PORT}`);
    app.log.info(`GraphQL endpoint: http://${HOST}:${PORT}/graphql`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
