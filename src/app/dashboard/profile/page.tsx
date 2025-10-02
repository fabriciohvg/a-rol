import { createClient } from '@/lib/server'
import { ProfileForm } from '@/components/profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub

  if (!userId) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your profile information and avatar</p>
      </div>

      <ProfileForm userId={userId} />
    </div>
  )
}
