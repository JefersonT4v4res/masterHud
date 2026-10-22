import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { Button, Badge, Panel, PanelTitle, Avatar, Modal, Toast } from '../components/ui'
import { DiceRollerModal } from '../components/DiceRollerModal'
import { getMesa, getPersonagens, updateMesa, deletePersonagem, deleteMesa } from '../db'
import type { Mesa, Personagem } from '../types'

export const Gerenciador: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const mesaId = Number(id)
  const navigate = useNavigate()

  const [mesa, setMesa]             = useState<Mesa | null>(null)
  const [personagens, setPersonagens] = useState<Personagem[]>([])
  const [combateFila, setCombateFila] = useState<number[]>([])
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [toast, setToast]           = useState<string | null>(null)
  const [diceModal, setDiceModal]   = useState(false)

  const load = useCallback(async () => {
    const [m, ps] = await Promise.all([getMesa(mesaId), getPersonagens(mesaId)])
    if (m) setMesa(m)
    setPersonagens(ps)
  }, [mesaId])

  useEffect(() => { load() }, [load])

  const jogadores = personagens.filter(p => p.tipo === 'jogador')
  const npcs      = personagens.filter(p => p.tipo !== 'jogador')

  const toggleFila = (pid: number) =>
    setCombateFila(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid])

  const handleDelete = async () => {
    if (deleteConfirm !== mesa?.nome) return
    await deleteMesa(mesaId)
    navigate('/jogos')
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
            <Button size="sm" onClick={() => navigate(`/mesa/${mesaId}/combate`)} disabled={combateFila.length === 0}>
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
              + Convidar jogador
            </Button>
          </div>

          {jogadores.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-faint)', fontSize: 13 }}>
              Nenhum jogador adicionado. Crie o primeiro personagem jogável.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {jogadores.map(p => (
                <PersonagemCard
                  key={p.id} personagem={p}
                  inFila={combateFila.includes(p.id!)}
                  onToggleFila={() => toggleFila(p.id!)}
                  onVer={() => navigate(`/mesa/${mesaId}/personagem/${p.id}`)}
                  onEditar={() => navigate(`/mesa/${mesaId}/personagem/${p.id}/editar`)}
                  onDeletar={async () => { await deletePersonagem(p.id!); load(); showToast('Personagem removido.') }}
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
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-faint)', fontSize: 13 }}>
              Nenhum NPC criado ainda.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {npcs.map(p => (
                <PersonagemCard
                  key={p.id} personagem={p}
                  inFila={combateFila.includes(p.id!)}
                  onToggleFila={() => toggleFila(p.id!)}
                  onVer={() => navigate(`/mesa/${mesaId}/personagem/${p.id}`)}
                  onEditar={() => navigate(`/mesa/${mesaId}/personagem/${p.id}/editar`)}
                  onDeletar={async () => { await deletePersonagem(p.id!); load(); showToast('NPC removido.') }}
                />
              ))}
            </div>
          )}
        </Panel>

        {/* Gerenciador de combate */}
        <Panel style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <PanelTitle>Gerenciador de combate</PanelTitle>
          </div>
          {combateFila.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-faint)', fontSize: 13 }}>
              Selecione personagens acima (clique no card) para adicionar ao combate.
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18 }}>
                <Button variant="ghost" size="sm">Limpar fila</Button>
                <Button variant="secondary" size="sm" disabled>Iniciar combate</Button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                {combateFila.map(pid => {
                  const p = personagens.find(x => x.id === pid)
                  if (!p) return null
                  return (
                    <div key={pid} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'var(--bg-card)', border: '1px solid var(--gold-dim)',
                      borderRadius: 8, padding: '6px 12px',
                    }}>
                      <Avatar nome={p.nome} size={24} />
                      <span style={{ fontSize: 13 }}>{p.nome}</span>
                      <span style={{ color: 'var(--ink-faint)', cursor: 'pointer' }} onClick={() => toggleFila(pid)}>✕</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="sm" onClick={() => setCombateFila([])}>Limpar</Button>
                <Button size="sm" onClick={() => navigate(`/mesa/${mesaId}/combate`, { state: { fila: combateFila } })}>
                  Iniciar combate ({combateFila.length})
                </Button>
              </div>
            </div>
          )}
        </Panel>

        {/* Zona de risco */}
        <Panel danger>
          <PanelTitle danger>Zona de risco</PanelTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
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
          </div>
        </Panel>
      </div>

      {/* Modal de exclusão */}
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
          value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
          placeholder={`Digite "${mesa.nome}"`}
          style={{
            width: '100%', background: 'var(--bg-card)', border: '1px solid var(--line)',
            borderRadius: 8, color: 'var(--ink)', fontSize: 14, padding: '10px 12px',
            marginBottom: 20, outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => { setDeleteModal(false); setDeleteConfirm('') }}>Cancelar</Button>
          <Button variant="danger" disabled={deleteConfirm !== mesa.nome} onClick={handleDelete}>
            Excluir permanentemente
          </Button>
        </div>
      </Modal>

      {toast && <Toast message={toast} visible={!!toast} />}
      <DiceRollerModal open={diceModal} onClose={() => setDiceModal(false)} />
    </div>
  )
}

// Sub-componentes locais
const PersonagemCard: React.FC<{
  personagem: Personagem
  inFila: boolean
  onToggleFila: () => void
  onVer: () => void
  onEditar: () => void
  onDeletar: () => void
}> = ({ personagem: p, inFila, onToggleFila, onVer, onEditar, onDeletar }) => (
  <div
    onClick={onToggleFila}
    style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      background: 'var(--bg-card)',
      border: `1px solid ${inFila ? 'var(--gold)' : 'var(--line)'}`,
      borderRadius: 11, padding: 14, cursor: 'pointer',
      boxShadow: inFila ? '0 0 0 1px var(--gold-dim)' : 'none',
    }}
  >
    <Avatar nome={p.nome} size={44} border={inFila ? '2px solid var(--gold)' : undefined} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{p.nome}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 8 }}>
        Nv. {p.nivel} · {p.raca} · {p.classe}
      </div>
      <div style={{ display: 'flex', gap: 10, fontSize: 12 }} onClick={e => e.stopPropagation()}>
        <span style={{ color: 'var(--ink-dim)', cursor: 'pointer' }} onClick={onVer}>Ver</span>
        <span style={{ color: 'var(--ink-dim)', cursor: 'pointer' }} onClick={onEditar}>Editar</span>
        <span style={{ color: 'var(--ink-faint)', cursor: 'pointer' }} onClick={onDeletar}>Remover</span>
      </div>
    </div>
  </div>
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
