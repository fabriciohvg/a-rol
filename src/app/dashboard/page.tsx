import { redirect } from 'next/navigation'

import { LogoutButton } from '@/components/logout-button'
import { ProfileForm } from '@/components/profile-form'
import { createClient } from '@/lib/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  return (
    <div className="min-h-svh w-full p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">{data.claims.email}</p>
          </div>
          <LogoutButton />
        </div>

        <ProfileForm userId={userId} />
      </div>
    </div>
  )
}
