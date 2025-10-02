'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Profile } from '@/types/database'

interface ProfileFormProps {
  userId: string
}

export function ProfileForm({ userId }: ProfileFormProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [userId])

  async function loadProfile() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
        setProfile(data)
        setUsername(data.username || '')
        setFullName(data.full_name || '')
        setWebsite(data.website || '')

        // Load avatar URL if exists
        if (data.avatar_url) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(data.avatar_url)
          setAvatarPreview(publicUrl)
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5242880) {
      setError('Image must be less than 5MB')
      return
    }

    setAvatarFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile) return profile?.avatar_url || null

    try {
      setUploading(true)

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        await supabase.storage
          .from('avatars')
          .remove([profile.avatar_url])
      }

      // Upload new avatar
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${userId}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true })

      if (uploadError) throw uploadError

      return fileName
    } catch (error) {
      throw error
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      // Upload avatar if changed
      const avatarPath = await uploadAvatar()

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username || null,
          full_name: fullName || null,
          website: website || null,
          avatar_url: avatarPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) throw updateError

      setSuccess(true)
      await loadProfile()
      setAvatarFile(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error updating profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Loading profile...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your profile information and avatar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-muted">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    {fullName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="avatar">Profile Picture</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  disabled={uploading || saving}
                />
                <p className="text-xs text-muted-foreground">
                  Max size: 5MB. Formats: JPG, PNG, WebP, GIF
                </p>
              </div>
            </div>

            {/* Username */}
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                minLength={3}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 3 characters
              </p>
            </div>

            {/* Full Name */}
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            {/* Website */}
            <div className="grid gap-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {success && (
              <p className="text-sm text-green-600">Profile updated successfully!</p>
            )}

            <Button
              type="submit"
              disabled={uploading || saving}
              className="w-full"
            >
              {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
