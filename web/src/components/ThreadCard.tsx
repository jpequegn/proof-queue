import { Link } from 'react-router-dom'
import type { Thread } from '../hooks/useThreads'

const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',
  in_progress: '#f59e0b',
  resolved: '#10b981',
  escalated: '#ef4444',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function ThreadCard({ thread }: { thread: Thread }) {
  const statusColor = STATUS_COLORS[thread.status] ?? '#6b7280'

  return (
    <Link to={`/threads/${thread.id}`} className="thread-card-link">
    <div className="thread-card">
      <div className="thread-header">
        <h3 className="thread-title">{thread.title}</h3>
        <span className="status-badge" style={{ backgroundColor: statusColor }}>
          {thread.status.replace('_', ' ')}
        </span>
      </div>

      {thread.priority && (
        <div className="priority-row">
          <span className="priority-score">{thread.priority.score}</span>
          <span className="priority-reason">{thread.priority.reason}</span>
        </div>
      )}

      <div className="thread-meta">
        <div className="tags">
          {thread.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
        <span className="thread-time">
          by {thread.createdBy} · {timeAgo(thread.updatedAt)}
        </span>
      </div>
    </div>
    </Link>
  )
}
