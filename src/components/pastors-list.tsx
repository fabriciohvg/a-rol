'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Edit, Trash2 } from 'lucide-react'
import type { Pastor } from '@/types/database'

interface PastorsListProps {
  onEdit?: (pastor: Pastor) => void
  onNew?: () => void
}

export function PastorsList({ onEdit, onNew }: PastorsListProps) {
  const [pastors, setPastors] = useState<Pastor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function loadPastors() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pastors')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error

      setPastors(data || [])
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading pastors')
    } finally {
      setLoading(false)
    }
  }

  async function deletePastor(id: string) {
    if (!confirm('Are you sure you want to delete this pastor?')) return

    try {
      const { error } = await supabase
        .from('pastors')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadPastors()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error deleting pastor')
    }
  }

  useEffect(() => {
    loadPastors()
  }, [])

  if (loading) {
    return <div className="text-center p-8">Loading pastors...</div>
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pastors</h2>
          <p className="text-muted-foreground">Manage pastor records</p>
        </div>
        {onNew && (
          <Button onClick={onNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Pastor
          </Button>
        )}
      </div>

      {pastors.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No pastors found. Click &quot;New Pastor&quot; to add one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pastors.map((pastor) => (
            <Card key={pastor.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {pastor.photo_url ? (
                      <img
                        src={supabase.storage
                          .from('pastor-photos')
                          .getPublicUrl(pastor.photo_url).data.publicUrl}
                        alt={pastor.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl">
                        {pastor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <CardTitle>{pastor.name}</CardTitle>
                      <CardDescription>
                        {pastor.office} • {pastor.presbytery}
                        {pastor.retired && ' • Retired'}
                        {pastor.deceased && ' • Deceased'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(pastor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deletePastor(pastor.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p>{pastor.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mobile</p>
                    <p>{pastor.mobile}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">City/State</p>
                    <p>{pastor.city}, {pastor.state}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CPF</p>
                    <p>{pastor.cpf}</p>
                  </div>
                  {pastor.wife && (
                    <div>
                      <p className="text-muted-foreground">Wife</p>
                      <p>{pastor.wife}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Ordination Date</p>
                    <p>{new Date(pastor.ordination_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
