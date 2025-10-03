'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2, Mail, Phone, Search } from 'lucide-react'
import type { Member } from '@/types/database'

interface MembersListProps {
  onEdit?: (member: Member) => void
  onNew?: () => void
}

interface MemberWithChurch extends Member {
  church?: { name: string }
}

export function MembersList({ onEdit, onNew }: MembersListProps) {
  const [members, setMembers] = useState<MemberWithChurch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const supabase = createClient()

  async function loadMembers() {
    try {
      setLoading(true)

      // Fetch members with church information
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('name', { ascending: true })

      if (membersError) throw membersError

      // Fetch churches for display
      const { data: churchesData, error: churchesError } = await supabase
        .from('churches')
        .select('id, name')

      if (churchesError) throw churchesError

      // Map churches by ID
      const churchesMap = new Map(churchesData?.map(c => [c.id, c]) || [])

      // Enrich members with church names
      const enrichedMembers = (membersData || []).map(member => ({
        ...member,
        church: churchesMap.get(member.church_id)
      }))

      setMembers(enrichedMembers)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading members')
    } finally {
      setLoading(false)
    }
  }

  async function deleteMember(id: string) {
    if (!confirm('Are you sure you want to delete this member?')) return

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadMembers()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error deleting member')
    }
  }

  useEffect(() => {
    loadMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter members by search term
  const filteredMembers = members.filter(member => {
    const term = searchTerm.toLowerCase()
    return (
      member.name.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      member.cpf.includes(term) ||
      member.membership_number?.includes(term) ||
      member.church?.name.toLowerCase().includes(term)
    )
  })

  if (loading) {
    return <div className="text-center p-8">Loading members...</div>
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Members</h2>
          <p className="text-muted-foreground">Manage church member records</p>
        </div>
        {onNew && (
          <Button onClick={onNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Member
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, CPF, membership number, or church..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{members.length}</div>
            <div className="text-xs text-muted-foreground">Total Members</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {members.filter(m => m.situation === 'Active').length}
            </div>
            <div className="text-xs text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {members.filter(m => m.member_status === 'Communicant').length}
            </div>
            <div className="text-xs text-muted-foreground">Communicant</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {members.filter(m => m.office !== 'Not an officer').length}
            </div>
            <div className="text-xs text-muted-foreground">Officers</div>
          </CardContent>
        </Card>
      </div>

      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {searchTerm
              ? `No members found matching "${searchTerm}"`
              : 'No members found. Click "New Member" to add one.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMembers.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {member.photo_url ? (
                      <img
                        src={supabase.storage
                          .from('member-photos')
                          .getPublicUrl(member.photo_url).data.publicUrl}
                        alt={member.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {member.name}
                        {member.office !== 'Not an officer' && (
                          <span className="text-xs font-normal bg-primary/10 text-primary px-2 py-1 rounded">
                            {member.office}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {member.membership_number && `#${member.membership_number} • `}
                        {member.member_status} • {member.situation}
                        {member.church && ` • ${member.church.name}`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMember(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Personal</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Sex</p>
                        <p>{member.sex}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date of Birth</p>
                        <p>{new Date(member.date_of_birth).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">CPF</p>
                        <p>{member.cpf}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Marital Status</p>
                        <p>{member.marital_status}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Contact</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${member.email}`} className="hover:underline">
                          {member.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{member.mobile}</span>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Address</p>
                        <p>{member.address}</p>
                        <p>{member.city}, {member.state}</p>
                        <p>{member.postal_code}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ecclesiastical Information */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Ecclesiastical</h4>
                    <div className="text-sm space-y-2">
                      <div>
                        <p className="text-muted-foreground">Admission Date</p>
                        <p>{new Date(member.admission_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Admission Method</p>
                        <p>{member.admission_method}</p>
                      </div>
                      {member.baptism_date && (
                        <div>
                          <p className="text-muted-foreground">Baptism</p>
                          <p>{new Date(member.baptism_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {member.profession_of_faith_date && (
                        <div>
                          <p className="text-muted-foreground">Profession of Faith</p>
                          <p>{new Date(member.profession_of_faith_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {member.disciplined && (
                        <div className="text-red-600">
                          <p className="font-semibold">⚠ Disciplined</p>
                          {member.discipline_date && (
                            <p className="text-xs">
                              {new Date(member.discipline_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                      {member.pending_transfer && (
                        <div className="text-amber-600">
                          <p className="font-semibold">🔄 Pending Transfer</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {member.history && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-2">History</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {member.history}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
