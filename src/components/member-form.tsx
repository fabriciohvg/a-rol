'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type {
  Member,
  MemberInsert,
  Church,
  SexType,
  MaritalStatusType,
  EducationLevelType,
  MemberStatusType,
  MemberOfficeType,
  AdmissionMethodType,
  DismissalMethodType,
  SituationType
} from '@/types/database'

interface MemberFormProps {
  member?: Member
  onSuccess?: () => void
  onCancel?: () => void
}

export function MemberForm({ member, onSuccess, onCancel }: MemberFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(member?.photo_url || null)
  const [churches, setChurches] = useState<Church[]>([])

  // Form state - Personal Data
  const [formData, setFormData] = useState<Partial<MemberInsert>>({
    // Personal Data
    name: member?.name || '',
    wife: member?.wife || null,
    address: member?.address || '',
    address_line_2: member?.address_line_2 || null,
    neighborhood: member?.neighborhood || '',
    city: member?.city || '',
    state: member?.state || '',
    country: member?.country || 'Brazil',
    postal_code: member?.postal_code || '',
    phone: member?.phone || '',
    mobile: member?.mobile || '',
    email: member?.email || '',
    cpf: member?.cpf || '',
    date_of_birth: member?.date_of_birth || '',
    place_of_birth: member?.place_of_birth || '',
    sex: member?.sex || undefined,

    // Additional Data
    marital_status: member?.marital_status || 'Single',
    spouse: member?.spouse || null,
    wedding_date: member?.wedding_date || null,
    cpf_rg: member?.cpf_rg || null,
    issuing_authority: member?.issuing_authority || null,
    education_level: member?.education_level || null,
    profession: member?.profession || null,
    mother_name: member?.mother_name || null,
    father_name: member?.father_name || null,

    // Ecclesiastical Data
    church_id: member?.church_id || '',
    member_status: member?.member_status || 'Communicant',
    office: member?.office || 'Not an officer',
    baptism_date: member?.baptism_date || null,
    baptism_pastor: member?.baptism_pastor || null,
    baptism_church: member?.baptism_church || null,
    profession_of_faith_date: member?.profession_of_faith_date || null,
    profession_of_faith_pastor: member?.profession_of_faith_pastor || null,
    profession_of_faith_church: member?.profession_of_faith_church || null,
    admission_date: member?.admission_date || '',
    admission_method: member?.admission_method || undefined,
    dismissal_date: member?.dismissal_date || null,
    dismissal_method: member?.dismissal_method || null,
    situation: member?.situation || 'Active',
    disciplined: member?.disciplined || false,
    discipline_date: member?.discipline_date || null,
    discipline_notes: member?.discipline_notes || null,
    pending_transfer: member?.pending_transfer || false,

    // History
    history: member?.history || null,
    photo_url: member?.photo_url || null,
  })

  const supabase = createClient()

  // Load churches for select field
  useEffect(() => {
    async function loadChurches() {
      const { data, error } = await supabase
        .from('churches')
        .select('*')
        .order('name', { ascending: true })

      if (!error && data) {
        setChurches(data)
      }
    }
    loadChurches()
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

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return formData.photo_url || null

    try {
      // Delete old photo if exists
      if (member?.photo_url) {
        await supabase.storage
          .from('member-photos')
          .remove([member.photo_url])
      }

      // Upload new photo
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}/photo.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('member-photos')
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
      if (!formData.church_id) {
        throw new Error('Please select a church')
      }
      if (!formData.sex) {
        throw new Error('Please select sex')
      }
      if (!formData.admission_method) {
        throw new Error('Please select admission method')
      }
      if (formData.disciplined && !formData.discipline_date) {
        throw new Error('Discipline date is required when member is disciplined')
      }

      // Upload photo if changed
      const photoPath = await uploadPhoto()

      const memberData = {
        ...formData,
        photo_url: photoPath,
        // Ensure empty strings become null for optional fields
        wife: formData.wife?.trim() || null,
        address_line_2: formData.address_line_2?.trim() || null,
        spouse: formData.spouse?.trim() || null,
        wedding_date: formData.wedding_date || null,
        cpf_rg: formData.cpf_rg?.trim() || null,
        issuing_authority: formData.issuing_authority?.trim() || null,
        profession: formData.profession?.trim() || null,
        mother_name: formData.mother_name?.trim() || null,
        father_name: formData.father_name?.trim() || null,
        baptism_date: formData.baptism_date || null,
        baptism_pastor: formData.baptism_pastor?.trim() || null,
        baptism_church: formData.baptism_church?.trim() || null,
        profession_of_faith_date: formData.profession_of_faith_date || null,
        profession_of_faith_pastor: formData.profession_of_faith_pastor?.trim() || null,
        profession_of_faith_church: formData.profession_of_faith_church?.trim() || null,
        dismissal_date: formData.dismissal_date || null,
        dismissal_method: formData.dismissal_method || null,
        discipline_date: formData.disciplined ? formData.discipline_date : null,
        discipline_notes: formData.disciplined ? (formData.discipline_notes?.trim() || null) : null,
        history: formData.history?.trim() || null,
      } as MemberInsert

      if (member) {
        // Update existing member
        const { error: updateError } = await supabase
          .from('members')
          .update(memberData)
          .eq('id', member.id)

        if (updateError) throw updateError
      } else {
        // Insert new member
        const { error: insertError } = await supabase
          .from('members')
          .insert(memberData)

        if (insertError) throw insertError
      }

      onSuccess?.()
    } catch (error: unknown) {
      console.error('Member form error:', error)
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
        <CardTitle>{member ? 'Edit Member' : 'New Member'}</CardTitle>
        <CardDescription>
          {member ? 'Update member information' : 'Add a new member to the system'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-8">
            {/* Photo Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-muted">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Member photo"
                    className="w-full h-full object-cover"
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

            {/* Personal Data Section */}
            <div className="grid gap-6">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold">Personal Data</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                  <Label htmlFor="sex">Sex *</Label>
                  <Select
                    value={formData.sex}
                    onValueChange={(value) => setFormData({ ...formData, sex: value as SexType })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="place_of_birth">Place of Birth *</Label>
                  <Input
                    id="place_of_birth"
                    value={formData.place_of_birth}
                    onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="123.456.789-00"
                    pattern="\d{3}\.\d{3}\.\d{3}-\d{2}"
                    title="Format: 123.456.789-00"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
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

                <div className="grid gap-2">
                  <Label htmlFor="wife">Wife (legacy field)</Label>
                  <Input
                    id="wife"
                    value={formData.wife || ''}
                    onChange={(e) => setFormData({ ...formData, wife: e.target.value || null })}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Address */}
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

            {/* Additional Data Section */}
            <div className="grid gap-6">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold">Additional Data</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="marital_status">Marital Status *</Label>
                  <Select
                    value={formData.marital_status}
                    onValueChange={(value) => setFormData({ ...formData, marital_status: value as MaritalStatusType })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Separated">Separated</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                      <SelectItem value="Common-law union">Common-law union</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="spouse">Spouse</Label>
                  <Input
                    id="spouse"
                    value={formData.spouse || ''}
                    onChange={(e) => setFormData({ ...formData, spouse: e.target.value || null })}
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="wedding_date">Wedding Date</Label>
                  <Input
                    id="wedding_date"
                    type="date"
                    value={formData.wedding_date || ''}
                    onChange={(e) => setFormData({ ...formData, wedding_date: e.target.value || null })}
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cpf_rg">CPF/RG</Label>
                  <Input
                    id="cpf_rg"
                    value={formData.cpf_rg || ''}
                    onChange={(e) => setFormData({ ...formData, cpf_rg: e.target.value || null })}
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="issuing_authority">Issuing Authority</Label>
                  <Input
                    id="issuing_authority"
                    value={formData.issuing_authority || ''}
                    onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value || null })}
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="education_level">Education Level</Label>
                  <Select
                    value={formData.education_level || ''}
                    onValueChange={(value) => setFormData({ ...formData, education_level: value as EducationLevelType })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Primary school">Primary school</SelectItem>
                      <SelectItem value="High school">High school</SelectItem>
                      <SelectItem value="Vocational/Technical">Vocational/Technical</SelectItem>
                      <SelectItem value="College/University">College/University</SelectItem>
                      <SelectItem value="Master's">Master&apos;s</SelectItem>
                      <SelectItem value="Doctorate">Doctorate</SelectItem>
                      <SelectItem value="Post-doc">Post-doc</SelectItem>
                      <SelectItem value="Illiterate">Illiterate</SelectItem>
                      <SelectItem value="Literate">Literate</SelectItem>
                      <SelectItem value="Not informed">Not informed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    value={formData.profession || ''}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value || null })}
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="mother_name">Mother&apos;s Name</Label>
                  <Input
                    id="mother_name"
                    value={formData.mother_name || ''}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value || null })}
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="father_name">Father&apos;s Name</Label>
                  <Input
                    id="father_name"
                    value={formData.father_name || ''}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value || null })}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Ecclesiastical Data Section */}
            <div className="grid gap-6">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold">Ecclesiastical Data</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="church_id">Church *</Label>
                  <Select
                    value={formData.church_id}
                    onValueChange={(value) => setFormData({ ...formData, church_id: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select church" />
                    </SelectTrigger>
                    <SelectContent>
                      {churches.map((church) => (
                        <SelectItem key={church.id} value={church.id}>
                          {church.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {member?.membership_number && (
                  <div className="grid gap-2">
                    <Label htmlFor="membership_number">Membership Number</Label>
                    <Input
                      id="membership_number"
                      value={member.membership_number}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="member_status">Member Status *</Label>
                  <Select
                    value={formData.member_status}
                    onValueChange={(value) => setFormData({ ...formData, member_status: value as MemberStatusType })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Communicant">Communicant</SelectItem>
                      <SelectItem value="Non-communicant">Non-communicant</SelectItem>
                      <SelectItem value="Not a member">Not a member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="office">Office *</Label>
                  <Select
                    value={formData.office}
                    onValueChange={(value) => setFormData({ ...formData, office: value as MemberOfficeType })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not an officer">Not an officer</SelectItem>
                      <SelectItem value="Deacon">Deacon</SelectItem>
                      <SelectItem value="Elder">Elder</SelectItem>
                      <SelectItem value="Elder on availability">Elder on availability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="situation">Situation *</Label>
                  <Select
                    value={formData.situation}
                    onValueChange={(value) => setFormData({ ...formData, situation: value as SituationType })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Attends">Attends</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="admission_date">Admission Date *</Label>
                  <Input
                    id="admission_date"
                    type="date"
                    value={formData.admission_date}
                    onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="admission_method">Admission Method *</Label>
                  <Select
                    value={formData.admission_method}
                    onValueChange={(value) => setFormData({ ...formData, admission_method: value as AdmissionMethodType })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select admission method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baptism">Baptism</SelectItem>
                      <SelectItem value="Profession of faith">Profession of faith</SelectItem>
                      <SelectItem value="Baptism and Profession of faith">Baptism and Profession of faith</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                      <SelectItem value="Transfer of guardians">Transfer of guardians</SelectItem>
                      <SelectItem value="Restoration">Restoration</SelectItem>
                      <SelectItem value="Ex-officio jurisdiction">Ex-officio jurisdiction</SelectItem>
                      <SelectItem value="Jurisdiction on request">Jurisdiction on request</SelectItem>
                      <SelectItem value="Jurisdiction over guardians">Jurisdiction over guardians</SelectItem>
                      <SelectItem value="Presbytery designation">Presbytery designation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Baptism Information */}
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="grid gap-2 md:col-span-2">
                  <h4 className="font-semibold text-sm">Baptism Information</h4>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="baptism_date">Baptism Date</Label>
                  <Input
                    id="baptism_date"
                    type="date"
                    value={formData.baptism_date || ''}
                    onChange={(e) => setFormData({ ...formData, baptism_date: e.target.value || null })}
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="baptism_pastor">Pastor (Baptism)</Label>
                  <Input
                    id="baptism_pastor"
                    value={formData.baptism_pastor || ''}
                    onChange={(e) => setFormData({ ...formData, baptism_pastor: e.target.value || null })}
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="baptism_church">Church (Baptism)</Label>
                  <Input
                    id="baptism_church"
                    value={formData.baptism_church || ''}
                    onChange={(e) => setFormData({ ...formData, baptism_church: e.target.value || null })}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Profession of Faith Information */}
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="grid gap-2 md:col-span-2">
                  <h4 className="font-semibold text-sm">Profession of Faith Information</h4>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profession_of_faith_date">Profession of Faith Date</Label>
                  <Input
                    id="profession_of_faith_date"
                    type="date"
                    value={formData.profession_of_faith_date || ''}
                    onChange={(e) => setFormData({ ...formData, profession_of_faith_date: e.target.value || null })}
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profession_of_faith_pastor">Pastor (Profession of Faith)</Label>
                  <Input
                    id="profession_of_faith_pastor"
                    value={formData.profession_of_faith_pastor || ''}
                    onChange={(e) => setFormData({ ...formData, profession_of_faith_pastor: e.target.value || null })}
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profession_of_faith_church">Church (Profession of Faith)</Label>
                  <Input
                    id="profession_of_faith_church"
                    value={formData.profession_of_faith_church || ''}
                    onChange={(e) => setFormData({ ...formData, profession_of_faith_church: e.target.value || null })}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Dismissal Information */}
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="grid gap-2 md:col-span-2">
                  <h4 className="font-semibold text-sm">Dismissal Information</h4>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dismissal_date">Dismissal Date</Label>
                  <Input
                    id="dismissal_date"
                    type="date"
                    value={formData.dismissal_date || ''}
                    onChange={(e) => setFormData({ ...formData, dismissal_date: e.target.value || null })}
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dismissal_method">Dismissal Method</Label>
                  <Select
                    value={formData.dismissal_method || ''}
                    onValueChange={(value) => setFormData({ ...formData, dismissal_method: value as DismissalMethodType })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select dismissal method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Disciplinary exclusion">Disciplinary exclusion</SelectItem>
                      <SelectItem value="Exclusion on request">Exclusion on request</SelectItem>
                      <SelectItem value="Exclusion due to absence">Exclusion due to absence</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                      <SelectItem value="Transfer of guardians">Transfer of guardians</SelectItem>
                      <SelectItem value="Transfer by session/council">Transfer by session/council</SelectItem>
                      <SelectItem value="Jurisdiction assumed">Jurisdiction assumed</SelectItem>
                      <SelectItem value="Jurisdiction over guardians">Jurisdiction over guardians</SelectItem>
                      <SelectItem value="Profession of faith">Profession of faith</SelectItem>
                      <SelectItem value="Deceased">Deceased</SelectItem>
                      <SelectItem value="Majority/coming of age">Majority/coming of age</SelectItem>
                      <SelectItem value="Guardians' request">Guardians&apos; request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Discipline & Transfer */}
              <div className="grid gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="disciplined"
                    checked={formData.disciplined}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        disciplined: checked as boolean,
                        discipline_date: checked ? formData.discipline_date : null,
                        discipline_notes: checked ? formData.discipline_notes : null
                      })
                    }}
                    disabled={loading}
                  />
                  <Label htmlFor="disciplined" className="font-normal">
                    Disciplined
                  </Label>
                </div>
                {formData.disciplined && (
                  <div className="grid md:grid-cols-2 gap-4 ml-7">
                    <div className="grid gap-2">
                      <Label htmlFor="discipline_date">Discipline Date *</Label>
                      <Input
                        id="discipline_date"
                        type="date"
                        value={formData.discipline_date || ''}
                        onChange={(e) => setFormData({ ...formData, discipline_date: e.target.value })}
                        required={formData.disciplined}
                        disabled={loading}
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor="discipline_notes">Discipline Notes</Label>
                      <Textarea
                        id="discipline_notes"
                        value={formData.discipline_notes || ''}
                        onChange={(e) => setFormData({ ...formData, discipline_notes: e.target.value || null })}
                        rows={3}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="pending_transfer"
                    checked={formData.pending_transfer}
                    onCheckedChange={(checked) => setFormData({ ...formData, pending_transfer: checked as boolean })}
                    disabled={loading}
                  />
                  <Label htmlFor="pending_transfer" className="font-normal">
                    Pending Transfer
                  </Label>
                </div>
              </div>
            </div>

            {/* History Section */}
            <div className="grid gap-4">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold">History</h3>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="history">History</Label>
                <Textarea
                  id="history"
                  value={formData.history || ''}
                  onChange={(e) => setFormData({ ...formData, history: e.target.value || null })}
                  rows={6}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving...' : member ? 'Update Member' : 'Create Member'}
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
