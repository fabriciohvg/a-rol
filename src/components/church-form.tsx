'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Church, ChurchInsert, Pastor } from '@/types/database'

interface ChurchFormProps {
  church?: Church
  onSuccess?: () => void
  onCancel?: () => void
}

export function ChurchForm({ church, onSuccess, onCancel }: ChurchFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(church?.photo_url || null)
  const [pastors, setPastors] = useState<Pastor[]>([])
  const [selectedAssistantPastors, setSelectedAssistantPastors] = useState<string[]>(
    church?.assistant_pastor_ids || []
  )

  // Form state
  const [formData, setFormData] = useState<Partial<ChurchInsert>>({
    type: 'Church',
    name: church?.name || '',
    address: church?.address || '',
    neighborhood: church?.neighborhood || '',
    city: church?.city || '',
    state: church?.state || '',
    country: church?.country || 'Brazil',
    postal_code: church?.postal_code || '',
    phone: church?.phone || '',
    website: church?.website || '',
    email: church?.email || '',
    cnpj: church?.cnpj || '',
    lead_pastor_id: church?.lead_pastor_id || '',
    assistant_pastor_ids: church?.assistant_pastor_ids || [],
    organization_date: church?.organization_date || '',
    presbytery: church?.presbytery || 'PANA',
    notes: church?.notes || '',
    photo_url: church?.photo_url || null,
  })

  const supabase = createClient()

  // Load pastors for select fields
  useEffect(() => {
    async function loadPastors() {
      const { data, error } = await supabase
        .from('pastors')
        .select('*')
        .order('name', { ascending: true })

      if (!error && data) {
        setPastors(data)
      }
    }
    loadPastors()
  }, [])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5242880) {
      setError('Image must be less than 5MB')
      return
    }

    setPhotoFile(file)
    setError(null)

    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function toggleAssistantPastor(pastorId: string) {
    setSelectedAssistantPastors((prev) => {
      if (prev.includes(pastorId)) {
        return prev.filter((id) => id !== pastorId)
      } else {
        return [...prev, pastorId]
      }
    })
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return formData.photo_url || null

    try {
      // Delete old photo if exists
      if (church?.photo_url) {
        await supabase.storage
          .from('church-photos')
          .remove([church.photo_url])
      }

      // Upload new photo
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}/photo.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('church-photos')
        .upload(fileName, photoFile, { upsert: true })

      if (uploadError) throw uploadError

      return fileName
    } catch (error) {
      throw error
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Client-side validation
      if (!formData.lead_pastor_id) {
        throw new Error('Please select a lead pastor')
      }

      // Upload photo if changed
      const photoPath = await uploadPhoto()

      const churchData = {
        ...formData,
        photo_url: photoPath,
        assistant_pastor_ids: selectedAssistantPastors,
        // Ensure empty strings become null for optional fields
        website: formData.website?.trim() || null,
        notes: formData.notes?.trim() || null,
      } as ChurchInsert

      if (church) {
        // Update existing church
        const { error: updateError } = await supabase
          .from('churches')
          .update(churchData)
          .eq('id', church.id)

        if (updateError) throw updateError
      } else {
        // Insert new church
        const { error: insertError } = await supabase
          .from('churches')
          .insert(churchData)

        if (insertError) throw insertError
      }

      onSuccess?.()
    } catch (error: unknown) {
      console.error('Church form error:', error)
      // Show detailed error message from Supabase
      const err = error as { message?: string; details?: string; hint?: string }
      const errorMessage = err?.message || err?.details || err?.hint || 'An error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{church ? 'Edit Church' : 'New Church'}</CardTitle>
        <CardDescription>
          {church ? 'Update church information' : 'Add a new church to the system'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Photo Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Church photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    {formData.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                <Label htmlFor="photo">Church Photo/Logo</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handlePhotoChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as 'Church' })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Church">Church</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Address Fields */}
            <div className="grid gap-4">
              <h3 className="font-semibold">Address</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="neighborhood">Neighborhood *</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="state">State (UF) *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    maxLength={2}
                    minLength={2}
                    pattern="[A-Z]{2}"
                    title="Two uppercase letters (e.g., SP, RJ)"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="postal_code">Postal Code (CEP) *</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="12345-678"
                    pattern="\d{5}-\d{3}"
                    title="Format: 12345-678"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid gap-4">
              <h3 className="font-semibold">Contact Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value || null })}
                    placeholder="https://"
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Ministry Information */}
            <div className="grid gap-4">
              <h3 className="font-semibold">Ministry Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="12.345.678/0001-00"
                    pattern="\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}"
                    title="Format: 12.345.678/0001-00"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="organization_date">Organization Date *</Label>
                  <Input
                    id="organization_date"
                    type="date"
                    value={formData.organization_date}
                    onChange={(e) => setFormData({ ...formData, organization_date: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="presbytery">Presbytery *</Label>
                  <Select
                    value={formData.presbytery}
                    onValueChange={(value) => setFormData({ ...formData, presbytery: value as 'PANA' | 'PNAN' })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PANA">PANA</SelectItem>
                      <SelectItem value="PNAN">PNAN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lead_pastor_id">Lead Pastor *</Label>
                  <Select
                    value={formData.lead_pastor_id}
                    onValueChange={(value) => setFormData({ ...formData, lead_pastor_id: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead pastor" />
                    </SelectTrigger>
                    <SelectContent>
                      {pastors.map((pastor) => (
                        <SelectItem key={pastor.id} value={pastor.id}>
                          {pastor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label>Assistant Pastors</Label>
                  <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                    {pastors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pastors available</p>
                    ) : (
                      <div className="space-y-2">
                        {pastors
                          .filter((p) => p.id !== formData.lead_pastor_id)
                          .map((pastor) => (
                            <label
                              key={pastor.id}
                              className="flex items-center space-x-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedAssistantPastors.includes(pastor.id)}
                                onChange={() => toggleAssistantPastor(pastor.id)}
                                disabled={loading}
                                className="rounded"
                              />
                              <span className="text-sm">{pastor.name}</span>
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                rows={4}
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving...' : church ? 'Update Church' : 'Create Church'}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
