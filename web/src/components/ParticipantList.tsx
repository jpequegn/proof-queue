interface Participant {
  id: string
  agentId: string
  role: string
  joinedAt: string
}

export function ParticipantList({ participants }: { participants: Participant[] }) {
  if (participants.length === 0) {
    return <div className="participants-empty">No participants yet</div>
  }

  return (
    <div className="participant-list">
      <h3>Participants</h3>
      <ul>
        {participants.map((p) => (
          <li key={p.id} className="participant-item">
            <span className={`participant-icon ${p.role === 'agent' ? 'is-agent' : ''}`}>
              {p.role === 'agent' ? '🤖' : '👤'}
            </span>
            <span className="participant-name">{p.agentId}</span>
            <span className="participant-role">{p.role}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
