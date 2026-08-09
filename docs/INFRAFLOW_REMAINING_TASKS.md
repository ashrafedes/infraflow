# InfraFlow Remaining Tasks

## Status Legend
- [ ] Not Started
- [~] In Progress
- [x] Completed
- [!] Blocked
- [F] Failed / Requires Investigation

---

## Task T-01: Add Inspector Role to Database
- **Description**: Add `inspector` role to the roles table and update all RLS/helper functions that reference role codes to include inspector permissions.
- **Dependencies**: None
- **Files changed**: `supabase/migrations/00008_inspector_role.sql`
- **Database changes**: INSERT new role row, update `can_manage_stock` and `can_manage_materials` helpers if needed
- **Security considerations**: Inspector must be read-only for materials/suppliers/inventory, no stock mutations, no user management
- **Test requirements**: Verify role exists in DB, verify RLS policies exclude inspector from write operations
- **MCP Browser test requirements**: N/A (DB only)
- **Completion criteria**: Inspector role exists in roles table, UI role dropdowns include Inspector
- **Final status**: [ ]

---

## Task T-02: Update Users & Roles UI for Inspector
- **Description**: Add Inspector to ROLE_CODES, ROLE_LABELS, role filter dropdown, role badge styles, and invite modal role selector.
- **Dependencies**: T-01
- **Files changed**: `src/types/database.ts`, `src/app/(app)/settings/users/page.tsx`
- **Database changes**: None
- **Security considerations**: Inspector cannot be assigned company_admin, cannot self-assign roles
- **Test requirements**: `npm run build` passes, Inspector appears in role dropdowns
- **MCP Browser test requirements**: Login as admin, invite Inspector user, verify role badge displays
- **Completion criteria**: Inspector selectable in Add User modal, visible in role filter, badge styled correctly
- **Final status**: [ ]

---

## Task T-03: Suppliers Database Migration
- **Description**: Create migration for `supplier_classifications`, `suppliers`, and `material_suppliers` tables with RLS, constraints, triggers, indexes, and helper functions.
- **Dependencies**: None (materials tables already exist)
- **Files changed**: `supabase/migrations/00009_supplier_management.sql`
- **Database changes**: 3 new tables, RLS policies, triggers for cross-company validation and preferred supplier enforcement, helper function `can_manage_suppliers`, indexes
- **Security considerations**: Company-scoped RLS, cross-company link prevention via trigger, preferred supplier uniqueness via trigger, admin-only writes
- **Test requirements**: Verify tables exist, RLS enabled, constraints active
- **MCP Browser test requirements**: N/A (DB only)
- **Completion criteria**: Tables created with correct schema, RLS, constraints, indexes
- **Final status**: [ ]

---

## Task T-04: Supplier Types and Client Queries
- **Description**: Add TypeScript interfaces for Supplier, SupplierClassification, MaterialSupplier and client query functions for CRUD operations.
- **Dependencies**: T-03
- **Files changed**: `src/types/database.ts`, `src/lib/client-queries.ts`
- **Database changes**: None
- **Security considerations**: All queries use client-side Supabase (RLS enforced)
- **Test requirements**: `npm run build` passes with type checking
- **MCP Browser test requirements**: N/A
- **Completion criteria**: Types compile, queries callable from components
- **Final status**: [ ]

---

## Task T-05: Suppliers List Page
- **Description**: Build `/suppliers` page with search, status filter, classification filter, sort, pagination, add supplier modal, empty/loading/error states.
- **Dependencies**: T-04
- **Files changed**: `src/app/(app)/suppliers/page.tsx`, `src/components/sidebar.tsx`
- **Database changes**: None
- **Security considerations**: Only show suppliers from user's company (RLS), admin-only add button
- **Test requirements**: `npm run build` passes
- **MCP Browser test requirements**: Navigate to suppliers, verify list loads, search works, add supplier modal works
- **Completion criteria**: Supplier list renders with all features, sidebar link enabled
- **Final status**: [ ]

---

