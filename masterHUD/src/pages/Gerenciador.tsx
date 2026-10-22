import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { Button, Badge, Panel, PanelTitle, Avatar, Modal, Toast } from '../components/ui'
import { DiceRollerModal } from '../components/DiceRollerModal'
import { getMesa, getPersonagens, updateMesa, deletePersonagem, deleteMesa } from '../db'
import { rollDice } from '../hooks/useDiceRoller'
import type { Mesa, Personagem } from '../types'

interface FilaItem { personagemId: string; iniciativa: number | null }

export const Gerenciador: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const mesaId = id!
  const navigate = useNavigate()

  const [mesa, setMesa]               = useState<Mesa | null>(null)
  const [personagens, setPersonagens]   = useState<Personagem[]>([])
  const [combateFila, setCombateFila]   = useState<FilaItem[]>([])
  const [deleteModal, setDeleteModal]   = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [removeTarget, setRemoveTarget] = useState<Personagem | null>(null)
  const [toast, setToast]             = useState<string | null>(null)
  const [diceModal, setDiceModal]     = useState(false)

  const load = useCallback(async () => {
    const [m, ps] = await Promise.all([getMesa(mesaId), getPersonagens(mesaId)])
    if (m) setMesa(m)
    setPersonagens(ps)
  }, [mesaId])

  useEffect(() => { load() }, [load])

  const jogadores = personagens.filter(p => p.tipo === 'jogador')
  const npcs      = personagens.filter(p => p.tipo !== 'jogador')

  // Adiciona/remove da fila de combate
  const toggleFila = (pid: string) => {
    setCombateFila(prev =>
      prev.find(f => f.personagemId === pid)
        ? prev.filter(f => f.personagemId !== pid)
        : [...prev, { personagemId: pid, iniciativa: null }]
    )
  }

  // Rola iniciativa 1d20 para um personagem na fila e reordena
  const rolarIniciativa = (pid: string) => {
    const [rolled] = rollDice(1, 20)
    setCombateFila(prev => {
      const updated = prev.map(f =>
        f.personagemId === pid ? { ...f, iniciativa: rolled } : f
      )
      // Ordena: quem tem iniciativa fica no topo (maior primeiro), quem não tem fica no final
      return [...updated].sort((a, b) => {
        if (a.iniciativa === null) return 1
        if (b.iniciativa === null) return -1
        return b.iniciativa - a.iniciativa
      })
    })
    showToast(`${personagens.find(p => p.id === pid)?.nome}: iniciativa ${rolled}`)
  }

  // Rola iniciativa para todos de uma vez
  const rolarTodos = () => {
    setCombateFila(prev => {
      const updated = prev.map(f => ({ ...f, iniciativa: rollDice(1, 20)[0] }))
      return [...updated].sort((a, b) => (b.iniciativa ?? 0) - (a.iniciativa ?? 0))
    })
    showToast('Iniciativa rolada para todos!')
  }

  const handleDelete = async () => {
    await deleteMesa(mesaId)
    navigate('/jogos')
  }

  const handleRemovePersonagem = async () => {
    if (!removeTarget?.id) return
    await deletePersonagem(mesaId, removeTarget.id)
    setRemoveTarget(null)
    load()
    showToast('Personagem removido.')
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const togglePause = async () => {
    if (!mesa) return
    const next: Mesa['status'] = mesa.status === 'ativa' ? 'pausada' : 'ativa'
    await updateMesa(mesaId, { status: next })
    setMesa({ ...mesa, status: next })
    showToast(next === 'pausada' ? 'Mesa pausada.' : 'Mesa reativada!')
  }

  const statusColor: Record<Mesa['status'], 'moss' | 'neutral' | 'blood'> = {
    ativa: 'moss', pausada: 'neutral', encerrada: 'blood',
  }
  const statusLabel: Record<Mesa['status'], string> = {
    ativa: '● Ativa', pausada: '⏸ Pausada', encerrada: '✕ Encerrada',
  }

  const todosRolaram = combateFila.length > 0 && combateFila.every(f => f.iniciativa !== null)

  if (!mesa) return null

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>
      <Topbar
        crumbs={[
          { label: 'Início', to: '/' },
          { label: 'Jogos', to: '/jogos' },
          { label: mesa.nome, to: `/mesa/${mesaId}` },
          { label: 'Gerenciador' },
        ]}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge color={statusColor[mesa.status]}>{statusLabel[mesa.status]}</Badge>
            <Button size="sm" variant="secondary" onClick={() => setDiceModal(true)}>⬡ Rolar dados</Button>
            <Button
              size="sm"
              onClick={() => navigate(`/mesa/${mesaId}/combate`, { state: { fila: combateFila } })}
              disabled={combateFila.length === 0}
            >
              Iniciar combate {combateFila.length > 0 && `(${combateFila.length})`}
            </Button>
          </div>
        }
      />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '26px 32px' }}>

        {/* Jogadores */}
        <Panel style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PanelTitle>Jogadores</PanelTitle>
              <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{jogadores.length} de 10</span>
            </div>
            <Button size="sm" onClick={() => navigate(`/mesa/${mesaId}/personagem/novo?tipo=jogador`)}>
              + Adicionar jogador
            </Button>
          </div>
          {jogadores.length === 0 ? (
            <EmptyState label="Nenhum jogador. Crie o primeiro personagem jogável." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {jogadores.map(p => (
                <PersonagemCard
                  key={p.id}
                  personagem={p}
                  inFila={!!combateFila.find(f => f.personagemId === p.id!)}
                  onToggleFila={() => toggleFila(p.id!)}
                  onVer={() => navigate(`/mesa/${mesaId}/personagem/${p.id}`)}
                  onEditar={() => navigate(`/mesa/${mesaId}/personagem/${p.id}/editar`)}
                  onRemover={() => setRemoveTarget(p)}
                />
              ))}
            </div>
          )}
        </Panel>

        {/* NPCs */}
        <Panel style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PanelTitle>NPCs &amp; monstros</PanelTitle>
              <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{npcs.length} nesta mesa</span>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/mesa/${mesaId}/personagem/novo?tipo=npc`)}>
              + Criar NPC
            </Button>
          </div>
          {npcs.length === 0 ? (
            <EmptyState label="Nenhum NPC criado ainda." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {npcs.map(p => (
                <PersonagemCard
                  key={p.id}
                  personagem={p}
                  inFila={!!combateFila.find(f => f.personagemId === p.id!)}
                  onToggleFila={() => toggleFila(p.id!)}
                  onVer={() => navigate(`/mesa/${mesaId}/personagem/${p.id}`)}
                  onEditar={() => navigate(`/mesa/${mesaId}/personagem/${p.id}/editar`)}
                  onRemover={() => setRemoveTarget(p)}
                />
              ))}
            </div>
          )}
        </Panel>

        {/* Gerenciador de combate com iniciativa inline */}
        <Panel style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <PanelTitle>Gerenciador de combate</PanelTitle>
            {combateFila.length > 0 && (
              <Button size="sm" variant="secondary" onClick={rolarTodos}>
                🎲 Rolar iniciativa de todos
              </Button>
            )}
          </div>

          {combateFila.length === 0 ? (
            <EmptyState label="Clique nos personagens acima para adicioná-los à fila de combate." />
          ) : (
            <>
              {/* Lista ordenada por iniciativa */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {combateFila.map((item, idx) => {
                  const p = personagens.find(x => x.id === item.personagemId)
                  if (!p) return null
                  return (
                    <div key={item.personagemId} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'var(--bg-card)', border: `1px solid ${item.iniciativa !== null ? 'var(--gold-dim)' : 'var(--line)'}`,
                      borderRadius: 10, padding: '10px 14px',
                    }}>
                      {/* Posição */}
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: item.iniciativa !== null ? 'var(--gold-dim)' : 'var(--bg-panel)',
                        display: 'grid', placeItems: 'center',
                        fontFamily: 'var(--font-display)', fontWeight: 700,
                        color: item.iniciativa !== null ? 'var(--bg-deep)' : 'var(--ink-faint)',
                        fontSize: 13,
                      }}>
                        {item.iniciativa !== null ? `${idx + 1}°` : '–'}
                      </div>

                      <Avatar nome={p.nome} src={p.imagemUrl} size={36} />

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nome}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Nv. {p.nivel} · {p.classe}</div>
                      </div>

                      {/* Valor da iniciativa ou botão de rolar */}
                      {item.iniciativa !== null ? (
                        <div style={{ textAlign: 'center', marginRight: 8 }}>
                          <div style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Iniciativa</div>
                          <div style={{
                            fontFamily: 'var(--font-display)', fontWeight: 700,
                            fontSize: 22, color: 'var(--gold)', lineHeight: 1,
                          }}>{item.iniciativa}</div>
                          <button
                            onClick={() => rolarIniciativa(item.personagemId)}
                            style={{ fontSize: 10, color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}
                          >rerolar</button>
                        </div>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => rolarIniciativa(item.personagemId)}>
                          🎲 Rolar iniciativa
                        </Button>
                      )}

                      {/* Remover da fila */}
                      <button
                        onClick={() => toggleFila(item.personagemId)}
                        style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 6px' }}
                        title="Remover da fila"
                      >✕</button>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="sm" onClick={() => setCombateFila([])}>Limpar fila</Button>
                <Button
                  size="sm"
                  disabled={!todosRolaram}
                  onClick={() => navigate(`/mesa/${mesaId}/combate`, { state: { fila: combateFila } })}
                  title={!todosRolaram ? 'Role a iniciativa de todos antes de iniciar' : ''}
                >
                  {todosRolaram ? 'Iniciar combate →' : 'Role a iniciativa para continuar'}
                </Button>
              </div>
            </>
          )}
        </Panel>

        {/* Zona de risco */}
        <Panel danger>
          <PanelTitle danger>Zona de risco</PanelTitle>
          <ZoneRow
            label="Pausar mesa"
            desc="Oculta a mesa dos jogadores até reativá-la. Nada é perdido."
            action={<Button variant="ghost" size="sm" onClick={togglePause}>
              {mesa.status === 'pausada' ? 'Reativar mesa' : 'Pausar mesa'}
            </Button>}
          />
          <ZoneRow
            label="Excluir mesa"
            desc="Remove permanentemente a mesa, fichas e histórico. Não pode ser desfeito."
            action={<Button variant="danger-outline" size="sm" onClick={() => setDeleteModal(true)}>Excluir mesa</Button>}
          />
        </Panel>
      </div>

      {/* Modal de exclusão de mesa */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title={`Excluir "${mesa.nome}"?`}>
        <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 14 }}>
          Essa ação é <strong>permanente</strong>. Todos os personagens, NPCs e histórico serão excluídos.
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 9, padding: '12px 14px', marginBottom: 16 }}>
          {['Todas as fichas e NPCs serão apagados', 'O histórico de combates será perdido'].map(c => (
            <div key={c} style={{ fontSize: 12.5, color: 'var(--ink-faint)', padding: '4px 0', display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--blood)' }}>–</span> {c}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', marginBottom: 8 }}>
          Digite <strong style={{ color: 'var(--ink)' }}>{mesa.nome}</strong> para confirmar:
        </div>
        <input
          value={deleteConfirm}
          onChange={e => setDeleteConfirm(e.target.value)}
          placeholder={`Digite "${mesa.nome}"`}
          style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, padding: '10px 12px', marginBottom: 20, outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => { setDeleteModal(false); setDeleteConfirm('') }}>Cancelar</Button>
          <Button variant="danger" disabled={deleteConfirm !== mesa.nome} onClick={handleDelete}>
            Excluir permanentemente
          </Button>
        </div>
      </Modal>

      {/* Modal de confirmação de remoção de personagem */}
      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remover personagem?">
        <div style={{ fontSize: 13.5, color: 'var(--ink-dim)', marginBottom: 20 }}>
          Você está removendo <strong style={{ color: 'var(--ink)' }}>{removeTarget?.nome}</strong> desta mesa.
          A ficha será excluída permanentemente.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setRemoveTarget(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleRemovePersonagem}>Remover</Button>
        </div>
      </Modal>

      {toast && <Toast message={toast} visible={!!toast} />}
      <DiceRollerModal open={diceModal} onClose={() => setDiceModal(false)} />
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────
const PersonagemCard: React.FC<{
  personagem: Personagem
  inFila: boolean
  onToggleFila: () => void
  onVer: () => void
  onEditar: () => void
  onRemover: () => void
}> = ({ personagem: p, inFila, onToggleFila, onVer, onEditar, onRemover }) => (
  <div
    onClick={onToggleFila}
    style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      background: 'var(--bg-card)',
      border: `1px solid ${inFila ? 'var(--gold)' : 'var(--line)'}`,
      borderRadius: 11, padding: 14, cursor: 'pointer',
      boxShadow: inFila ? '0 0 0 1px var(--gold-dim)' : 'none',
      transition: 'border-color 0.15s',
    }}
  >
    <Avatar nome={p.nome} src={p.imagemUrl} size={44} border={inFila ? '2px solid var(--gold)' : undefined} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{p.nome}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 8 }}>
        Nv. {p.nivel} · {p.raca} · {p.classe}
      </div>
      <div style={{ display: 'flex', gap: 10, fontSize: 12 }} onClick={e => e.stopPropagation()}>
        <span style={{ color: 'var(--ink-dim)', cursor: 'pointer' }} onClick={onVer}>Ver</span>
        <span style={{ color: 'var(--ink-dim)', cursor: 'pointer' }} onClick={onEditar}>Editar</span>
        <span style={{ color: 'var(--ink-faint)', cursor: 'pointer' }} onClick={onRemover}>Remover</span>
      </div>
    </div>
  </div>
)

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ink-faint)', fontSize: 13 }}>{label}</div>
)

const ZoneRow: React.FC<{ label: string; desc: string; action: React.ReactNode }> = ({ label, desc, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
    <div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{desc}</div>
    </div>
    {action}
  </div>
)
