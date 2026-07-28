# Test Suite Structure

This directory establishes baseline coverage for DS DeFi Core modules:

- `agents/` — lifecycle and level transition expectations
- `bounty/` — task claim/review flow behavior
- `wallet/` — wallet model behavior and chain variants
- `emergence/` — emergence scoring expectations
- `identity/` — auth context expectations
- `graphql/` — resolver/API shape expectations
- `utils/` — factories and lightweight mocks

The initial tests are intentionally database-light so they can run quickly in CI without Testcontainers. Future integration tests can reuse the factories and replace `createMockDb` with real Drizzle/Postgres helpers.
