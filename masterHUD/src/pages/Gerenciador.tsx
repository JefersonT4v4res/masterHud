import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { Button, Badge, Panel, PanelTitle, Avatar, HpBar, Modal, Toast, Input, Textarea, Select } from '../components/ui'
import { DiceRollerModal } from '../components/DiceRollerModal'
import {
  getMesa, getPersonagens, getResumoJogadores, getMinhaFicha,
  getOrCreateConvite, removerMembro, refreshResumoJogadores, updateMesa, deletePersonagem, deleteMesa,
  desvincularPersonagem, getMembrosInfo, reatribuirPersonagem, ACESSO_REVOGADO_KEY,
  getSlotsLivres, claimPersonagem,
} from '../db'
import { rollDice } from '../hooks/useDiceRoller'
import { auth } from '../firebase'
import type { Mesa, Personagem, ResumoJogador, SystemType } from '../types'
import { resizeImageToBase64 } from '../utils/imagem'

const sistemaLabel: Record<SystemType, string> = {
  dnd5e: 'D&D 5ª Edição', tormenta20: 'Tormenta20', custom: 'Sistema customizado',
}

interface FilaItem { personagemId: string; iniciativa: number | null }

export const Gerenciador: React.FC = () => {
  const { donoUid: dUid, id } = useParams<{ donoUid: string; id: string }>()
  const donoUid = dUid!
  const mesaId = id!
  const souDono = donoUid === auth.currentUser!.uid

  return souDono
    ? <GerenciadorDono donoUid={donoUid} mesaId={mesaId} />
    : <GerenciadorJogador donoUid={donoUid} mesaId={mesaId} />
}

