import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { Button, Avatar, HpBar, Modal, Toast } from '../components/ui'
import { DiceRollerModal } from '../components/DiceRollerModal'
import { getMesa, getPersonagens, updatePersonagem } from '../db'
import { parseDiceExpression, executeRoll, cryptoRollSingle, type RollResult } from '../hooks/useDiceRoller'
import type { Personagem, Ataque } from '../types'
import { calcAtributo } from '../types'

interface FilaItem { personagemId: string; iniciativa: number }
interface Participante { personagem: Personagem; iniciativa: number }

export const Combate: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const mesaId = id!
  const navigate = useNavigate()
  const location = useLocation()
  const filaPids: FilaItem[] = (location.state as { fila?: FilaItem[] })?.fila || []

  const [mesaNome, setMesaNome]       = useState('')
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [turnoAtual, setTurnoAtual]   = useState(0)
  const [rodada, setRodada]           = useState(1)
  const [selecionado, setSelecionado] = useState<Participante | null>(null)
  const [hpDelta, setHpDelta]         = useState(0)
  const [xpModal, setXpModal]         = useState(false)
  const [xpValues, setXpValues]       = useState<Record<string, number>>({})
  const [toast, setToast]             = useState<string | null>(null)
  const [diceModal, setDiceModal]     = useState(false)
  const [fichaModal, setFichaModal]   = useState(false)
  const [rollHistory, setRollHistory] = useState<RollResult[]>([])
  const [diceExpr, setDiceExpr]       = useState('1d20')
  const [dicePublic, setDicePublic]   = useState(true)
  const [audiencia, setAudiencia]     = useState(false)  // false = modo mestre, true = modo stream
  const trackRef                      = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const [m, todos] = await Promise.all([getMesa(mesaId), getPersonagens(mesaId)])
    if (m) setMesaNome(m.nome)

    let ordenados: Participante[]
    if (filaPids.length > 0) {
      // Usa a ordem já calculada no Gerenciador (já vem ordenada por iniciativa)
      ordenados = filaPids
        .map(item => {
          const p = todos.find(t => t.id === item.personagemId)
          if (!p) return null
          return { personagem: p, iniciativa: item.iniciativa }
        })
        .filter(Boolean) as Participante[]
    } else {
      // Fallback: rola iniciativa para todos
      ordenados = todos
        .map(p => ({ personagem: p, iniciativa: cryptoRollSingle(20) }))
        .sort((a, b) => b.iniciativa - a.iniciativa)
    }
    setParticipantes(ordenados)
    if (ordenados.length > 0) setSelecionado(ordenados[0])
  }, [mesaId]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  // Scroll automático para o card ativo na trilha
  useEffect(() => {
    if (!trackRef.current) return
    const ativo = trackRef.current.querySelector('[data-ativo="true"]') as HTMLElement
    if (ativo) ativo.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [turnoAtual])

  const avancarTurno = () => {
    const prox = (turnoAtual + 1) % participantes.length
    setTurnoAtual(prox)
    setSelecionado(participantes[prox])
    if (prox === 0) setRodada(r => r + 1)
  }

  const aplicarHp = async (delta: number, tipo: 'dano' | 'cura') => {
    if (!selecionado || delta === 0) return
    const atual = selecionado.personagem.hpAtual
    const max = selecionado.personagem.hpMaximo
    const novoHp = tipo === 'dano'
      ? Math.max(0, atual - delta)
      : Math.min(max, atual + delta)
    await updatePersonagem(mesaId, selecionado.personagem.id!, {
      hpAtual: novoHp,
      status: novoHp === 0 ? 'inconsciente' : 'vivo',
    })
    const updated: Participante = { ...selecionado, personagem: { ...selecionado.personagem, hpAtual: novoHp } }
    setParticipantes(prev => prev.map(p => p.personagem.id === selecionado.personagem.id ? updated : p))
    setSelecionado(updated)
    setHpDelta(0)
    showToast(`${tipo === 'dano' ? '-' : '+'}${delta} HP em ${selecionado.personagem.nome}`)
  }

  const rolarDado = useCallback((expr: string, isPublic: boolean, rolledBy: string, bonusLabel?: string) => {
    const parsed = parseDiceExpression(expr)
    if (!parsed) return
    const result = executeRoll(parsed, rolledBy, isPublic, bonusLabel)
    setRollHistory(prev => [result, ...prev.slice(0, 29)])
  }, [])

  const rolarAtaque = useCallback((ataque: Ataque) => {
    if (!selecionado) return
    const temDano = !!(ataque.dados && ataque.dados.trim() && ataque.dados.trim() !== '0' && ataque.dados.trim() !== '—')
    const expr    = temDano ? ataque.dados : '1d20'
    const label   = temDano ? ataque.nome : `${ataque.nome} (acerto)`
    const parsed  = parseDiceExpression(expr)
    if (!parsed) return
    const result  = executeRoll(parsed, selecionado.personagem.nome, dicePublic, label)
    setRollHistory(prev => [result, ...prev.slice(0, 29)])
  }, [selecionado, dicePublic])

  // Rola 1d20 + valor total do atributo (base + bônus)
  const rolarAtributo = useCallback((nomeAtributo: string) => {
    if (!selecionado) return
    const total = calcAtributo(selecionado.personagem, nomeAtributo)
    const expr  = total >= 0 ? `1d20+${total}` : `1d20${total}`
    const parsed = parseDiceExpression(expr)
    if (!parsed) return
    const result = executeRoll(parsed, selecionado.personagem.nome, dicePublic, `${nomeAtributo} ${total >= 0 ? '+' : ''}${total}`)
    setRollHistory(prev => [result, ...prev.slice(0, 29)])
  }, [selecionado, dicePublic])

  const distribuirXp = async () => {
    await Promise.all(
      Object.entries(xpValues).map(async ([pid, xp]) => {
        if (!xp) return
        const p = participantes.find(pt => pt.personagem.id === pid)?.personagem
        if (!p) return
        await updatePersonagem(mesaId, pid, { xp: p.xp + xp })
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

  // Estilo de blur aplicado nos valores sensíveis em modo audiência
  const blurStyle = (show: boolean): React.CSSProperties => ({
    filter: (!audiencia || show) ? 'none' : 'blur(6px)',
    userSelect: (!audiencia || show) ? 'auto' : 'none',
    transition: 'filter 0.3s ease',
    display: 'inline-block',
  })

  // NPCs têm blur total em modo audiência — jogadores têm blur só nos números
  const isNpcAtivo = selecionado ? selecionado.personagem.tipo !== 'jogador' : false

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 90, background: 'var(--bg-deep)' }}>
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
            {/* Toggle de visibilidade — oculta valores sensíveis ao streamar */}
            <button
              onClick={() => setAudiencia(v => !v)}
              title={audiencia ? 'Modo audiência ativo — valores sensíveis ocultos. Clique para modo mestre.' : 'Modo mestre — clique para ocultar valores ao streamar'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: audiencia ? 'rgba(232,163,61,0.1)' : 'rgba(154,161,181,0.06)',
                border: `1px solid ${audiencia ? 'var(--gold-dim)' : 'var(--line)'}`,
                borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
                color: audiencia ? 'var(--gold)' : 'var(--ink-faint)',
                fontSize: 12, fontFamily: 'var(--font-display)',
                letterSpacing: '0.5px', transition: 'all 0.2s',
              }}
            >
              {audiencia ? '🔒 Audiência' : '👁 Mestre'}
            </button>
            <Button variant="danger-outline" size="sm" onClick={() => setXpModal(true)}>Encerrar combate</Button>
          </div>
        }
      />

      {/* Trilha de iniciativa
          ESTRUTURA DE DOIS CONTAINERS para resolver o conflito overflow-x:auto vs overflow-y:visible:
          - container externo: só faz scroll horizontal, sem clipar o eixo Y
          - container interno: flex row dos cards, overflow visible para o card ativo subir sem ser cortado
      */}
      <div style={{
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--line)',
        padding: '22px 32px 18px',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 14 }}>
          Ordem de iniciativa
        </div>
        {/* Container externo: scroll horizontal sem clipar eixo Y */}
        <div style={{ overflowX: 'visible', overflowY: 'visible', paddingBottom: 8 }}>
          {/* Container interno: padding-top generoso para o card ativo (translateY -5px + scale) não ser cortado */}
          <div
            ref={trackRef}
            style={{
              display: 'flex',
              gap: 14,
              paddingTop: 14,
              paddingBottom: 4,
              width: 'max-content', // força o scroll no container externo, não aqui
            }}
          >
          {participantes.map((p, idx) => {
            const ativo = idx === turnoAtual
            const feito = idx < turnoAtual
            return (
              <div
                key={p.personagem.id}
                data-ativo={ativo ? 'true' : 'false'}
                onClick={() => setSelecionado(p)}
                style={{
                  flexShrink: 0, width: 92,
                  padding: '10px 8px 12px', textAlign: 'center',
                  background: ativo ? 'linear-gradient(180deg,#3a3320,var(--bg-card))' : 'var(--bg-card)',
                  border: `1px solid ${ativo ? 'var(--gold)' : 'var(--line)'}`,
                  borderRadius: 10, cursor: 'pointer',
                  opacity: feito ? 0.35 : ativo ? 1 : 0.65,
                  transform: ativo ? 'translateY(-5px) scale(1.06)' : 'none',
                  boxShadow: ativo ? '0 0 0 1px var(--gold-dim), 0 8px 20px rgba(232,163,61,0.22)' : 'none',
                  transition: 'transform 0.2s, opacity 0.2s',
                  position: 'relative',
                }}
              >
                {ativo && (
                  <div style={{
                    position: 'absolute', top: -8, right: -8,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--gold)', color: 'var(--bg-deep)',
                    fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                    display: 'grid', placeItems: 'center',
                    boxShadow: '0 0 0 3px var(--bg-panel)',
                  }}>{p.iniciativa}</div>
                )}
                <Avatar nome={p.personagem.nome} src={p.personagem.imagemUrl} size={50} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 6 }}>
                  {p.personagem.nome}
                </div>
                <div style={{
                  fontSize: 10.5, marginTop: 2,
                  color: (!audiencia || p.personagem.tipo === 'jogador') && p.personagem.hpAtual / p.personagem.hpMaximo < 0.3
                    ? 'var(--blood)'
                    : 'var(--ink-faint)',
                }}>
                  {/* NPC em audiência: mostra placeholder fixo sem qualquer transição */}
                  {audiencia && p.personagem.tipo !== 'jogador'
                    ? '? / ?'
                    : `${p.personagem.hpAtual}/${p.personagem.hpMaximo}`
                  }
                </div>
              </div>
            )
          })}
          {/* Botão avançar turno */}
          <button
            onClick={avancarTurno}
            style={{
              alignSelf: 'center', flexShrink: 0,
              height: 78, padding: '0 16px',
              background: 'none', border: '1px dashed var(--ink-faint)',
              color: 'var(--ink-dim)', fontFamily: 'var(--font-display)', fontSize: 12,
              borderRadius: 8, cursor: 'pointer', marginLeft: 4,
            }}
            onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--gold)'); (e.currentTarget.style.color = 'var(--gold)') }}
            onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--ink-faint)'); (e.currentTarget.style.color = 'var(--ink-dim)') }}
          >Avançar<br />turno →</button>
          </div>{/* fim container interno (width:max-content) */}
        </div>{/* fim container externo (overflow-x:auto) */}
      </div>{/* fim seção trilha */}

      {/* Painel principal — 4 colunas */}
      {selecionado && (
        <div style={{
          maxWidth: 1300, margin: '20px auto', padding: '0 32px',
          display: 'grid',
          gridTemplateColumns: '240px 1fr 240px 300px',
          gap: 16,
          alignItems: 'start',
        }}>

          {/* Col 1: Personagem ativo */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14 }}>Personagem ativo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Avatar nome={selecionado.personagem.nome} src={selecionado.personagem.imagemUrl} size={52} border="2px solid var(--gold)" />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{selecionado.personagem.nome}</div>
                {/* Raça/classe de NPC fica borrada em audiência */}
                <div style={{
                  fontSize: 12, color: 'var(--ink-dim)',
                  ...blurStyle(!isNpcAtivo),
                }}>{selecionado.personagem.raca} · {selecionado.personagem.classe} · Nv. {selecionado.personagem.nivel}</div>
              </div>
            </div>
            {/* Barra de HP — NPC em audiência: barra estática sem revelar estado */}
            {audiencia && isNpcAtivo ? (
              <div>
                <div style={{ height: 10, background: '#11141d', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: '50%',             /* largura fixa — não revela nada */
                    background: '#343c52',    /* cor neutra — não revela estado de saúde */
                    borderRadius: 6,
                    /* sem transition — nenhuma animação que denuncie mudança */
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', textAlign: 'center', marginTop: 4 }}>
                  HP oculto
                </div>
              </div>
            ) : (
              <HpBar atual={selecionado.personagem.hpAtual} maximo={selecionado.personagem.hpMaximo} />
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'flex-end' }}>
              <input
                type="number" value={hpDelta}
                onChange={e => setHpDelta(Math.abs(Number(e.target.value)))}
                style={{ width: 54, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 7, color: 'var(--ink)', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 15, padding: '8px 4px', outline: 'none' }}
              />
              <Button onClick={() => aplicarHp(hpDelta, 'cura')} size="sm"
                style={{ flex: 1, background: 'rgba(91,140,90,0.15)', color: 'var(--moss)', border: '1px solid var(--moss)' }}>
                Curar
              </Button>
              <Button onClick={() => aplicarHp(hpDelta, 'dano')} size="sm"
                style={{ flex: 1, background: 'rgba(193,62,62,0.15)', color: 'var(--blood)', border: '1px solid var(--blood)' }}>
                Dano
              </Button>
            </div>
          </div>

          {/* Col 2: Ações de combate */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14 }}>Ações de combate</div>
            {selecionado.personagem.ataques.length === 0 ? (
              <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                Nenhum ataque cadastrado na ficha.
              </div>
            ) : (
              selecionado.personagem.ataques.map(a => {
                // Ataque sem dano numérico (campo vazio, "0" ou "—"):
                // rola apenas 1d20 como teste de acerto/efeito
                const temDano = !!(a.dados && a.dados.trim() && a.dados.trim() !== '0' && a.dados.trim() !== '—')
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 9, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      {/* Nome do ataque: sempre visível */}
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.nome}</div>
                      {/* Meta do ataque — borrado para NPC em audiência */}
                      <div style={{
                        fontSize: 11.5, color: 'var(--ink-faint)',
                        ...blurStyle(!isNpcAtivo),
                      }}>
                        {temDano
                          ? `${a.dados}${a.tipoDano ? ` ${a.tipoDano}` : ''}`
                          : 'Teste de acerto'
                        }
                        {a.descricao && !temDano && (
                          <span style={{ marginLeft: 4, fontStyle: 'italic' }}>— {a.descricao}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => rolarAtaque(a)}
                      title={temDano ? `Rolar ${a.dados}` : 'Rolar 1d20 — teste de acerto/efeito'}
                    >
                      🎲 {temDano ? 'Dano' : 'Acerto'}
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          {/* Col 3: Atributos como atalhos de rolagem */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>Atributos</div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 12 }}>Clique para rolar 1d20 + atributo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
              {selecionado.personagem.atributos.map(atr => {
                const total  = calcAtributo(selecionado.personagem, atr.nome)
                const bonus  = total - atr.valor
                return (
                  <button
                    key={atr.nome}
                    onClick={() => rolarAtributo(atr.nome)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'var(--bg-card)', border: '1px solid var(--line)',
                      color: 'var(--ink)', fontSize: 13, padding: '10px 12px',
                      borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
                  >
                    <span>{atr.nome}</span>
                    {/* Valores numéricos do NPC ficam borrados em audiência */}
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      ...blurStyle(!isNpcAtivo),
                    }}>
                      {bonus !== 0 && (
                        <span style={{ fontSize: 10, color: bonus > 0 ? 'var(--moss)' : 'var(--blood)' }}>
                          base {atr.valor} {bonus > 0 ? '+' : ''}{bonus}
                        </span>
                      )}
                      <span style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
                        color: total >= 0 ? 'var(--gold)' : 'var(--blood)',
                        minWidth: 28, textAlign: 'right',
                      }}>{total >= 0 ? '+' : ''}{total}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Col 4: Rolagem e histórico */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)' }}>Dados</div>

            {/* Input rápido inline */}
            <div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                {['d4','d6','d8','d10','d12','d20'].map(d => (
                  <button key={d}
                    onClick={() => rolarDado(`1${d}`, dicePublic, selecionado.personagem.nome)}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 12, padding: '6px 10px', borderRadius: 7, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
                  >{d}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={diceExpr}
                  onChange={e => setDiceExpr(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && rolarDado(diceExpr, dicePublic, selecionado.personagem.nome)}
                  placeholder="2d6+3"
                  style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 7, color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 14, padding: '8px 10px', outline: 'none', letterSpacing: 1 }}
                />
                <Button size="sm" onClick={() => rolarDado(diceExpr, dicePublic, selecionado.personagem.nome)}>⬡</Button>
              </div>
              {/* Toggle público/privado */}
              <div
                onClick={() => setDicePublic(p => !p)}
                style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: dicePublic ? 'var(--gold)' : 'var(--ink-faint)' }}
              >
                <span>{dicePublic ? '👁' : '🔒'}</span>
                <span>{dicePublic ? 'Rolagem pública' : 'Rolagem privada'}</span>
              </div>
            </div>

            {/* Histórico inline */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>Histórico</div>
              {rollHistory.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', padding: '12px 0' }}>Nenhuma rolagem ainda.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 280, overflowY: 'auto' }}>
                  {rollHistory.map((r, idx) => (
                    <div key={r.id} style={{
                      background: idx === 0 ? 'rgba(232,163,61,0.08)' : 'var(--bg-card)',
                      border: `1px solid ${idx === 0 ? 'var(--gold-dim)' : 'var(--line)'}`,
                      borderRadius: 7, padding: '7px 10px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* Expressão borrada em audiência */}
                        <span style={{
                          fontSize: 11, color: 'var(--ink-faint)',
                          filter: audiencia ? 'blur(5px)' : 'none',
                          userSelect: audiencia ? 'none' : 'auto',
                          transition: 'filter 0.3s ease',
                        }}>
                          {r.rolledBy} · {r.expression} {!r.isPublic && '🔒'}
                        </span>
                        {/* Total sempre visível */}
                        <span style={{
                          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
                          color: idx === 0 ? 'var(--gold)' : 'var(--ink)',
                        }}>{r.total}</span>
                      </div>
                      {/* Breakdown borrado em audiência */}
                      {r.breakdown && (
                        <div style={{
                          fontSize: 10, color: 'var(--ink-faint)', marginTop: 2, opacity: 0.8,
                          filter: audiencia ? 'blur(5px)' : 'none',
                          userSelect: audiencia ? 'none' : 'auto',
                          transition: 'filter 0.3s ease',
                        }}>
                          {r.breakdown}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          { icon: '✎', label: 'Fichas', action: () => setFichaModal(true) },
          { icon: '⬡', label: 'Dados completo', action: () => setDiceModal(true), primary: true },
        ].map(btn => (
          <div key={btn.label} title={btn.label} onClick={btn.action} style={{
            width: 52, height: 52, display: 'grid', placeItems: 'center',
            borderRadius: 11, cursor: 'pointer', fontSize: 18,
            background: btn.primary ? 'var(--gold)' : 'none',
            color: btn.primary ? 'var(--bg-deep)' : 'var(--ink-dim)',
          }}>{btn.icon}</div>
        ))}
      </div>

      {/* Modal de fichas rápidas */}
      <Modal open={fichaModal} onClose={() => setFichaModal(false)} title="Fichas dos personagens" width={500}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginBottom: 14 }}>
          Editar abre em nova aba — o combate continua aqui. Dados sincronizam automaticamente.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {participantes.filter(p => p.personagem.tipo === 'jogador').map(p => (
            <div key={p.personagem.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 9, padding: '12px 14px' }}>
              <Avatar nome={p.personagem.nome} src={p.personagem.imagemUrl} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.personagem.nome}</div>
                <HpBar atual={p.personagem.hpAtual} maximo={p.personagem.hpMaximo} />
              </div>
              <Button size="sm" variant="ghost"
                onClick={() => window.open(`/mesa/${mesaId}/personagem/${p.personagem.id}/editar`, '_blank')}
              >
                ✎ Editar ↗
              </Button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal de XP / encerrar combate */}
      <Modal open={xpModal} onClose={() => setXpModal(false)} title="Encerrar combate e distribuir XP" width={480}>
        <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 16 }}>
          Defina quanto XP cada jogador ganhou. NPCs não recebem XP.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px dashed var(--line)', borderRadius: 9, padding: '10px 12px', marginBottom: 16 }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-dim)', flexShrink: 0 }}>Aplicar a todos:</span>
          <input type="number" placeholder="50" id="bulk-xp"
            style={{ width: 70, background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--gold)', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, padding: 6, outline: 'none' }}
          />
          <Button size="sm" variant="secondary" onClick={() => {
            const val = Number((document.getElementById('bulk-xp') as HTMLInputElement).value)
            const next: Record<string, number> = {}
            jogadores.forEach(p => { if (p.personagem.id) next[p.personagem.id] = val })
            setXpValues(next)
          }}>Aplicar</Button>
        </div>
        {jogadores.map(p => (
          <div key={p.personagem.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <Avatar nome={p.personagem.nome} src={p.personagem.imagemUrl} size={38} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.personagem.nome}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Nível {p.personagem.nivel} · {p.personagem.xp} XP</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <input type="number"
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
      <DiceRollerModal open={diceModal} onClose={() => setDiceModal(false)} />
    </div>
  )
}
