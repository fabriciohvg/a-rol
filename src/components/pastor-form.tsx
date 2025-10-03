'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { Pastor, PastorInsert } from '@/types/database'

interface PastorFormProps {
  pastor?: Pastor
  onSuccess?: () => void
  onCancel?: () => void
}

export function PastorForm({ pastor, onSuccess, onCancel }: PastorFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(pastor?.photo_url || null)

  // Form state
  const [formData, setFormData] = useState<Partial<PastorInsert>>({
    name: pastor?.name || '',
    wife: pastor?.wife || '',
    address: pastor?.address || '',
    address_line_2: pastor?.address_line_2 || '',
    neighborhood: pastor?.neighborhood || '',
    city: pastor?.city || '',
    state: pastor?.state || '',
    country: pastor?.country || 'Brazil',
    postal_code: pastor?.postal_code || '',
    phone: pastor?.phone || '',
    mobile: pastor?.mobile || '',
    email: pastor?.email || '',
    cpf: pastor?.cpf || '',
    date_of_birth: pastor?.date_of_birth || '',
    ordination_date: pastor?.ordination_date || '',
    office: pastor?.office || 'Pastor',
    presbytery: pastor?.presbytery || 'PANA',
    retired: pastor?.retired || false,
    retirement_date: pastor?.retirement_date || null,
    released_from_office: pastor?.released_from_office || false,
    released_date: pastor?.released_date || null,
    deceased: pastor?.deceased || false,
    deceased_date: pastor?.deceased_date || null,
    notes: pastor?.notes || '',
    photo_url: pastor?.photo_url || null,
  })

  const supabase = createClient()

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

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return formData.photo_url || null

    try {
      // Delete old photo if exists
      if (pastor?.photo_url) {
        await supabase.storage
          .from('pastor-photos')
          .remove([pastor.photo_url])
      }

      // Upload new photo
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}/photo.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('pastor-photos')
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
      // Upload photo if changed
      const photoPath = await uploadPhoto()

      const pastorData = {
        ...formData,
        photo_url: photoPath,
      } as PastorInsert

      if (pastor) {
        // Update existing pastor
        const { error: updateError } = await supabase
          .from('pastors')
          .update(pastorData)
          .eq('id', pastor.id)

        if (updateError) throw updateError
      } else {
        // Insert new pastor
        const { error: insertError } = await supabase
          .from('pastors')
          .insert(pastorData)

        if (insertError) throw insertError
      }

      onSuccess?.()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pastor ? 'Edit Pastor' : 'New Pastor'}</CardTitle>
        <CardDescription>
          {pastor ? 'Update pastor information' : 'Add a new pastor to the system'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Photo Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-muted">
                {photoPreview ? (
                  <Image
                    src={photoPreview}
                    alt="Pastor photo"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    {formData.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                <Label htmlFor="photo">Photo</Label>
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
                <Label htmlFor="office">Office/Role</Label>
                <Select
                  value={formData.office}
                  onValueChange={(value) => setFormData({ ...formData, office: value as 'Pastor' })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pastor">Pastor</SelectItem>
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

              <div className="grid gap-2">
                <Label htmlFor="wife">Wife</Label>
                <Input
                  id="wife"
                  value={formData.wife || ''}
                  onChange={(e) => setFormData({ ...formData, wife: e.target.value || null })}
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

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="address_line_2">Address Line 2</Label>
                  <Input
                    id="address_line_2"
                    value={formData.address_line_2 || ''}
                    onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value || null })}
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
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
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
                  <Label htmlFor="mobile">Mobile *</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    required
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

            {/* Personal & Ministry Information */}
            <div className="grid gap-4">
              <h3 className="font-semibold">Personal & Ministry Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="123.456.789-00"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ordination_date">Ordination Date *</Label>
                  <Input
                    id="ordination_date"
                    type="date"
                    value={formData.ordination_date}
                    onChange={(e) => setFormData({ ...formData, ordination_date: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="presbytery">Presbytery</Label>
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
              </div>
            </div>

            {/* Status Fields */}
            <div className="grid gap-4">
              <h3 className="font-semibold">Status</h3>
              <div className="grid gap-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="retired"
                    checked={formData.retired}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        retired: checked as boolean,
                        retirement_date: checked ? formData.retirement_date : null
                      })
                    }}
                    disabled={loading}
                  />
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="retired" className="font-normal">
                      Retired
                    </Label>
                    {formData.retired && (
                      <Input
                        type="date"
                        value={formData.retirement_date || ''}
                        onChange={(e) => setFormData({ ...formData, retirement_date: e.target.value })}
                        placeholder="Retirement date"
                        required={formData.retired}
                        disabled={loading}
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="released_from_office"
                    checked={formData.released_from_office}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        released_from_office: checked as boolean,
                        released_date: checked ? formData.released_date : null
                      })
                    }}
                    disabled={loading}
                  />
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="released_from_office" className="font-normal">
                      Released from Office
                    </Label>
                    {formData.released_from_office && (
                      <Input
                        type="date"
                        value={formData.released_date || ''}
                        onChange={(e) => setFormData({ ...formData, released_date: e.target.value })}
                        placeholder="Released date"
                        required={formData.released_from_office}
                        disabled={loading}
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="deceased"
                    checked={formData.deceased}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        deceased: checked as boolean,
                        deceased_date: checked ? formData.deceased_date : null
                      })
                    }}
                    disabled={loading}
                  />
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="deceased" className="font-normal">
                      Deceased
                    </Label>
                    {formData.deceased && (
                      <Input
                        type="date"
                        value={formData.deceased_date || ''}
                        onChange={(e) => setFormData({ ...formData, deceased_date: e.target.value })}
                        placeholder="Deceased date"
                        required={formData.deceased}
                        disabled={loading}
                      />
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
                {loading ? 'Saving...' : pastor ? 'Update Pastor' : 'Create Pastor'}
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
