'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Users } from 'lucide-react'
import type { MemberFamilyRelationship, FamilyRelationshipType } from '@/types/database'

interface MemberFamilyRelationshipsProps {
  memberId: string
  memberName: string
}

interface RelationshipWithMember extends MemberFamilyRelationship {
  related_member?: { name: string; photo_url: string | null }
}

interface MemberSummary {
  id: string
  name: string
  photo_url: string | null
}

export function MemberFamilyRelationships({ memberId, memberName }: MemberFamilyRelationshipsProps) {
  const [relationships, setRelationships] = useState<RelationshipWithMember[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<MemberSummary[]>([])

  // New relationship form state
  const [newRelatedMemberId, setNewRelatedMemberId] = useState('')
  const [newRelationshipType, setNewRelationshipType] = useState<FamilyRelationshipType | ''>('')

  const supabase = createClient()

  async function loadRelationships() {
    try {
      setLoading(true)

      // Fetch relationships for this member
      const { data: relationshipsData, error: relError } = await supabase
        .from('member_family_relationships')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })

      if (relError) throw relError

      // Fetch related members' details
      const relatedMemberIds = relationshipsData?.map(r => r.related_member_id) || []
      if (relatedMemberIds.length > 0) {
        const { data: membersData, error: membersError } = await supabase
          .from('members')
          .select('id, name, photo_url')
          .in('id', relatedMemberIds)

        if (membersError) throw membersError

        const membersMap = new Map(membersData?.map(m => [m.id, m]) || [])

        const enrichedRelationships = (relationshipsData || []).map(rel => ({
          ...rel,
          related_member: membersMap.get(rel.related_member_id)
        }))

        setRelationships(enrichedRelationships)
      } else {
        setRelationships([])
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading relationships')
    } finally {
      setLoading(false)
    }
  }

  async function loadMembers() {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, photo_url')
        .neq('id', memberId) // Exclude current member
        .order('name', { ascending: true })

      if (!error && data) {
        setMembers(data)
      }
    } catch (error) {
      console.error('Error loading members:', error)
    }
  }

  async function addRelationship() {
    if (!newRelatedMemberId || !newRelationshipType) {
      setError('Please select both a member and relationship type')
      return
    }

    setAdding(true)
    setError(null)

    try {
      // Call the helper function to add bidirectional relationship
      const { error } = await supabase.rpc('add_family_relationship', {
        p_member_id: memberId,
        p_related_member_id: newRelatedMemberId,
        p_relationship_type: newRelationshipType
      })

      if (error) throw error

      // Reset form
      setNewRelatedMemberId('')
      setNewRelationshipType('')

      // Reload relationships
      await loadRelationships()
    } catch (error: unknown) {
      console.error('Error adding relationship:', error)
      const err = error as { message?: string }
      setError(err?.message || 'Failed to add relationship')
    } finally {
      setAdding(false)
    }
  }

  async function deleteRelationship(relationshipId: string) {
    if (!confirm('Are you sure you want to delete this relationship?')) return

    try {
      const { error } = await supabase
        .from('member_family_relationships')
        .delete()
        .eq('id', relationshipId)

      if (error) throw error

      await loadRelationships()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error deleting relationship')
    }
  }

  useEffect(() => {
    loadRelationships()
    loadMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId])

  if (loading) {
    return <div className="text-center p-4">Loading family relationships...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Family Relationships
        </CardTitle>
        <CardDescription>
          Manage family connections for {memberName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Relationship */}
        <div className="grid gap-4 p-4 border rounded-lg">
          <h4 className="font-semibold text-sm">Add Family Member</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="relationship_type">Relationship *</Label>
              <Select
                value={newRelationshipType}
                onValueChange={(value) => setNewRelationshipType(value as FamilyRelationshipType)}
                disabled={adding}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Father">Father</SelectItem>
                  <SelectItem value="Mother">Mother</SelectItem>
                  <SelectItem value="Spouse">Spouse</SelectItem>
                  <SelectItem value="Brother/Sister">Brother/Sister</SelectItem>
                  <SelectItem value="Son/Daughter">Son/Daughter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="related_member">Of (Member) *</Label>
              <Select
                value={newRelatedMemberId}
                onValueChange={setNewRelatedMemberId}
                disabled={adding}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button
            onClick={addRelationship}
            disabled={adding || !newRelatedMemberId || !newRelationshipType}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {adding ? 'Adding...' : 'Add Relationship'}
          </Button>
        </div>

        {/* Existing Relationships */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">
            Family Members ({relationships.length})
          </h4>
          {relationships.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No family relationships added yet
            </p>
          ) : (
            <div className="space-y-2">
              {relationships.map((rel) => (
                <div
                  key={rel.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {rel.related_member?.photo_url ? (
                      <img
                        src={supabase.storage
                          .from('member-photos')
                          .getPublicUrl(rel.related_member.photo_url).data.publicUrl}
                        alt={rel.related_member?.name || 'Member'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm">
                        {rel.related_member?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{rel.related_member?.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {rel.relationship_type}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRelationship(rel.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
