'use client'

import { useState } from 'react'
import { PastorForm } from '@/components/pastor-form'
import { PastorsList } from '@/components/pastors-list'
import type { Pastor } from '@/types/database'

export default function PastorsPage() {
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list')
  const [selectedPastor, setSelectedPastor] = useState<Pastor | undefined>()

  function handleSuccess() {
    setMode('list')
    setSelectedPastor(undefined)
  }

  function handleCancel() {
    setMode('list')
    setSelectedPastor(undefined)
  }

  function handleEdit(pastor: Pastor) {
    setSelectedPastor(pastor)
    setMode('edit')
  }

  function handleNew() {
    setSelectedPastor(undefined)
    setMode('new')
  }

  return (
    <div className="max-w-6xl mx-auto">
      {mode === 'list' ? (
        <PastorsList onEdit={handleEdit} onNew={handleNew} />
      ) : (
        <PastorForm
          pastor={selectedPastor}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
