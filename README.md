# School Management System

A modern, cloud-native school management system built with TypeScript, Cloudflare Workers, and React.

## Project Structure

```
school-management-system/
├── apps/
│   ├── api/          # Cloudflare Workers API (Hono + Drizzle ORM)
│   └── web/          # React frontend (Vite)
├── packages/
│   └── shared/       # Shared TypeScript types and Zod schemas
└── package.json      # Root workspace configuration
```

## Tech Stack

### Backend (apps/api)
- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Language**: TypeScript

### Frontend (apps/web)
- **Framework**: React
- **Build Tool**: Vite
- **Language**: TypeScript

### Shared (packages/shared)
- **Types**: TypeScript
- **Validation**: Zod schemas

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Getting Started

### Installation

```bash
pnpm install
```

### Development

```bash
# Start all development servers
pnpm dev

# Start API only
pnpm --filter @sms/api dev

# Start web only
pnpm --filter @sms/web dev
```

### Building

```bash
# Build all packages and apps
pnpm build

# Build specific package
pnpm --filter @sms/api build
```

### Type Checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## API Endpoints

### Health Check
- `GET /health` - Returns API health status

## Development Workflow

1. Make changes to code
2. Type check: `pnpm typecheck`
3. Run tests: `pnpm test`
4. Build: `pnpm build`
5. Commit changes

## Environment Variables

See `.env.example` files in each app directory for required environment variables.

## License

Private - All Rights Reserved
