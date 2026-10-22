import React, { useState } from 'react'
import { Button, Modal } from './ui'
import { useDiceRoller, parseDiceExpression, type RollResult } from '../hooks/useDiceRoller'

const QUICK_DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']
const QUICK_EXPR = ['1d20', '2d6', '1d8+3', '4d6', '1d20+5']

interface Props {
  open: boolean
  onClose: () => void
  rolledBy?: string
}

export const DiceRollerModal: React.FC<Props> = ({ open, onClose, rolledBy = 'Mestre' }) => {
  const { roll, history } = useDiceRoller()
  const [expr, setExpr] = useState('1d20')
  const [isPublic, setIsPublic] = useState(true)
  const [lastResult, setLastResult] = useState<RollResult | null>(null)

  const doRoll = () => {
    const result = roll(expr, rolledBy, isPublic)
    if (result) setLastResult(result)
  }

  const quickRoll = (expression: string) => {
    setExpr(expression)
    const result = roll(expression, rolledBy, isPublic)
    if (result) setLastResult(result)
  }

  const valid = !!parseDiceExpression(expr)

  return (
    <Modal open={open} onClose={onClose} title="Rolar dados" width={460}>
      {/* Resultado atual */}
      {lastResult && (
        <div style={{
          background: 'linear-gradient(135deg, #2e2818, var(--bg-card))',
          border: '1px solid var(--gold-dim)',
          borderRadius: 12,
          padding: '18px 20px',
          textAlign: 'center',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>
            {lastResult.rolledBy} rolou {lastResult.expression}
            {!lastResult.isPublic && ' 🔒 privado'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>
            {lastResult.total}
          </div>
          {lastResult.rolls.length > 1 && (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>
              [{lastResult.rolls.join(', ')}]{lastResult.modifier !== 0 && ` ${lastResult.modifier >= 0 ? '+' : ''}${lastResult.modifier}`}
            </div>
          )}
        </div>
      )}

      {/* Input de expressão */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={expr}
          onChange={e => setExpr(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && valid && doRoll()}
          placeholder="Ex: 2d6+3, 1d20, d8-1"
          style={{
            flex: 1, background: 'var(--bg-card)', border: `1px solid ${valid ? 'var(--line)' : 'var(--blood-dim)'}`,
            borderRadius: 8, color: 'var(--ink)', fontSize: 16,
            padding: '10px 14px', outline: 'none',
            fontFamily: 'var(--font-display)', letterSpacing: 1,
          }}
        />
        <Button onClick={doRoll} disabled={!valid} style={{ padding: '10px 20px' }}>⬡ Rolar</Button>
      </div>

      {/* Toggle público/privado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          onClick={() => setIsPublic(!isPublic)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            background: 'var(--bg-card)', border: `1px solid ${isPublic ? 'var(--gold-dim)' : 'var(--line)'}`,
            borderRadius: 8, padding: '8px 14px', fontSize: 13,
            color: isPublic ? 'var(--gold)' : 'var(--ink-faint)',
          }}
        >
          <span>{isPublic ? '👁 Todos veem' : '🔒 Só o mestre vê'}</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
          {isPublic ? 'Resultado aparece para todos na mesa' : 'Rolagem oculta — só você vê'}
        </span>
      </div>

      {/* Dados rápidos */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>Dados rápidos</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {QUICK_DICE.map(d => (
            <button key={d} onClick={() => quickRoll(`1${d}`)} style={{
              background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)',
              fontFamily: 'var(--font-display)', fontSize: 13, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
            >{d}</button>
          ))}
        </div>
      </div>

      {/* Expressões comuns */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>Expressões comuns</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {QUICK_EXPR.map(e => (
            <button key={e} onClick={() => { setExpr(e) }} style={{
              background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink-dim)',
              fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
            }}
              onMouseEnter={el => (el.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={el => (el.currentTarget.style.color = 'var(--ink-dim)')}
            >{e}</button>
          ))}
        </div>
      </div>

      {/* Histórico */}
      {history.length > 0 && (
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>Histórico</div>
          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-card)', border: '1px solid var(--line)',
                borderRadius: 8, padding: '8px 12px', fontSize: 13,
              }}>
                <span style={{ color: 'var(--ink-faint)' }}>
                  {r.rolledBy} · {r.expression} {!r.isPublic && '🔒'}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--gold)', fontSize: 15 }}>
                  {r.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
