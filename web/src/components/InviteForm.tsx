import { useState } from 'react'

interface Props {
  threadId: string
  onInvited: () => void
}

export function InviteForm({ threadId, onInvited }: Props) {
  const [identity, setIdentity] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identity || !reason) return

    setSubmitting(true)
    try {
      await fetch(`/api/threads/${threadId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity, reason }),
      })
      setIdentity('')
      setReason('')
      onInvited()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="invite-form" onSubmit={handleSubmit}>
      <h3>Invite</h3>
      <input
        placeholder="e.g. human:alice or ai:sre-agent"
        value={identity}
        onChange={(e) => setIdentity(e.target.value)}
        required
      />
      <input
        placeholder="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Inviting...' : 'Invite'}
      </button>
    </form>
  )
}
