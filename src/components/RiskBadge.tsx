import type { RiskLevel } from '../api/types'

export function RiskBadge({ level }: { level: RiskLevel | null }) {
  if (!level) return <span className="badge badge-neutral">Risk: n/a</span>
  return <span className={`badge badge-risk-${level.toLowerCase()}`}>Risk: {level}</span>
}
