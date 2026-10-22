import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

interface Crumb { label: string; to?: string }

interface TopbarProps {
  crumbs?: Crumb[]
  right?: React.ReactNode
}

export const Topbar: React.FC<TopbarProps> = ({ crumbs, right }) => {
  const navigate = useNavigate()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 32px', borderBottom: '1px solid var(--line)',
      background: 'var(--bg-panel)', position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <div style={{
            width: 30, height: 30, display: 'grid', placeItems: 'center',
            background: 'var(--gold)',
            clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
            color: 'var(--bg-deep)', fontWeight: 700, fontSize: 13,
            fontFamily: 'var(--font-display)',
          }}>8</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>
            Master<b style={{ color: 'var(--gold)' }}>HUD</b>
          </span>
        </div>

        {/* Breadcrumb */}
        {crumbs && crumbs.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: 'var(--ink-faint)',
            paddingLeft: 18, borderLeft: '1px solid var(--line)',
          }}>
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ opacity: 0.4 }}>/</span>}
                {c.to ? (
                  <Link to={c.to} style={{ color: 'var(--ink-faint)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-faint)')}>
                    {c.label}
                  </Link>
                ) : (
                  <span style={{ color: 'var(--ink-dim)' }}>{c.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{right}</div>}
    </div>
  )
}