// ── Visão do mestre (igual a sempre + compartilhamento) ────────────────
const GerenciadorDono: React.FC<{ donoUid: string; mesaId: string }> = ({ donoUid, mesaId }) => {
  const navigate = useNavigate()

  const [mesa, setMesa]               = useState<Mesa | null>(null)
  const [personagens, setPersonagens]   = useState<Personagem[]>([])
  const [combateFila, setCombateFila]   = useState<FilaItem[]>([])
  const [deleteModal, setDeleteModal]   = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [removeTarget, setRemoveTarget] = useState<Personagem | null>(null)
  const [toast, setToast]             = useState<string | null>(null)
  const [diceModal, setDiceModal]     = useState(false)
  const [codigo, setCodigo]           = useState<string | null>(null)
  const [gerandoCodigo, setGerandoCodigo] = useState(false)
  const [editandoMesa, setEditandoMesa] = useState(false)
  const [nomeEdit, setNomeEdit]       = useState('')
  const [descEdit, setDescEdit]       = useState('')
  const [imagemEdit, setImagemEdit]   = useState<string | undefined>(undefined)
  const [salvandoMesa, setSalvandoMesa] = useState(false)
  const imgMesaRef = useRef<HTMLInputElement>(null)
  const [membrosInfo, setMembrosInfo] = useState<{ uid: string; nome: string }[]>([])
  const [atribuirTarget, setAtribuirTarget] = useState<Personagem | null>(null)
  const [uidAtribuir, setUidAtribuir] = useState('')
  const [erroAtribuir, setErroAtribuir] = useState<string | null>(null)
  const [salvandoAtribuir, setSalvandoAtribuir] = useState(false)

  const load = useCallback(async () => {
    const [m, ps, mi] = await Promise.all([getMesa(donoUid, mesaId), getPersonagens(donoUid, mesaId), getMembrosInfo(donoUid, mesaId)])
    if (m) { setMesa(m); setCodigo(m.conviteCodigo || null) }
    setPersonagens(ps)
    setMembrosInfo(mi)
    try {
      await refreshResumoJogadores(donoUid, mesaId)
    } catch (err) {
      console.error('Falha ao recalcular o resumo do grupo:', err)
    }
  }, [donoUid, mesaId])

  useEffect(() => { load() }, [load])

  const jogadores = personagens.filter(p => p.tipo === 'jogador')
  const npcs      = personagens.filter(p => p.tipo !== 'jogador')

  const toggleFila = (pid: string) => {
    setCombateFila(prev =>
      prev.find(f => f.personagemId === pid)
        ? prev.filter(f => f.personagemId !== pid)
        : [...prev, { personagemId: pid, iniciativa: null }]
    )
  }

  const rolarIniciativa = (pid: string) => {
    const [rolled] = rollDice(1, 20)
    setCombateFila(prev => {
      const updated = prev.map(f => f.personagemId === pid ? { ...f, iniciativa: rolled } : f)
      return [...updated].sort((a, b) => {
        if (a.iniciativa === null) return 1
        if (b.iniciativa === null) return -1
        return b.iniciativa - a.iniciativa
      })
    })
    showToast(`${personagens.find(p => p.id === pid)?.nome}: iniciativa ${rolled}`)
  }

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
    await deletePersonagem(donoUid, mesaId, removeTarget.id)
    setRemoveTarget(null)
    load()
    showToast('Personagem removido.')
  }

  const handleDesvincular = async (p: Personagem) => {
    if (!p.id) return
    await desvincularPersonagem(donoUid, mesaId, p.id)
    load()
    showToast(`${p.nome} voltou a ser um slot livre.`)
  }

  const handleAbrirAtribuir = (p: Personagem) => {
    setAtribuirTarget(p)
    setUidAtribuir(p.jogadorUid || '')
    setErroAtribuir(null)
  }

  // membrosInfo é só um registro autodeclarado (nome pra exibir) que o mestre não
  // tem permissão de apagar quando remove alguém da mesa — por isso o filtro contra
  // `mesa.membros` (fonte real de quem ainda está na mesa) precisa acontecer aqui,
  // não só confiar na lista crua do Firestore.
  const membrosAtivos = membrosInfo.filter(m => mesa?.membros.includes(m.uid))

  const handleConfirmarAtribuir = async () => {
    if (!atribuirTarget?.id || !uidAtribuir) return
    const membro = membrosAtivos.find(m => m.uid === uidAtribuir)
    if (!membro) return
    setSalvandoAtribuir(true)
    setErroAtribuir(null)
    try {
      await reatribuirPersonagem(donoUid, mesaId, atribuirTarget.id, membro.uid, membro.nome)
      setAtribuirTarget(null)
      load()
      showToast(`${atribuirTarget.nome} agora é jogado por ${membro.nome}.`)
    } catch (err) {
      setErroAtribuir(err instanceof Error ? err.message : 'Não foi possível atribuir a ficha.')
    } finally {
      setSalvandoAtribuir(false)
    }
  }

  const handleRemoverMembro = async (uidJogador: string) => {
    await removerMembro(donoUid, mesaId, uidJogador)
    setMesa(prev => prev ? { ...prev, membros: prev.membros.filter(u => u !== uidJogador) } : prev)
    showToast('Jogador removido da mesa.')
  }

  const handleGerarCodigo = async () => {
    setGerandoCodigo(true)
    try {
      const c = await getOrCreateConvite(mesaId)
      setCodigo(c)
    } finally {
      setGerandoCodigo(false)
    }
  }

  const copiarCodigo = async () => {
    if (!codigo) return
    try {
      await navigator.clipboard.writeText(codigo)
      showToast('Código copiado!')
    } catch {
      showToast(`Código: ${codigo}`)
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleEditarMesa = () => {
    if (!mesa) return
    setNomeEdit(mesa.nome)
    setDescEdit(mesa.descricao)
    setImagemEdit(mesa.imagemUrl)
    setEditandoMesa(true)
  }

  const handleImagemMesaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setImagemEdit(await resizeImageToBase64(file))
    } catch (err) {
      console.error('Falha ao processar imagem da mesa:', err)
      showToast('Não foi possível usar essa imagem.')
    }
  }

  const handleSalvarMesa = async () => {
    if (!mesa || !nomeEdit.trim()) return
    setSalvandoMesa(true)
    try {
      const changes = { nome: nomeEdit.trim(), descricao: descEdit.trim(), imagemUrl: imagemEdit || '' }
      await updateMesa(donoUid, mesaId, changes)
      setMesa({ ...mesa, ...changes })
      setEditandoMesa(false)
      showToast('Mesa atualizada!')
    } finally {
      setSalvandoMesa(false)
    }
  }

  const togglePause = async () => {
    if (!mesa) return
    const next: Mesa['status'] = mesa.status === 'ativa' ? 'pausada' : 'ativa'
    await updateMesa(donoUid, mesaId, { status: next })
    setMesa({ ...mesa, status: next })
    showToast(next === 'pausada' ? 'Mesa pausada.' : 'Mesa reativada!')
  }

  const toggleEncerrada = async () => {
    if (!mesa) return
    const next: Mesa['status'] = mesa.status === 'encerrada' ? 'ativa' : 'encerrada'
    const encerradaEm = next === 'encerrada' ? new Date().toISOString() : null
    await updateMesa(donoUid, mesaId, { status: next, encerradaEm })
    setMesa({ ...mesa, status: next, encerradaEm })
    showToast(next === 'encerrada' ? 'Mesa encerrada.' : 'Mesa reaberta!')
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
          { label: mesa.nome, to: `/mesa/${donoUid}/${mesaId}` },
          { label: 'Gerenciador' },
        ]}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge color={statusColor[mesa.status]}>{statusLabel[mesa.status]}</Badge>
            <Button size="sm" variant="secondary" onClick={() => setDiceModal(true)}>⬡ Rolar dados</Button>
            <Button
              size="sm"
              onClick={() => navigate(`/mesa/${donoUid}/${mesaId}/combate`, { state: { fila: combateFila } })}
              disabled={combateFila.length === 0}
            >
              Iniciar combate {combateFila.length > 0 && `(${combateFila.length})`}
            </Button>
          </div>
        }
      />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '26px 32px' }}>

        {/* Informações da mesa */}
        <Panel style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <PanelTitle>Informações da mesa</PanelTitle>
            {!editandoMesa && (
              <Button size="sm" variant="secondary" onClick={handleEditarMesa}>Editar</Button>
            )}
          </div>
          {editandoMesa ? (
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div
                  onClick={() => imgMesaRef.current?.click()}
                  title="Trocar imagem"
                  style={{
                    width: 80, height: 80, borderRadius: 10, border: '2px dashed var(--gold-dim)',
                    cursor: 'pointer', overflow: 'hidden', display: 'grid', placeItems: 'center',
                    background: 'var(--bg-card)', marginBottom: 6,
                  }}
                >
                  {imagemEdit ? (
                    <img src={imagemEdit} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 22, color: 'var(--ink-faint)' }}>+</span>
                  )}
                </div>
                <input ref={imgMesaRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagemMesaUpload} />
                {imagemEdit && (
                  <button type="button" onClick={() => setImagemEdit(undefined)}
                    style={{ fontSize: 11, color: 'var(--blood)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Remover
                  </button>
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input label="Nome da mesa" value={nomeEdit} onChange={e => setNomeEdit(e.target.value)} maxLength={80} />
                <Textarea label="Descrição" value={descEdit} onChange={e => setDescEdit(e.target.value)} style={{ minHeight: 70 }} maxLength={2000} />
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                  Sistema ({sistemaLabel[mesa.sistema]}) não dá pra trocar depois de criada — mudaria os atributos que as fichas já existentes esperam.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Button variant="ghost" size="sm" onClick={() => setEditandoMesa(false)}>Cancelar</Button>
                  <Button size="sm" disabled={!nomeEdit.trim() || salvandoMesa} onClick={handleSalvarMesa}>
                    {salvandoMesa ? 'Salvando…' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {mesa.imagemUrl && (
                <img src={mesa.imagemUrl} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 6 }}>{mesa.descricao || 'Sem descrição.'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Sistema: {sistemaLabel[mesa.sistema]}</div>
              </div>
            </div>
          )}
        </Panel>

        {/* Compartilhar mesa */}
        <Panel style={{ marginBottom: 20 }}>
          <PanelTitle>Compartilhar mesa</PanelTitle>
          <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '4px 0 14px' }}>
            Qualquer pessoa com esse código pode entrar na mesa e escolher ou criar um personagem jogador.
          </div>
          {codigo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
                letterSpacing: 4, color: 'var(--gold)', background: 'var(--bg-card)',
                border: '1px solid var(--line)', borderRadius: 9, padding: '10px 20px',
              }}>{codigo}</div>
              <Button variant="secondary" size="sm" onClick={copiarCodigo}>Copiar</Button>
            </div>
          ) : (
            <Button onClick={handleGerarCodigo} disabled={gerandoCodigo}>
              {gerandoCodigo ? 'Gerando…' : 'Gerar código de convite'}
            </Button>
          )}
          {mesa.membros.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10 }}>
                Jogadores na mesa ({mesa.membros.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mesa.membros.map(membroUid => {
                  const ficha = jogadores.find(p => p.jogadorUid === membroUid)
                  const nomeConta = membrosInfo.find(m => m.uid === membroUid)?.nome || 'Jogador'
                  return (
                    <div key={membroUid} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <span style={{ flex: 1 }}>
                        <span style={{ color: 'var(--ink)' }}>{nomeConta}</span>
                        <span style={{ color: 'var(--ink-faint)' }}> — {ficha ? ficha.nome : 'ainda sem ficha'}</span>
                      </span>
                      <Button size="sm" variant="danger-outline" onClick={() => handleRemoverMembro(membroUid)}>Remover</Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Panel>

        {/* Jogadores */}
        <Panel style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PanelTitle>Jogadores</PanelTitle>
              <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{jogadores.length} de 10</span>
            </div>
            <Button size="sm" onClick={() => navigate(`/mesa/${donoUid}/${mesaId}/personagem/novo?tipo=jogador`)}>
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
                  onVer={() => navigate(`/mesa/${donoUid}/${mesaId}/personagem/${p.id}`)}
                  onEditar={() => navigate(`/mesa/${donoUid}/${mesaId}/personagem/${p.id}/editar`)}
                  onRemover={() => setRemoveTarget(p)}
                  onDesvincular={p.jogadorUid ? () => handleDesvincular(p) : undefined}
                  onAtribuir={() => handleAbrirAtribuir(p)}
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
            <Button size="sm" variant="secondary" onClick={() => navigate(`/mesa/${donoUid}/${mesaId}/personagem/novo?tipo=npc`)}>
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
                  onVer={() => navigate(`/mesa/${donoUid}/${mesaId}/personagem/${p.id}`)}
                  onEditar={() => navigate(`/mesa/${donoUid}/${mesaId}/personagem/${p.id}/editar`)}
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

                      <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nome}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Nv. {p.nivel} · {p.classe}</div>
                      </div>

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
                  onClick={() => navigate(`/mesa/${donoUid}/${mesaId}/combate`, { state: { fila: combateFila } })}
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
            action={<Button variant="ghost" size="sm" onClick={togglePause} disabled={mesa.status === 'encerrada'}>
              {mesa.status === 'pausada' ? 'Reativar mesa' : 'Pausar mesa'}
            </Button>}
          />
          <ZoneRow
            label="Encerrar mesa"
            desc="Marca a campanha como finalizada. Fica guardada, sem aparecer como 'em andamento' — pode reabrir quando quiser."
            action={<Button variant="ghost" size="sm" onClick={toggleEncerrada}>
              {mesa.status === 'encerrada' ? 'Reabrir mesa' : 'Encerrar mesa'}
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

      {/* Modal de atribuir/trocar dono da ficha */}
      <Modal open={!!atribuirTarget} onClose={() => setAtribuirTarget(null)} title={`Atribuir "${atribuirTarget?.nome}" a...`}>
        <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 14 }}>
          Só aparecem aqui quem já entrou na mesa pelo código de convite.
        </div>
        {membrosAtivos.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 16 }}>
            Ninguém entrou nessa mesa ainda — gere e compartilhe o código de convite primeiro.
          </div>
        ) : (
          <Select label="Jogador" value={uidAtribuir} onChange={e => setUidAtribuir(e.target.value)} style={{ marginBottom: 16 }}>
            <option value="">—</option>
            {membrosAtivos.map(m => <option key={m.uid} value={m.uid}>{m.nome}</option>)}
          </Select>
        )}
        {erroAtribuir && <div style={{ color: '#e07a7a', fontSize: 13, marginBottom: 14 }}>{erroAtribuir}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setAtribuirTarget(null)}>Cancelar</Button>
          <Button disabled={!uidAtribuir || salvandoAtribuir} onClick={handleConfirmarAtribuir}>
            {salvandoAtribuir ? 'Salvando…' : 'Atribuir'}
          </Button>
        </div>
      </Modal>

      {toast && <Toast message={toast} visible={!!toast} />}
      <DiceRollerModal open={diceModal} onClose={() => setDiceModal(false)} />
    </div>
  )
}

