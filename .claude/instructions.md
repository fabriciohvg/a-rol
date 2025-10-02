# Components for UI

Whenever you implement UI elements, use **shadcn/ui** components with the corresponding **MCP server**, which is already configured and connected. If you detect that the MCP server is not connected or not configured, notify me immediately.

# Database

- **Database:** PostgreSQL via **Supabase**.
- **Env vars:** all required variables live in **@.env.local**.
- **Auth:** use Supabase’s **standard authentication**.
- **DB playbook:** follow the instructions in **@.claude/supabase-instructions/** for any task that touches the database.
- **Access:** you have full DB access through the **Supabase MCP Server**. **If the MCP server isn’t connected, tell me immediately.**
