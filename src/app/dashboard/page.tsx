import { createClient } from '@/lib/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {data?.claims?.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Dashboard overview content will go here */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-2">Quick Stats</h3>
          <p className="text-sm text-muted-foreground">Your activity overview</p>
        </div>
      </div>
    </div>
  )
}