// ── Visão do jogador convidado (reduzida) ───────────────────────────────
const GerenciadorJogador: React.FC<{ donoUid: string; mesaId: string }> = ({ donoUid, mesaId }) => {
  const navigate = useNavigate()
  const [mesa, setMesa] = useState<Mesa | null>(null)
  const [minhaFicha, setMinhaFicha] = useState<Personagem | null>(null)
  const [resumo, setResumo] = useState<ResumoJogador[]>([])
  const [slotsLivres, setSlotsLivres] = useState<Personagem[]>([])
  const [reivindicando, setReivindicando] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [m, ficha, res] = await Promise.all([
        getMesa(donoUid, mesaId), getMinhaFicha(donoUid, mesaId), getResumoJogadores(donoUid, mesaId),
      ])
      if (m) setMesa(m)
      setResumo(res)
      setMinhaFicha(ficha || null)
      if (!ficha) setSlotsLivres(await getSlotsLivres(donoUid, mesaId))
    } catch (err) {
      // O mestre pode ter removido esse jogador da mesa entre uma tela e outra —
      // isso não é sessão inválida, é acesso negado de verdade (ver db/index.ts,
      // guarded()). Volta pra lista de mesas com um aviso, sem deslogar ninguém.
      if ((err as { code?: string })?.code === 'permission-denied') {
        sessionStorage.setItem(ACESSO_REVOGADO_KEY, '1')
        navigate('/jogos', { replace: true })
        return
      }
      throw err
    }
  }, [donoUid, mesaId, navigate])

  useEffect(() => { load() }, [load])

  const handleEscolherSlot = async (personagemId: string) => {
    setReivindicando(personagemId)
    try {
      await claimPersonagem(donoUid, mesaId, personagemId)
      await load()
    } finally {
      setReivindicando(null)
    }
  }

  if (!mesa) return null

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>
      <Topbar
        crumbs={[
          { label: 'Início', to: '/' },
          { label: 'Jogos', to: '/jogos' },
          { label: mesa.nome },
        ]}
      />

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '26px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Panel>
          <PanelTitle>Minha ficha</PanelTitle>
          {minhaFicha ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
              <Avatar nome={minhaFicha.nome} src={minhaFicha.imagemUrl} size={56} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{minhaFicha.nome}</div>
                <HpBar atual={minhaFicha.hpAtual} maximo={minhaFicha.hpMaximo} />
              </div>
              <Button size="sm" onClick={() => navigate(`/mesa/${donoUid}/${mesaId}/personagem/${minhaFicha.id}`)}>Ver ficha</Button>
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              <EmptyState label="Você ainda não tem um personagem nesta mesa." />
              {slotsLivres.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                  {slotsLivres.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'var(--bg-card)', border: '1px solid var(--line)',
                      borderRadius: 10, padding: '10px 14px',
                    }}>
                      <Avatar nome={p.nome} src={p.imagemUrl} size={40} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nome}</div>
                        <HpBar atual={p.hpAtual} maximo={p.hpMaximo} />
                      </div>
                      <Button size="sm" disabled={reivindicando === p.id} onClick={() => handleEscolherSlot(p.id!)}>
                        {reivindicando === p.id ? 'Entrando…' : 'Escolher'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="secondary" style={{ width: '100%', marginTop: 10 }}
                onClick={() => navigate(`/mesa/${donoUid}/${mesaId}/personagem/novo?tipo=jogador`)}>
                + Criar novo personagem
              </Button>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelTitle>Grupo</PanelTitle>
          {resumo.length === 0 ? (
            <EmptyState label="Nenhum jogador na mesa ainda." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              {resumo.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar nome={p.nome} src={p.imagemUrl} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2 }}>{p.nome}</div>
                    <HpBar atual={p.hpAtual} maximo={p.hpMaximo} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
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
  onDesvincular?: () => void
  onAtribuir?: () => void
}> = ({ personagem: p, inFila, onToggleFila, onVer, onEditar, onRemover, onDesvincular, onAtribuir }) => {
  const acaoStyle: React.CSSProperties = {
    fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px',
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, padding: '5px 2px',
  }
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        background: 'var(--bg-card)',
        border: `1px solid ${inFila ? 'var(--gold)' : 'var(--line)'}`,
        borderRadius: 11, padding: 14,
        boxShadow: inFila ? '0 0 0 1px var(--gold-dim)' : 'none',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar nome={p.nome} src={p.imagemUrl} size={44} border={inFila ? '2px solid var(--gold)' : undefined} />
        <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{p.nome}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 4 }}>
            Nv. {p.nivel} · {p.raca} · {p.classe}
          </div>
          {p.jogadorUid && (
            <div style={{ fontSize: 11, color: 'var(--gold)' }}>
              Jogado por: {p.jogadorNome || 'conta vinculada'}
            </div>
          )}
        </div>
        <Button size="sm" variant={inFila ? 'secondary' : 'ghost'} onClick={onToggleFila}
          title="Adiciona ou remove esse personagem da fila de combate"
          style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {inFila ? '✓ Na fila' : '+ Fila'}
        </Button>
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '4px 14px',
        borderTop: '1px solid var(--line)', paddingTop: 10,
      }}>
        <span style={{ ...acaoStyle, color: 'var(--ink-dim)' }} onClick={onVer}>Ver</span>
        <span style={{ ...acaoStyle, color: 'var(--ink-dim)' }} onClick={onEditar}>Editar</span>
        {onAtribuir && (
          <span style={{ ...acaoStyle, color: 'var(--gold)' }} onClick={onAtribuir} title="Escolher ou trocar a quem essa ficha pertence">
            Atribuir
          </span>
        )}
        {onDesvincular && (
          <span style={{ ...acaoStyle, color: 'var(--ink-faint)' }} onClick={onDesvincular} title="Libera essa ficha pra ser escolhida de novo, sem remover a pessoa da mesa">
            Desvincular
          </span>
        )}
        <span style={{ ...acaoStyle, color: '#e07a7a', marginLeft: 'auto' }} onClick={onRemover}>Remover</span>
      </div>
    </div>
  )
}

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
