# InfraFlow

Construction Material Management & Warehouse Control — a multi-tenant SaaS platform for tracking materials from supplier receipt through warehouse operations to project/job consumption.

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Icons**: Lucide React
- **Validation**: Zod

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 3. Run database migrations

Apply the SQL migrations in `supabase/migrations/` to your Supabase project in order:

1. `00001_initial_schema.sql` — Creates core tables, RLS policies, roles, triggers
2. `00002_auth_trigger.sql` — Auto-creates profile on user signup

### 4. Run the dev server

```bash
npm run dev
```

## Project Structure

```
src/
  app/
    (app)/              — Authenticated route group (sidebar + header)
      dashboard/        — Overview dashboard
      projects/         — Project CRUD
      jobs/             — Job CRUD
      warehouses/       — Warehouse CRUD
    login/              — Login page
    signup/             — Signup page (creates company + admin user)
    auth/callback/      — Supabase auth callback
    actions/            — Server Actions (auth, projects, jobs, warehouses)
  components/           — Shared UI components
  lib/
    supabase/           — Supabase client utilities (browser + server)
    queries.ts          — Data access layer
  types/
    database.ts         — TypeScript interfaces for DB models
  middleware.ts         — Auth middleware (redirects unauthenticated users)
supabase/
  migrations/           — SQL migration files
```

## Architecture Decisions

- **Multi-tenancy**: Every tenant-owned table has `company_id`. RLS policies enforce isolation at the database level.
- **UUIDs**: All primary keys are UUIDs. Business codes (e.g. `WH-001`) are unique within company scope.
- **Auth**: Supabase Auth handles authentication. Application user data lives in `profiles`.
- **Roles**: RBAC with 5 initial roles (Company Admin, Warehouse Manager, Warehouse User, Project Manager, Viewer). Designed for extensibility.
- **Server Actions**: All mutations go through Server Actions with server-side validation via Zod.
- **Soft deletion**: Master data uses `is_active` flag. Operational records should not be physically deleted.

## Development Phases

- **Phase 1** (current): Foundation — Auth, Companies, Profiles, Roles, Projects, Jobs, Warehouses, RLS, Navigation
- **Phase 2**: Master data — Materials, Categories, Units, Suppliers, Locations
- **Phase 3**: Inventory — Receiving, Stock, Issues, Returns, Transfers, Adjustments, Ledger
- **Phase 4**: Project/job control — Material consumption, cost reporting
- **Phase 5**: Advanced — Dashboards, notifications, approvals, import/export, audit logs
