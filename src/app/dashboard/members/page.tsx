'use client'

import { useState } from 'react'
import { MemberForm } from '@/components/member-form'
import { MembersList } from '@/components/members-list'
import type { Member } from '@/types/database'

export default function MembersPage() {
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list')
  const [selectedMember, setSelectedMember] = useState<Member | undefined>()

  function handleSuccess() {
    setMode('list')
    setSelectedMember(undefined)
  }

  function handleCancel() {
    setMode('list')
    setSelectedMember(undefined)
  }

  function handleEdit(member: Member) {
    setSelectedMember(member)
    setMode('edit')
  }

  function handleNew() {
    setSelectedMember(undefined)
    setMode('new')
  }

  return (
    <div className="max-w-7xl mx-auto">
      {mode === 'list' ? (
        <MembersList onEdit={handleEdit} onNew={handleNew} />
      ) : (
        <MemberForm
          member={selectedMember}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
