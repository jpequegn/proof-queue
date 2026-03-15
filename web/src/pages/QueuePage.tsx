import { useState } from 'react'
import { useThreads } from '../hooks/useThreads'
import { ProfileSwitcher } from '../components/ProfileSwitcher'
import { ThreadCard } from '../components/ThreadCard'
import { CreateThreadForm } from '../components/CreateThreadForm'

const STORAGE_KEY = 'proof-queue-profile'

function getInitialProfile(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? 'sre'
  } catch {
    return 'sre'
  }
}

export function QueuePage() {
  const [profile, setProfile] = useState(getInitialProfile)
  const { threads, loading, error, refetch } = useThreads(profile)

  const handleProfileChange = (p: string) => {
    setProfile(p)
    try {
      localStorage.setItem(STORAGE_KEY, p)
    } catch {
      // ignore
    }
  }

  return (
    <div className="queue-page">
      <header className="queue-header">
        <h1>Proof Queue</h1>
        <ProfileSwitcher value={profile} onChange={handleProfileChange} />
      </header>

      <div className="queue-actions">
        <CreateThreadForm onCreated={refetch} />
      </div>

      {loading && <div className="loading">Loading threads...</div>}
      {error && <div className="error">Error: {error}</div>}

      <div className="thread-list">
        {threads.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} />
        ))}
        {!loading && threads.length === 0 && (
          <div className="empty">No threads yet. Create one to get started.</div>
        )}
      </div>
    </div>
  )
}
