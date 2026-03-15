const PROFILES = ['sre', 'quant', 'developer', 'pm', 'user'] as const

interface Props {
  value: string
  onChange: (profile: string) => void
}

export function ProfileSwitcher({ value, onChange }: Props) {
  return (
    <div className="profile-switcher">
      {PROFILES.map((p) => (
        <button
          key={p}
          className={`profile-btn ${p === value ? 'active' : ''}`}
          onClick={() => onChange(p)}
        >
          {p.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