## Task T-06: Supplier Detail Page
- **Description**: Build supplier detail view with supplier info card, supplied materials table, supplier performance placeholder ("No data yet"), edit modal, add/remove material supplier links.
- **Dependencies**: T-05
- **Files changed**: `src/app/(app)/suppliers/supplier-detail.tsx`
- **Database changes**: None
- **Security considerations**: Admin-only edit/link management, all roles can view
- **Test requirements**: `npm run build` passes
- **MCP Browser test requirements**: Click supplier, verify detail renders, verify supplied materials section
- **Completion criteria**: Detail page shows all sections, edit works, material link add/remove works
- **Final status**: [ ]

---

## Task T-07: Supplier Classifications Page
- **Description**: Build `/suppliers/classifications` page for managing supplier classifications (CRUD).
- **Dependencies**: T-04
- **Files changed**: `src/app/(app)/suppliers/classifications/page.tsx`, `src/components/sidebar.tsx`
- **Database changes**: None
- **Security considerations**: Admin + warehouse manager can manage classifications
- **Test requirements**: `npm run build` passes
- **MCP Browser test requirements**: Navigate to classifications, add classification, verify list
- **Completion criteria**: Classifications page works with add functionality
- **Final status**: [ ]

---

## Task T-08: Integrate Suppliers into Material Detail
- **Description**: Add "Suppliers" section to material detail page showing linked suppliers with pricing, preferred badge, and add/remove capability.
- **Dependencies**: T-06
- **Files changed**: `src/app/(app)/materials/material-detail.tsx`
- **Database changes**: None
- **Security considerations**: Admin-only can add/remove supplier links, all roles can view
- **Test requirements**: `npm run build` passes
- **MCP Browser test requirements**: Open material detail, verify suppliers section, add supplier link, set preferred
- **Completion criteria**: Material detail shows suppliers, add/remove/preferred toggle works
- **Final status**: [ ]

---

## Task T-09: Job Material Requirements Migration
- **Description**: Create migration for `job_material_requirements` table to track planned material needs per job.
- **Dependencies**: None (jobs and materials tables exist)
- **Files changed**: `supabase/migrations/00010_job_material_requirements.sql`
- **Database changes**: New table with job_id, material_id, planned_quantity, unit_id, required_date, notes, status. RLS, indexes, constraints.
- **Security considerations**: Company-scoped, cross-company validation trigger, admin + warehouse manager + project manager can create
- **Test requirements**: Verify table exists, RLS enabled
- **MCP Browser test requirements**: N/A
- **Completion criteria**: Table created with correct schema and RLS
- **Final status**: [ ]

---

## Task T-10: Job Material Usage Migration
- **Description**: Create migration for `job_material_usage` table to track actual material consumption per job (issued, used, returned, wasted).
- **Dependencies**: T-09
- **Files changed**: `supabase/migrations/00011_job_material_usage.sql`
- **Database changes**: New table with job_id, material_id, warehouse_id, usage_type (ISSUED/USED/RETURNED/WASTED), quantity, unit_id, reference, notes, performed_by. SECURITY DEFINER function for atomic issue-to-job that decrements warehouse stock and creates usage record. RLS, indexes, constraints.
- **Security considerations**: Atomic stock + usage operation, company-scoped, stock validation (no negative), immutable usage records
- **Test requirements**: Verify table, function, RLS
- **MCP Browser test requirements**: N/A
- **Completion criteria**: Table + function created, atomic operation verified
- **Final status**: [ ]

---

## Task T-11: Job Material Types and Client Queries
- **Description**: Add TypeScript types and client queries for job material requirements and usage.
- **Dependencies**: T-09, T-10
- **Files changed**: `src/types/database.ts`, `src/lib/client-queries.ts`
- **Database changes**: None
- **Security considerations**: RLS enforced
- **Test requirements**: `npm run build` passes
- **MCP Browser test requirements**: N/A
- **Completion criteria**: Types and queries compile
- **Final status**: [ ]

---

