'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Edit, Trash2, Globe, Mail, Phone } from 'lucide-react'
import type { Church } from '@/types/database'

interface ChurchesListProps {
  onEdit?: (church: Church) => void
  onNew?: () => void
}

interface ChurchWithPastors extends Church {
  lead_pastor?: { name: string }
  assistant_pastors?: { name: string }[]
}

export function ChurchesList({ onEdit, onNew }: ChurchesListProps) {
  const [churches, setChurches] = useState<ChurchWithPastors[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function loadChurches() {
    try {
      setLoading(true)

      // Fetch churches
      const { data: churchesData, error: churchesError } = await supabase
        .from('churches')
        .select('*')
        .order('name', { ascending: true })

      if (churchesError) throw churchesError

      // Fetch all pastors referenced
      const { data: pastorsData, error: pastorsError } = await supabase
        .from('pastors')
        .select('id, name')

      if (pastorsError) throw pastorsError

      // Map pastors by ID for quick lookup
      const pastorsMap = new Map(pastorsData?.map(p => [p.id, p]) || [])

      // Enrich churches with pastor names
      const enrichedChurches = (churchesData || []).map(church => ({
        ...church,
        lead_pastor: pastorsMap.get(church.lead_pastor_id),
        assistant_pastors: church.assistant_pastor_ids
          .map((id: string) => pastorsMap.get(id))
          .filter(Boolean) as { name: string }[]
      }))

      setChurches(enrichedChurches)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading churches')
    } finally {
      setLoading(false)
    }
  }

  async function deleteChurch(id: string) {
    if (!confirm('Are you sure you want to delete this church?')) return

    try {
      const { error } = await supabase
        .from('churches')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadChurches()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error deleting church')
    }
  }

  useEffect(() => {
    loadChurches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return <div className="text-center p-8">Loading churches...</div>
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Churches</h2>
          <p className="text-muted-foreground">Manage church records</p>
        </div>
        {onNew && (
          <Button onClick={onNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Church
          </Button>
        )}
      </div>

      {churches.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No churches found. Click &quot;New Church&quot; to add one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {churches.map((church) => (
            <Card key={church.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {church.photo_url ? (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                        <Image
                          src={supabase.storage
                            .from('church-photos')
                            .getPublicUrl(church.photo_url).data.publicUrl}
                          alt={church.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-2xl">
                        {church.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <CardTitle>{church.name}</CardTitle>
                      <CardDescription>
                        {church.type} • {church.presbytery}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(church)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteChurch(church.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Contact Information */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Contact</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${church.email}`} className="hover:underline">
                          {church.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{church.phone}</span>
                      </div>
                      {church.website && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <a
                            href={church.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {church.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Location</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{church.address}</p>
                      <p>{church.neighborhood}</p>
                      <p>{church.city}, {church.state} - {church.postal_code}</p>
                      <p>{church.country}</p>
                    </div>
                  </div>

                  {/* Ministry Information */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Ministry</h4>
                    <div className="text-sm space-y-2">
                      <div>
                        <p className="text-muted-foreground">CNPJ</p>
                        <p>{church.cnpj}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Organization Date</p>
                        <p>{new Date(church.organization_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pastors */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Leadership</h4>
                    <div className="text-sm space-y-2">
                      <div>
                        <p className="text-muted-foreground">Lead Pastor</p>
                        <p>{church.lead_pastor?.name || 'N/A'}</p>
                      </div>
                      {church.assistant_pastors && church.assistant_pastors.length > 0 && (
                        <div>
                          <p className="text-muted-foreground">Assistant Pastors</p>
                          <ul className="list-disc list-inside">
                            {church.assistant_pastors.map((pastor, idx) => (
                              <li key={idx}>{pastor.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {church.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {church.notes}
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
