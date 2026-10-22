import React from 'react'

// ── Button ──────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'sm' | 'md'
}

const variantStyles: Record<BtnVariant, React.CSSProperties> = {
  primary:        { background: 'var(--gold)', color: 'var(--bg-deep)', border: 'none' },
  secondary:      { background: 'none', border: '1px solid var(--gold-dim)', color: 'var(--gold)' },
  ghost:          { background: 'none', border: '1px solid var(--line)', color: 'var(--ink-dim)' },
  danger:         { background: 'var(--blood)', color: 'var(--ink)', border: 'none' },
  'danger-outline': { background: 'none', border: '1px solid var(--blood-dim)', color: '#e07a7a' },
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', style, children, ...props
}) => (
  <button
    style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: size === 'sm' ? 12 : 13,
      padding: size === 'sm' ? '6px 12px' : '10px 18px',
      borderRadius: 'var(--radius-sm)',
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      letterSpacing: '0.5px',
      opacity: props.disabled ? 0.5 : 1,
      ...variantStyles[variant],
      ...style,
    }}
    {...props}
  >
    {children}
  </button>
)

// ── Input ────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input: React.FC<InputProps> = ({ label, style, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && (
      <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink-faint)' }}>
        {label}
      </label>
    )}
    <input
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--ink)',
        fontSize: 14,
        padding: '10px 12px',
        outline: 'none',
        width: '100%',
        fontFamily: 'var(--font-body)',
        ...style,
      }}
      {...props}
    />
  </div>
)

// ── Textarea ─────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const Textarea: React.FC<TextareaProps> = ({ label, style, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && (
      <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink-faint)' }}>
        {label}
      </label>
    )}
    <textarea
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--ink)',
        fontSize: 13.5,
        padding: '10px 12px',
        outline: 'none',
        width: '100%',
        fontFamily: 'var(--font-body)',
        resize: 'vertical',
        minHeight: 80,
        ...style,
      }}
      {...props}
    />
  </div>
)

// ── Select ────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export const Select: React.FC<SelectProps> = ({ label, style, children, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && (
      <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink-faint)' }}>
        {label}
      </label>
    )}
    <select
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--ink)',
        fontSize: 13.5,
        padding: '10px 12px',
        outline: 'none',
        width: '100%',
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  </div>
)

// ── Badge ────────────────────────────────────────────────────────────
type BadgeColor = 'gold' | 'moss' | 'blood' | 'neutral' | 'custom'

interface BadgeProps {
  color?: BadgeColor
  children: React.ReactNode
  style?: React.CSSProperties
}

const badgeColors: Record<BadgeColor, React.CSSProperties> = {
  gold:    { background: 'rgba(232,163,61,0.12)', color: 'var(--gold)', border: '1px solid var(--gold-dim)' },
  moss:    { background: 'rgba(91,140,90,0.15)',  color: 'var(--moss)',  border: '1px solid var(--moss)' },
  blood:   { background: 'rgba(193,62,62,0.15)',  color: '#e07a7a',     border: '1px solid var(--blood-dim)' },
  neutral: { background: 'var(--bg-card)',         color: 'var(--ink-dim)', border: '1px solid var(--line)' },
  custom:  {},
}

export const Badge: React.FC<BadgeProps> = ({ color = 'neutral', children, style }) => (
  <span style={{
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '2px 8px',
    borderRadius: 20,
    ...badgeColors[color],
    ...style,
  }}>
    {children}
  </span>
)

// ── Panel ─────────────────────────────────────────────────────────────
interface PanelProps {
  children: React.ReactNode
  style?: React.CSSProperties
  danger?: boolean
}

export const Panel: React.FC<PanelProps> = ({ children, style, danger }) => (
  <div style={{
    background: danger ? 'rgba(193,62,62,0.04)' : 'var(--bg-panel)',
    border: `1px solid ${danger ? 'var(--blood-dim)' : 'var(--line)'}`,
    borderRadius: 'var(--radius)',
    padding: 24,
    ...style,
  }}>
    {children}
  </div>
)

// ── PanelTitle ────────────────────────────────────────────────────────
export const PanelTitle: React.FC<{ children: React.ReactNode; danger?: boolean }> = ({ children, danger }) => (
  <div style={{
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    fontWeight: 600,
    color: danger ? '#e07a7a' : 'var(--gold)',
    marginBottom: 6,
    letterSpacing: '0.5px',
  }}>
    {children}
  </div>
)

// ── SectionLabel ──────────────────────────────────────────────────────
export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 11,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    marginBottom: 12,
  }}>
    {children}
  </div>
)

// ── HpBar ─────────────────────────────────────────────────────────────
export const HpBar: React.FC<{ atual: number; maximo: number }> = ({ atual, maximo }) => {
  const pct = Math.max(0, Math.min(100, (atual / maximo) * 100))
  const cor = pct > 50 ? 'var(--moss)' : pct > 25 ? 'var(--gold)' : 'var(--blood)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 1 }}>HP</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>
          {atual}<span style={{ color: 'var(--ink-faint)', fontSize: 12, fontWeight: 400 }}> / {maximo}</span>
        </span>
      </div>
      <div style={{ height: 10, background: '#11141d', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 5, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

// ── XpBar ─────────────────────────────────────────────────────────────
export const XpBar: React.FC<{ xp: number; xpProximo: number; nivel: number }> = ({ xp, xpProximo, nivel }) => {
  const pct = Math.min(100, (xp / xpProximo) * 100)
  const pronto = pct >= 100
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--gold)' }}>Nível {nivel}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{xp} / {xpProximo} XP</span>
      </div>
      <div style={{ height: 8, background: '#11141d', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: pronto ? 'var(--gold)' : 'var(--gold-dim)',
          borderRadius: 4, transition: 'width 0.3s',
        }} />
      </div>
      {pronto && (
        <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, textAlign: 'center' }}>
          ✦ Pronto para subir de nível!
        </div>
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, width = 440 }) => {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,12,18,0.75)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width, maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--bg-panel)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────
export const Avatar: React.FC<{ nome: string; src?: string; size?: number; border?: string }> = ({
  nome, src, size = 48, border,
}) => {
  const initials = nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return src ? (
    <img
      src={src}
      alt={nome}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover',
        border: border || '2px solid var(--line)', flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--gold-dim)', color: 'var(--bg-deep)',
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 700,
      fontSize: size * 0.35,
      border: border || '2px solid var(--line)', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────
export const Toast: React.FC<{ message: string; visible: boolean }> = ({ message, visible }) => (
  <div style={{
    position: 'fixed', bottom: 28, left: '50%',
    transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
    background: 'var(--bg-card)', border: '1px solid var(--moss)',
    color: 'var(--ink)', padding: '12px 20px', borderRadius: 9,
    fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8,
    opacity: visible ? 1 : 0, transition: 'all 0.25s', zIndex: 200,
    pointerEvents: 'none',
  }}>
    <span style={{ color: 'var(--moss)', fontWeight: 700 }}>✓</span> {message}
  </div>
)
