import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ParticipantList } from '../components/ParticipantList'
import { InviteForm } from '../components/InviteForm'
import { StatusDropdown } from '../components/StatusDropdown'

interface ThreadDetail {
  id: string
  slug: string
  accessToken: string
  title: string
  status: string
  tags: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
  participants: Array<{
    id: string
    agentId: string
    role: string
    joinedAt: string
  }>
}

const PROOF_SDK_URL = 'http://localhost:4000'

export function ThreadPage() {
  const { id } = useParams<{ id: string }>()
  const [thread, setThread] = useState<ThreadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchThread = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/threads/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setThread(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchThread()
  }, [fetchThread])

  if (loading) return <div className="loading">Loading thread...</div>
  if (error) return <div className="error">Error: {error}</div>
  if (!thread) return <div className="error">Thread not found</div>

  const editorUrl = `${PROOF_SDK_URL}/d/${thread.slug}?token=${thread.accessToken}`

  return (
    <div className="thread-page">
      <div className="thread-page-header">
        <Link to="/" className="back-link">← Queue</Link>
        <h1>{thread.title}</h1>
        <div className="thread-page-tags">
          {thread.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>

      <div className="thread-layout">
        <div className="thread-editor">
          <iframe
            src={editorUrl}
            title="Proof Editor"
            className="proof-iframe"
          />
        </div>

        <aside className="thread-sidebar">
          <StatusDropdown
            threadId={thread.id}
            currentStatus={thread.status}
            onChanged={(status) => setThread((t) => t ? { ...t, status } : t)}
          />

          <ParticipantList participants={thread.participants} />

          <InviteForm threadId={thread.id} onInvited={fetchThread} />
        </aside>
      </div>
    </div>
  )
}
