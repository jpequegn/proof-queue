import { useState } from 'react'

interface Props {
  onCreated: () => void
}

export function CreateThreadForm({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !createdBy) return

    setSubmitting(true)
    try {
      await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          createdBy,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      })
      setTitle('')
      setTags('')
      setCreatedBy('')
      setOpen(false)
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button className="create-btn" onClick={() => setOpen(true)}>
        + New Thread
      </button>
    )
  }

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        placeholder="Created by (e.g. user-1)"
        value={createdBy}
        onChange={(e) => setCreatedBy(e.target.value)}
        required
      />
      <input
        placeholder="Tags (comma-separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create'}
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  )
}
