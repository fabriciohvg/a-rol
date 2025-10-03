'use client'

import { useState } from 'react'
import { ChurchForm } from '@/components/church-form'
import { ChurchesList } from '@/components/churches-list'
import type { Church } from '@/types/database'

export default function ChurchesPage() {
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list')
  const [selectedChurch, setSelectedChurch] = useState<Church | undefined>()

  function handleSuccess() {
    setMode('list')
    setSelectedChurch(undefined)
  }

  function handleCancel() {
    setMode('list')
    setSelectedChurch(undefined)
  }

  function handleEdit(church: Church) {
    setSelectedChurch(church)
    setMode('edit')
  }

  function handleNew() {
    setSelectedChurch(undefined)
    setMode('new')
  }

  return (
    <div className="max-w-6xl mx-auto">
      {mode === 'list' ? (
        <ChurchesList onEdit={handleEdit} onNew={handleNew} />
      ) : (
        <ChurchForm
          church={selectedChurch}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
