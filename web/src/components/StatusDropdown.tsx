import { useState } from 'react'

const STATUSES = ['open', 'in_progress', 'resolved', 'escalated'] as const

interface Props {
  threadId: string
  currentStatus: string
  onChanged: (status: string) => void
}

export function StatusDropdown({ threadId, currentStatus, onChanged }: Props) {
  const [updating, setUpdating] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value
    setUpdating(true)
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) onChanged(status)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="status-dropdown">
      <h3>Status</h3>
      <select value={currentStatus} onChange={handleChange} disabled={updating}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </select>
    </div>
  )
}
