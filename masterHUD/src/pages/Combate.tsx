import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { Button, Avatar, HpBar, Modal, Toast } from '../components/ui'
import { DiceRollerModal } from '../components/DiceRollerModal'
import { getMesa, getPersonagens, updatePersonagem } from '../db'
import type { Personagem } from '../types'

interface Participante { personagem: Personagem; iniciativa: number }

export const Combate: React.FC = () => {
  const { id: mesaIdStr } = useParams<{ id: string }>()
  const mesaId = Number(mesaIdStr)
  const navigate = useNavigate()
  const location = useLocation()
  const filaPids: number[] = (location.state as { fila?: number[] })?.fila || []

  const [mesaNome, setMesaNome] = useState('')
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [turnoAtual, setTurnoAtual] = useState(0)
  const [rodada, setRodada] = useState(1)
  const [selecionado, setSelecionado] = useState<Participante | null>(null)
  const [hpDelta, setHpDelta] = useState(0)
  const [xpModal, setXpModal] = useState(false)
  const [xpValues, setXpValues] = useState<Record<number, number>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [diceModal, setDiceModal] = useState(false)
  const [fichaModal, setFichaModal] = useState(false)

  const load = useCallback(async () => {
    const [m, todos] = await Promise.all([getMesa(mesaId), getPersonagens(mesaId)])
    if (m) setMesaNome(m.nome)
    const filtrados = filaPids.length > 0
      ? todos.filter(p => filaPids.includes(p.id!))
      : todos
    const comIniciativa = filtrados.map(p => ({
      personagem: p,
      iniciativa: Math.floor(Math.random() * 20) + 1,
    })).sort((a, b) => b.iniciativa - a.iniciativa)
    setParticipantes(comIniciativa)
    if (comIniciativa.length > 0) setSelecionado(comIniciativa[0])
  }, [mesaId]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  const avancarTurno = () => {
    const prox = (turnoAtual + 1) % participantes.length
    setTurnoAtual(prox)
    setSelecionado(participantes[prox])
    if (prox === 0) setRodada(r => r + 1)
  }

  const aplicarDano = async () => {
    if (!selecionado || hpDelta === 0) return
    const novoHp = Math.max(0, selecionado.personagem.hpAtual - hpDelta)
    await updatePersonagem(selecionado.personagem.id!, { hpAtual: novoHp, status: novoHp === 0 ? 'inconsciente' : 'vivo' })
    const updated = { ...selecionado, personagem: { ...selecionado.personagem, hpAtual: novoHp } }
    setParticipantes(prev => prev.map(p => p.personagem.id === selecionado.personagem.id ? updated : p))
    setSelecionado(updated)
    setHpDelta(0)
    showToast(`-${hpDelta} HP em ${selecionado.personagem.nome}`)
  }

  const aplicarCura = async () => {
    if (!selecionado || hpDelta === 0) return
    const novoHp = Math.min(selecionado.personagem.hpMaximo, selecionado.personagem.hpAtual + hpDelta)
    await updatePersonagem(selecionado.personagem.id!, { hpAtual: novoHp, status: 'vivo' })
    const updated = { ...selecionado, personagem: { ...selecionado.personagem, hpAtual: novoHp } }
    setParticipantes(prev => prev.map(p => p.personagem.id === selecionado.personagem.id ? updated : p))
    setSelecionado(updated)
    setHpDelta(0)
    showToast(`+${hpDelta} HP em ${selecionado.personagem.nome}`)
  }

  const distribuirXp = async () => {
    await Promise.all(
      Object.entries(xpValues).map(async ([pid, xp]) => {
        if (!xp) return
        const p = participantes.find(pt => pt.personagem.id === Number(pid))?.personagem
        if (!p) return
        const novoXp = p.xp + xp
        await updatePersonagem(Number(pid), { xp: novoXp })
      })
    )
    showToast('XP distribuído!')
    setXpModal(false)
    navigate(`/mesa/${mesaId}`)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const jogadores = participantes.filter(p => p.personagem.tipo === 'jogador')

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 90 }}>
      <Topbar
        crumbs={[
          { label: 'Início', to: '/' },
          { label: mesaNome, to: `/mesa/${mesaId}` },
          { label: 'Combate' },
        ]}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
              Rodada <strong style={{ color: 'var(--gold)' }}>{rodada}</strong> · Turno {turnoAtual + 1} de {participantes.length}
            </span>
            <Button variant="danger-outline" size="sm" onClick={() => setXpModal(true)}>Encerrar combate</Button>
          </div>
        }
      />

      {/* Trilha de iniciativa */}
      <div style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--line)', padding: '18px 32px' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 12 }}>
          Ordem de iniciativa
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, alignItems: 'center' }}>
          {participantes.map((p, idx) => {
            const ativo = idx === turnoAtual
            const feito = idx < turnoAtual
            return (
              <div key={p.personagem.id}
                onClick={() => setSelecionado(p)}
                style={{
                  flexShrink: 0, width: 90, padding: '10px 8px 12px', textAlign: 'center',
                  background: ativo ? 'linear-gradient(180deg,#3a3320,var(--bg-card))' : 'var(--bg-card)',
                  border: `1px solid ${ativo ? 'var(--gold)' : 'var(--line)'}`,
                  borderRadius: 10, cursor: 'pointer', opacity: feito ? 0.35 : ativo ? 1 : 0.65,
                  transform: ativo ? 'translateY(-4px) scale(1.06)' : 'none',
                  boxShadow: ativo ? '0 0 0 1px var(--gold-dim), 0 8px 20px rgba(232,163,61,0.2)' : 'none',
                  position: 'relative',
                }}
              >
                {ativo && (
                  <div style={{
                    position: 'absolute', top: -7, right: -7, width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--gold)', color: 'var(--bg-deep)',
                    fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                    display: 'grid', placeItems: 'center',
                    boxShadow: '0 0 0 3px var(--bg-panel)',
                  }}>{p.iniciativa}</div>
                )}
                <Avatar nome={p.personagem.nome} size={50} style={{ margin: '0 auto 6px' } as React.CSSProperties} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.personagem.nome}
                </div>
                <div style={{ fontSize: 10.5, color: p.personagem.hpAtual / p.personagem.hpMaximo < 0.3 ? 'var(--blood)' : 'var(--ink-faint)', marginTop: 2 }}>
                  {p.personagem.hpAtual}/{p.personagem.hpMaximo}
                </div>
              </div>
            )
          })}
          <button
            onClick={avancarTurno}
            style={{
              flexShrink: 0, height: 78, padding: '0 16px',
              background: 'none', border: '1px dashed var(--ink-faint)',
              color: 'var(--ink-dim)', fontFamily: 'var(--font-display)', fontSize: 12,
              borderRadius: 8, cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--gold)'); (e.currentTarget.style.color = 'var(--gold)') }}
            onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--ink-faint)'); (e.currentTarget.style.color = 'var(--ink-dim)') }}
          >
            Avançar<br />turno →
          </button>
        </div>
      </div>

      {/* Painel principal */}
      {selecionado && (
        <div style={{ maxWidth: 1100, margin: '20px auto', padding: '0 32px', display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: 18 }}>

          {/* Personagem ativo */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14 }}>Personagem ativo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Avatar nome={selecionado.personagem.nome} size={56} border="2px solid var(--gold)" />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{selecionado.personagem.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-dim)' }}>{selecionado.personagem.raca} · {selecionado.personagem.classe} · Nv. {selecionado.personagem.nivel}</div>
              </div>
            </div>

            <HpBar atual={selecionado.personagem.hpAtual} maximo={selecionado.personagem.hpMaximo} />

            <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'flex-end' }}>
              <input
                type="number" value={hpDelta}
                onChange={e => setHpDelta(Number(e.target.value))}
                style={{
                  width: 56, background: 'var(--bg-card)', border: '1px solid var(--line)',
                  borderRadius: 7, color: 'var(--ink)', textAlign: 'center',
                  fontFamily: 'var(--font-display)', fontSize: 15, padding: '8px 4px', outline: 'none',
                }}
              />
              <Button onClick={aplicarCura} variant="secondary" size="sm" style={{ flex: 1, borderColor: 'var(--moss)', color: 'var(--moss)' }}>Curar</Button>
              <Button onClick={aplicarDano} size="sm" style={{ flex: 1, background: 'rgba(193,62,62,0.15)', color: 'var(--blood)', border: '1px solid var(--blood)' }}>Dano</Button>
            </div>
          </div>

          {/* Ataques */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14 }}>Ações de combate</div>
            {selecionado.personagem.ataques.length === 0 ? (
              <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>
                Nenhum ataque cadastrado na ficha.
              </div>
            ) : (
              selecionado.personagem.ataques.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 9, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.nome}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{a.dados} {a.tipoDano}</div>
                  </div>
                  <Button size="sm" style={{ fontSize: 12 }}>Rolar</Button>
                </div>
              ))
            )}
          </div>

          {/* Testes */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14 }}>Testes</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {['Acrobacia', 'Percepção', 'Perspicácia', 'Sobrevivência', 'Intimidação', 'Atletismo'].map(t => (
                <button key={t} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--line)',
                  color: 'var(--ink)', fontSize: 12.5, padding: '9px 8px', borderRadius: 7,
                  textAlign: 'left', cursor: 'pointer',
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal encerrar combate / distribuir XP */}
      <Modal open={xpModal} onClose={() => setXpModal(false)} title="Encerrar combate e distribuir XP" width={480}>
        <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 16 }}>
          Defina quanto XP cada jogador ganhou. NPCs não recebem XP.
        </div>

        {/* Aplicar a todos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px dashed var(--line)', borderRadius: 9, padding: '10px 12px', marginBottom: 16 }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-dim)', flexShrink: 0 }}>Aplicar a todos:</span>
          <input
            type="number" placeholder="50" id="bulk-xp"
            style={{ width: 70, background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--gold)', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, padding: 6, outline: 'none' }}
          />
          <Button size="sm" variant="secondary" onClick={() => {
            const val = Number((document.getElementById('bulk-xp') as HTMLInputElement).value)
            const newXp: Record<number, number> = {}
            jogadores.forEach(p => { if (p.personagem.id) newXp[p.personagem.id] = val })
            setXpValues(newXp)
          }}>Aplicar</Button>
        </div>

        {jogadores.map(p => (
          <div key={p.personagem.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <Avatar nome={p.personagem.nome} size={38} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.personagem.nome}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Nível {p.personagem.nivel} · {p.personagem.xp} XP</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <input
                type="number"
                value={xpValues[p.personagem.id!] ?? 0}
                onChange={e => setXpValues(prev => ({ ...prev, [p.personagem.id!]: Number(e.target.value) }))}
                style={{ width: 70, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 7, color: 'var(--ink)', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 14, padding: '8px 4px', outline: 'none' }}
              />
              <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>XP</span>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="ghost" onClick={() => { setXpModal(false); navigate(`/mesa/${mesaId}`) }}>
            Encerrar sem XP
          </Button>
          <Button onClick={distribuirXp}>Confirmar e encerrar</Button>
        </div>
      </Modal>

      {toast && <Toast message={toast} visible={!!toast} />}

      {/* Footer de atalhos */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 6,
        background: 'var(--bg-panel)', border: '1px solid var(--line)',
        borderRadius: 16, padding: 8,
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: 30,
      }}>
        {[
          { icon: '💬', label: 'Chat', action: () => {} },
          { icon: '✎', label: 'Ficha', action: () => setFichaModal(true) },
          { icon: '⬡', label: 'Dados', action: () => setDiceModal(true), primary: true },
        ].map(btn => (
          <div key={btn.label}
            title={btn.label}
            onClick={btn.action}
            style={{
              width: 52, height: 52, display: 'grid', placeItems: 'center',
              borderRadius: 11, cursor: 'pointer', fontSize: 18,
              background: btn.primary ? 'var(--gold)' : 'none',
              color: btn.primary ? 'var(--bg-deep)' : 'var(--ink-dim)',
            }}
          >{btn.icon}</div>
        ))}
      </div>

      {/* Modal de ficha rápida */}
      <Modal open={fichaModal} onClose={() => setFichaModal(false)} title="Fichas dos personagens" width={500}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {participantes.filter(p => p.personagem.tipo === 'jogador').map(p => (
            <div key={p.personagem.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 9, padding: '12px 14px' }}>
              <Avatar nome={p.personagem.nome} src={p.personagem.imagemUrl} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.personagem.nome}</div>
                <HpBar atual={p.personagem.hpAtual} maximo={p.personagem.hpMaximo} />
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/mesa/${mesaId}/personagem/${p.personagem.id}/editar`)}>
                Editar
              </Button>
            </div>
          ))}
        </div>
      </Modal>

      <DiceRollerModal open={diceModal} onClose={() => setDiceModal(false)} />
    </div>
  )
}