## Task T-12: Job Detail — Materials Tab
- **Description**: Add "Materials" section to job detail page showing material requirements, issued/used/returned/wasted quantities, variance, status. Include add requirement modal, issue material to job modal, record usage modal.
- **Dependencies**: T-11
- **Files changed**: `src/app/(app)/jobs/job-detail.tsx`
- **Database changes**: None
- **Security considerations**: Role-based action visibility (admin/warehouse_manager can issue, project_manager can request, inspector/viewer read-only)
- **Test requirements**: `npm run build` passes
- **MCP Browser test requirements**: Open job, add material requirement, issue material, verify stock decreased, record usage, verify variance
- **Completion criteria**: Full material tracking workflow works on job detail
- **Final status**: [ ]

---

## Task T-13: Dashboard Enhancement
- **Description**: Enhance dashboard with material count, low stock alerts, out-of-stock, recent stock movements, supplier count, jobs with material variance.
- **Dependencies**: T-08, T-12
- **Files changed**: `src/app/(app)/dashboard/page.tsx`
- **Database changes**: None
- **Security considerations**: Company-scoped queries only
- **Test requirements**: `npm run build` passes
- **MCP Browser test requirements**: View dashboard, verify all stats render, verify empty states when no data
- **Completion criteria**: Dashboard shows comprehensive operational data
- **Final status**: [ ]

---

## Task T-14: Reports Module
- **Description**: Build `/reports` page with inventory report, stock movement report, material usage by job, low-stock report, supplier-material report. Filters for project, job, material, warehouse, date range.
- **Dependencies**: T-12
- **Files changed**: `src/app/(app)/reports/page.tsx`, `src/components/sidebar.tsx`
- **Database changes**: None
- **Security considerations**: RLS enforced, company-scoped
- **Test requirements**: `npm run build` passes
- **MCP Browser test requirements**: Navigate to reports, verify each report type renders
- **Completion criteria**: Reports page with multiple report types and filters
- **Final status**: [ ]

---

## Task T-15: Security Audit
- **Description**: Verify RLS on all tables, verify no service-role keys in browser, verify role permissions enforced at DB level, verify multi-tenant isolation.
- **Dependencies**: All prior tasks
- **Files changed**: None (audit only, fix if issues found)
- **Database changes**: None (unless fixing issues)
- **Security considerations**: This IS the security consideration
- **Test requirements**: Run `mcp0_get_advisors` for security, grep for service-role keys
- **MCP Browser test requirements**: Test cross-company access prevention, test role restrictions
- **Completion criteria**: No security advisors, no exposed secrets, RLS on all tables
- **Final status**: [ ]

---

## Task T-16: Build Verification
- **Description**: Run `npm run build`, fix all errors, verify static export succeeds.
- **Dependencies**: All prior tasks
- **Files changed**: Various fixes
- **Database changes**: None
- **Security considerations**: N/A
- **Test requirements**: `npm run build` passes with zero errors
- **MCP Browser test requirements**: N/A
- **Completion criteria**: Clean build, static export succeeds
- **Final status**: [ ]

---

## Task T-17: MCP Browser End-to-End Testing
- **Description**: Comprehensive browser testing of all workflows: auth, users, projects, jobs, warehouses, materials, suppliers, inventory, job materials, inspector role, viewer role, responsive.
- **Dependencies**: T-16
- **Files changed**: None (test only, fix if issues found)
- **Database changes**: None
- **Security considerations**: Verify role restrictions in browser
- **Test requirements**: All browser tests pass
- **MCP Browser test requirements**: Full workflow testing per the test plan
- **Completion criteria**: All critical workflows verified in browser
- **Final status**: [ ]

---

## Task T-18: Git Push and Deploy Verification
- **Description**: Push all changes to git, verify Render deployment works.
- **Dependencies**: T-17
- **Files changed**: None
- **Database changes**: None
- **Security considerations**: Verify no secrets in git
- **Test requirements**: Git push succeeds
- **MCP Browser test requirements**: Test deployed Render URL
- **Completion criteria**: Code pushed, deployment verified
- **Final status**: [ ]
