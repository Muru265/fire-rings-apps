import { REGIONS } from '../lib/api'

export default function RegionPick({ value, onChange, only }: { value: string; onChange: (r: string) => void; only?: string[] }) {
  return (
    <div className="row" role="group" aria-label="Region" data-testid="region-pick">
      {REGIONS.filter((r) => !only || only.includes(r.id)).map((r) => (
        <button key={r.id} className="btn" aria-pressed={r.id === value} onClick={() => onChange(r.id)}
          style={r.id === value ? { borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)' } : undefined}>{r.name}</button>
      ))}
    </div>
  )
}
