import { useState, useEffect, useCallback } from 'react'
import { useSSE } from './useSSE'

export interface Thread {
  id: string
  slug: string
  title: string
  status: string
  tags: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
  priority?: { score: number; reason: string }
}

export function useThreads(profile: string) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchThreads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = profile ? `?profile=${profile}` : ''
      const res = await fetch(`/api/threads${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setThreads(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  useSSE('/api/threads/stream', (event, data) => {
    if (event === 'thread:created') {
      setThreads((prev) => [data as Thread, ...prev])
    } else if (event === 'thread:updated') {
      const updated = data as Thread
      setThreads((prev) =>
        prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
      )
    } else if (event === 'thread:deleted') {
      const { id } = data as { id: string }
      setThreads((prev) => prev.filter((t) => t.id !== id))
    }
  })

  return { threads, loading, error, refetch: fetchThreads }
}
