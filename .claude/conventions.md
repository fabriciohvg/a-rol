# Git Workflow Conventions

## Branch Structure
- **`main`** - Production-ready code only
- **`dev`** - Primary development branch
- **`feature/*`** - Feature branches (e.g., `feature/user-profiles`, `feature/rbac`)
- **`fix/*`** - Bug fixes (e.g., `fix/auth-redirect`)

## Commit Strategy
- **Small commits**: After completing discrete tasks
- **Feature commits**: When a feature is complete and tested
- Commit frequently with clear, descriptive messages

## Claude's Responsibilities
**I am responsible to proactively propose when to:**
1. Create a commit
2. Create a feature branch
3. Merge to main
4. Create a PR

**I must always ask for confirmation first** - user can confirm or skip.

## Database Migrations
- Track all migrations in `supabase/migrations/`
- Never edit past migrations
- Each schema change = new migration file
- Commit migrations immediately after creation

## Merging to Main
- Only merge `dev` ’ `main` when features are stable and tested
- Use PRs for visibility (via `gh` CLI)
- Squash commits if needed for clean history
