import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { Button, Input, Textarea, Select, Panel, PanelTitle, HpBar, XpBar, Toast, Modal } from '../components/ui'
import { getPersonagem, createPersonagem, updatePersonagem, getMesa, vincularPersonagemParticipando, ACESSO_REVOGADO_KEY } from '../db'
import { auth } from '../firebase'
import type { Personagem as TPersonagem, MoldeMesa, Ataque, BonusAtributo } from '../types'
import { calcAtributo } from '../types'
import { resizeImageToBase64 } from '../utils/imagem'
import { aplicarXp } from '../utils/xp'
import { parseDiceExpression } from '../hooks/useDiceRoller'
import { useAvisoSairSemSalvar } from '../hooks/useAvisoSairSemSalvar'

// ── Helpers ──────────────────────────────────────────────────────────
const defaultAtributos = (nomes: string[]) => nomes.map(nome => ({
  nome, valor: 0, abreviacao: nome.slice(0, 3).toUpperCase(),
}))

const LADOS_DADO = [4, 6, 8, 10, 12, 20, 100]
const TOTAL_DADOS_MAX = 50 // soma de todos os grupos de dado de um ataque, não por grupo
type GrupoDado = { lados: number; qtd: number }
type BonusDado = { id: string; valor: number; origem: string }

// Monta a string canônica "2d6+1d4+4" a partir dos grupos de dado + soma dos bônus
// nomeados — é o único lugar que gera `ataque.dados`, nunca mais vem de digitação
// livre (era assim que um texto tipo "100000000d999999999999" conseguia ser salvo).
const formatDados = (grupos: GrupoDado[], bonusos: BonusDado[]): string => {
  const partesDados = grupos.filter(g => g.qtd > 0).map(g => `${g.qtd}d${g.lados}`)
  const totalBonus = bonusos.reduce((s, b) => s + b.valor, 0)
  const partes = totalBonus !== 0 ? [...partesDados, String(totalBonus)] : partesDados
  return partes.join('+').replace(/\+-/g, '-')
}

// Junta grupos repetidos do mesmo dado e trava o total em TOTAL_DADOS_MAX — roda
// toda vez que um ataque é aberto pra editar, então uma ficha que já ficou com
// dezenas de linhas (de antes do "+Dado" ganhar limite) se corrige sozinha ao reabrir.
const sanearGrupos = (grupos: GrupoDado[]): GrupoDado[] => {
  const porLados = new Map<number, number>()
  for (const g of grupos) porLados.set(g.lados, (porLados.get(g.lados) || 0) + Math.max(0, g.qtd))
  let restante = TOTAL_DADOS_MAX
  const resultado: GrupoDado[] = []
  for (const [lados, qtdTotal] of porLados) {
    if (restante <= 0) break
    const qtd = Math.min(qtdTotal, 50, restante)
    if (qtd <= 0) continue
    resultado.push({ lados, qtd })
    restante -= qtd
  }
  return resultado
}

// Ficha antiga só tem `dados` como texto livre (ex: "2d6+1d4+3") — essa função tenta
// reconstruir os grupos de dado e um bônus único a partir dela, pra preencher o
// editor estruturado. A origem do bônus não existia antes, então fica em branco —
// o mestre só precisa preencher uma vez, na primeira edição depois dessa mudança.
const inferirCamposDado = (a: Ataque): { dadoGrupos: GrupoDado[]; dadoBonusos: BonusDado[] } => {
  if (a.dadoGrupos !== undefined) {
    return { dadoGrupos: sanearGrupos(a.dadoGrupos), dadoBonusos: a.dadoBonusos || [] }
  }
  const parsed = a.dados ? parseDiceExpression(a.dados) : null
  let restante = TOTAL_DADOS_MAX
  const dadoGrupos: GrupoDado[] = []
  for (const g of parsed?.groups || []) {
    if (!LADOS_DADO.includes(g.sides) || restante <= 0) continue
    const qtd = Math.min(Math.abs(g.count), 50, restante)
    if (qtd <= 0) continue
    dadoGrupos.push({ lados: g.sides, qtd })
    restante -= qtd
  }
  const dadoBonusos: BonusDado[] = parsed && parsed.modifier !== 0
    ? [{ id: crypto.randomUUID(), valor: Math.max(-50, Math.min(50, parsed.modifier)), origem: '' }]
    : []
  return { dadoGrupos, dadoBonusos }
}

// Listas fixas pra tipo de dano/alcance/recarga/recurso — eram campos de texto
// livre, o mesmo problema que o "Dados de dano" tinha (sem padrão, sem limite).
type GrupoOpcoes = { label: string; opcoes: string[] }

const TIPOS_DANO_GRUPOS: GrupoOpcoes[] = [
  { label: '⚔️ Danos Físicos (Marciais)', opcoes: ['Concussão', 'Perfuração', 'Corte'] },
  { label: '🔥 Danos Elementais e de Energia', opcoes: ['Fogo (Ígneo)', 'Gelo (Frio)', 'Elétrico', 'Ácido', 'Trovejante', 'Energia'] },
  { label: '🌟 Danos Mágicos, Espirituais e Mentais', opcoes: ['Psíquico (Mental)', 'Necrótico (Trevas)', 'Radiante (Sagrado/Luz)', 'Veneno'] },
]
const ALCANCES = ['Corpo a corpo', 'Toque', 'Curto (até 9m)', 'Médio (até 18m)', 'Longo (até 36m)', 'Muito longo (36m+)']
const RECARGA_GRUPOS: GrupoOpcoes[] = [
  { label: '⏳ Recursos de Tempo (Descansos e Frequência)', opcoes: ['Descanso Curto', 'Descanso Longo', 'Recarga por Turnos / Rodadas'] },
]
const RECURSO_GRUPOS: GrupoOpcoes[] = [
  { label: '🪙 Recursos Quantificáveis (Pontos e Espaços)', opcoes: ['Espaços de Magia', 'Pontos de Mana (PM)', 'Pontos de Esforço (PE)', 'Cargas'] },
  { label: '🛠️ Recursos de Ação (Economia de Turno)', opcoes: ['Ação Padrão', 'Ação Bônus / Rápida', 'Reação', 'Tempo de Execução Longo'] },
  { label: 'Componentes e Sacrifícios (Custos Materiais e Físicos)', opcoes: ['Componentes Materiais Consumíveis', 'Componentes Materiais Não-Consumíveis (Foco)', 'Pontos de Vida (PV) / Sacrifício de Sangue', 'Sanidade'] },
]
// Só esses tipos de recurso fazem sentido com uma quantidade numérica junto (ex: "2
// Pontos de Mana") — os de ação/componente são a própria categoria do custo, não dá
// pra ter "3 Ação Bônus".
const TIPOS_RECURSO_COM_QTD = new Set(['Espaços de Magia', 'Pontos de Mana (PM)', 'Pontos de Esforço (PE)', 'Cargas', 'Pontos de Vida (PV) / Sacrifício de Sangue', 'Sanidade'])

// Ficha antiga pode ter um valor digitado que não bate com nenhuma opção fixa —
// em vez de apagar o que o mestre já tinha escrito, injeta como opção extra no
// select, selecionada, até ele trocar por uma das opções padrão (ou não, se preferir).
const optionsComLegado = (lista: string[], atual: string): string[] =>
  atual && !lista.includes(atual) ? [atual, ...lista] : lista

const opcoesAgrupadasComLegado = (grupos: GrupoOpcoes[], atual: string): React.ReactNode => {
  const todas = grupos.flatMap(g => g.opcoes)
  const legado = atual && !todas.includes(atual) ? atual : null
  return (
    <>
      {legado && <option value={legado}>{legado}</option>}
      {grupos.map(g => (
        <optgroup key={g.label} label={g.label}>
          {g.opcoes.map(o => <option key={o} value={o}>{o}</option>)}
        </optgroup>
      ))}
    </>
  )
}

const formatCustoRecurso = (qtd: number, tipo: string): string => {
  if (!tipo || tipo === 'Nenhum') return ''
  return TIPOS_RECURSO_COM_QTD.has(tipo) && qtd > 0 ? `${qtd} de ${tipo}` : tipo
}

// "2 de Mana" → {qtd:2, tipo:'Mana'}; o que não bate com esse formato vira um custo
// "Nenhum" só pra não travar o editor — o texto original continua em `custoRecurso`
// até o mestre resalvar.
const inferirCustoRecurso = (a: Ataque): { custoRecursoQtd: number; custoRecursoTipo: string } => {
  if (a.custoRecursoTipo !== undefined) {
    return { custoRecursoQtd: a.custoRecursoQtd ?? 0, custoRecursoTipo: a.custoRecursoTipo }
  }
  const match = a.custoRecurso?.match(/^(\d+)\s*(?:de\s+)?(.+)$/i)
  if (match) {
    return { custoRecursoQtd: Math.max(0, Math.min(99, parseInt(match[1], 10))), custoRecursoTipo: match[2].trim() }
  }
  return { custoRecursoQtd: 0, custoRecursoTipo: 'Nenhum' }
}

const defaultPersonagem = (
  tipo: 'jogador' | 'npc' | 'monstro', atrs: string[], jogadorUid: string | null = null
): Omit<TPersonagem, 'id'> => ({
  tipo, nome: '', raca: '', classe: '', nivel: 1,
  xp: 0, xpProximoNivel: 300,
  hpAtual: 10, hpMaximo: 10,
  status: 'vivo',
  atributos: defaultAtributos(atrs),
  bonusAtributos: [],
  ataques: [], pericias: {},
  notas: '',
  inventario: [],
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
  ...(tipo === 'jogador' ? { jogadorUid } : {}),
})

function newAtaque(): Ataque {
  return {
    id: Math.random().toString(36).slice(2),
    nome: '', tipo: 'arma_cac',
    dados: '1d6', dadoGrupos: [{ lados: 6, qtd: 1 }], dadoBonusos: [],
    tipoDano: '', alcance: '',
    custoRecurso: '', custoRecursoQtd: 0, custoRecursoTipo: 'Nenhum',
    recarga: '', descricao: '',
  }
}

// ── ImageUploadCircle ─────────────────────────────────────────────────
const ImageUploadCircle: React.FC<{
  src?: string
  label: string
  onClick: () => void
  onRemove?: () => void
  size?: number
  tint?: 'gold' | 'blood'
  fallbackIcon?: string
}> = ({ src, label, onClick, onRemove, size = 80, tint, fallbackIcon = '+' }) => {
  const borderColor = tint === 'gold' ? 'var(--gold-dim)' : tint === 'blood' ? 'var(--blood-dim)' : 'var(--gold-dim)'
  return (
    <div>
      {/* Wrapper sem overflow:hidden — o botão de remover fica fora do círculo
          recortado, senão fica cortado pela máscara circular e quase não clica. */}
      <div style={{ width: size, height: size, position: 'relative', margin: '0 auto 6px' }}>
        <div
          onClick={onClick}
          style={{
            width: size, height: size, borderRadius: '50%',
            border: `2px dashed ${borderColor}`,
            cursor: 'pointer', overflow: 'hidden',
            display: 'grid', placeItems: 'center',
            background: 'var(--bg-card)', position: 'relative',
          }}
        >
          {src ? (
            <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: size * 0.3, color: 'var(--ink-faint)', userSelect: 'none' }}>
              {fallbackIcon}
            </span>
          )}
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'grid', placeItems: 'center', opacity: 0, transition: 'opacity 0.15s',
            fontSize: 10, color: 'var(--ink)', textAlign: 'center',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
          >{src ? 'Trocar' : 'Adicionar'}</div>
        </div>
        {src && onRemove && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRemove() }}
            title="Remover imagem"
            style={{
              position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: '50%',
              background: 'var(--blood)', color: '#fff', border: '2px solid var(--bg-deep)',
              fontSize: 12, lineHeight: 1, cursor: 'pointer', display: 'grid', placeItems: 'center',
              zIndex: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }}
          >✕</button>
        )}
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-faint)', textAlign: 'center' }}>{label}</div>
    </div>
  )
}

// ── PersonagemForm ────────────────────────────────────────────────────
export const PersonagemForm: React.FC = () => {
  const { donoUid: dUid, id, personagemId } = useParams<{ donoUid: string; id: string; personagemId?: string }>()
  const donoUid = dUid!
  const mesaId = id!
  const meuUid = auth.currentUser!.uid
  const souDono = donoUid === meuUid
  const isEdit = !!personagemId
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tipoParam = souDono ? ((searchParams.get('tipo') as 'jogador' | 'npc') || 'jogador') : 'jogador'
  const imgInputRef = useRef<HTMLInputElement>(null)
  const imgFerido   = useRef<HTMLInputElement>(null)
  const imgMorto    = useRef<HTMLInputElement>(null)

  const [molde, setMolde]       = useState<MoldeMesa | null>(null)
  const [form, setForm]         = useState<Omit<TPersonagem, 'id'> | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  // Snapshot do xp/nível/xpProximoNivel como veio do Firestore, pra calcular o
  // level up automático comparando com o que o mestre digitou no campo "XP atual"
  // (ver utils/xp.ts) — sem isso não dá pra saber quanto XP foi realmente ganho.
  const xpOriginalRef = useRef<{ xp: number; nivel: number; xpProximoNivel: number } | null>(null)
  // Snapshot serializado do form como veio do Firestore (ou do padrão, se for
  // criação) — compara com o form atual pra saber se tem alteração não salva.
  const formOriginalRef = useRef<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState<string | null>(null)
  const [mesaNome, setMesaNome] = useState('')
  const [ataqueModal, setAtaqueModal]   = useState(false)
  const [editandoAtaque, setEditandoAtaque] = useState<Ataque | null>(null)
  const [novoItem, setNovoItem]         = useState('')
  const [editandoItemIdx, setEditandoItemIdx] = useState<number | null>(null)
  const [itemEditValor, setItemEditValor] = useState('')
  const [novoBonus, setNovoBonus]       = useState({ atributo: '', valor: 0, origem: '' })
  const [novoGrupoDado, setNovoGrupoDado] = useState<GrupoDado>({ lados: 6, qtd: 1 })
  const [novoBonusDado, setNovoBonusDado] = useState({ valor: 0, origem: '' })

  const load = useCallback(async () => {
    try {
      const m = await getMesa(donoUid, mesaId)
      if (m) setMesaNome(m.nome)
      const atrs = m?.molde?.atributos || ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']
      setMolde(m?.molde || null)
      if (isEdit && personagemId) {
        const p = await getPersonagem(donoUid, mesaId, personagemId)
        if (p) {
          const loaded = { ...p, inventario: (p as any).inventario || [], bonusAtributos: p.bonusAtributos || [] }
          setForm(loaded)
          formOriginalRef.current = JSON.stringify(loaded)
          xpOriginalRef.current = { xp: p.xp, nivel: p.nivel, xpProximoNivel: p.xpProximoNivel }
        }
      } else {
        const loaded = defaultPersonagem(tipoParam, atrs, souDono ? null : meuUid)
        setForm(loaded)
        formOriginalRef.current = JSON.stringify(loaded)
      }
    } catch (err) {
      // Acesso negado de verdade (ex: removido da mesa, ficha desvinculada entre
      // uma tela e outra) — não é sessão inválida, não desloga ninguém (ver
      // db/index.ts, guarded()). Só volta pra lista de mesas com um aviso.
      if ((err as { code?: string })?.code === 'permission-denied') {
        sessionStorage.setItem(ACESSO_REVOGADO_KEY, '1')
        navigate('/jogos', { replace: true })
        return
      }
      throw err
    }
  }, [donoUid, mesaId, personagemId, isEdit, tipoParam, navigate])

  useEffect(() => { load() }, [load])

  const isDirty = !!form && formOriginalRef.current !== null && JSON.stringify(form) !== formOriginalRef.current
  const { confirmando: confirmSairAberto, tentarSair, confirmarSaidaSemSalvar, cancelarSaida } = useAvisoSairSemSalvar(isDirty)

  const update = (field: string, value: unknown) =>
    setForm(prev => prev ? { ...prev, [field]: value } : prev)

  const updateAtributo = (nome: string, valor: number) => {
    const clamped = Number.isFinite(valor) ? Math.max(0, Math.min(99, valor)) : 0
    setForm(prev => prev ? {
      ...prev,
      atributos: prev.atributos.map(a => a.nome === nome ? { ...a, valor: clamped } : a),
    } : prev)
  }

  const addBonus = () => {
    if (!novoBonus.atributo || !novoBonus.origem || !form) return
    const bonus: BonusAtributo = { id: crypto.randomUUID(), ...novoBonus }
    update('bonusAtributos', [...(form.bonusAtributos || []), bonus])
    setNovoBonus({ atributo: '', valor: 0, origem: '' })
  }

  const removeBonus = (id: string) => {
    if (!form) return
    update('bonusAtributos', (form.bonusAtributos || []).filter((b: BonusAtributo) => b.id !== id))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await resizeImageToBase64(file)
      update('imagemUrl', base64)
    } catch (err) {
      console.error('Falha ao processar imagem:', err)
      setErro('Não foi possível usar essa imagem. Tente outro arquivo (JPG ou PNG).')
    }
  }

  const handleRemoveImagem = () => update('imagemUrl', '')

  const handleImageEstadoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    estado: 'normal' | 'ferido' | 'morto'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await resizeImageToBase64(file)
      setForm(prev => prev ? { ...prev, imagensEstado: { ...(prev.imagensEstado || {}), [estado]: base64 } } : prev)
    } catch (err) {
      console.error('Falha ao processar imagem:', err)
      setErro('Não foi possível usar essa imagem. Tente outro arquivo (JPG ou PNG).')
    }
  }

  const handleRemoveImagemEstado = (estado: 'normal' | 'ferido' | 'morto') =>
    setForm(prev => prev ? { ...prev, imagensEstado: { ...(prev.imagensEstado || {}), [estado]: '' } } : prev)

  const handleSave = async () => {
    if (!form || !form.nome.trim()) return
    setSalvando(true)
    setErro(null)
    try {
      const payload = { ...form, atualizadoEm: new Date().toISOString() }
      // Editar um NPC/monstro e trocar o tipo pra "jogador" não cria o campo
      // `jogadorUid` sozinho — e a query de slots livres (`getSlotsLivres`) só
      // encontra documentos onde o campo existe E é null, nunca onde ele está
      // simplesmente ausente. Sem isso, o slot fica invisível pra quem entra na mesa.
      if (payload.tipo === 'jogador' && payload.jogadorUid === undefined) payload.jogadorUid = null
      if (!souDono && payload.jogadorUid === meuUid) {
        payload.jogadorNome = auth.currentUser?.displayName || auth.currentUser?.email || 'Jogador'
      }
      // Level up automático quando o XP sobe o suficiente pelo campo "XP atual" —
      // só entra em ação se o nível não foi mexido manualmente na mesma edição
      // (nesse caso respeitamos o valor que foi digitado de propósito).
      let subiuNivelMsg: string | null = null
      const original = xpOriginalRef.current
      if (original && payload.nivel === original.nivel) {
        const ganho = payload.xp - original.xp
        if (ganho > 0) {
          const resultado = aplicarXp(original, ganho)
          payload.nivel = resultado.nivel
          payload.xpProximoNivel = resultado.xpProximoNivel
          if (resultado.subiuNivel) subiuNivelMsg = `🎉 ${payload.nome} subiu de nível!`
        }
      }
      if (isEdit && personagemId) {
        await updatePersonagem(donoUid, mesaId, personagemId, payload)
      } else {
        const novoId = await createPersonagem(donoUid, mesaId, payload)
        if (!souDono) await vincularPersonagemParticipando(mesaId, novoId)
      }
      // Marca como salvo antes do redirect (compara com `form`, não `payload` —
      // esse pode ter ganhado campos calculados na hora de salvar, tipo o level up
      // automático, que o usuário não digitou) — senão o aviso de "sair sem salvar"
      // dispara bloqueando a própria navegação de sucesso logo depois.
      formOriginalRef.current = JSON.stringify(form)
      setToastMsg(subiuNivelMsg || (isEdit ? 'Alterações salvas!' : 'Personagem criado!'))
      setTimeout(() => navigate(`/mesa/${donoUid}/${mesaId}`), subiuNivelMsg ? 1800 : 1000)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar o personagem.')
    } finally {
      setSalvando(false)
    }
  }

  // Clicar de novo no mesmo tipo de dado soma na linha que já existe em vez de criar
  // outra — sem isso, "+ Dado" repetido criava uma linha nova por clique, sem limite
  // (foi reportado quebrando o layout com dezenas de "1d6" separados). O total somado
  // de todos os grupos também trava em TOTAL_DADOS_MAX, não só cada grupo isolado.
  const addGrupoDado = () => {
    if (!editandoAtaque || novoGrupoDado.qtd <= 0) return
    const grupos = editandoAtaque.dadoGrupos || []
    const totalAtual = grupos.reduce((s, g) => s + g.qtd, 0)
    const espaco = Math.max(0, TOTAL_DADOS_MAX - totalAtual)
    if (espaco <= 0) return
    const qtdAdicionar = Math.min(novoGrupoDado.qtd, espaco)
    const idxExistente = grupos.findIndex(g => g.lados === novoGrupoDado.lados)
    const novosGrupos = idxExistente >= 0
      ? grupos.map((g, i) => i === idxExistente ? { ...g, qtd: Math.min(50, g.qtd + qtdAdicionar) } : g)
      : [...grupos, { lados: novoGrupoDado.lados, qtd: qtdAdicionar }]
    setEditandoAtaque(a => a ? { ...a, dadoGrupos: novosGrupos } : a)
    setNovoGrupoDado({ lados: 6, qtd: 1 })
  }

  const removeGrupoDado = (idx: number) => {
    setEditandoAtaque(a => a ? { ...a, dadoGrupos: (a.dadoGrupos || []).filter((_, i) => i !== idx) } : a)
  }

  const addBonusDado = () => {
    if (!editandoAtaque || !novoBonusDado.origem.trim() || novoBonusDado.valor === 0) return
    const bonus: BonusDado = { id: crypto.randomUUID(), ...novoBonusDado }
    setEditandoAtaque(a => a ? { ...a, dadoBonusos: [...(a.dadoBonusos || []), bonus] } : a)
    setNovoBonusDado({ valor: 0, origem: '' })
  }

  const removeBonusDado = (id: string) => {
    setEditandoAtaque(a => a ? { ...a, dadoBonusos: (a.dadoBonusos || []).filter(b => b.id !== id) } : a)
  }

  const saveAtaque = () => {
    if (!editandoAtaque || !form) return
    const grupos = editandoAtaque.dadoGrupos || []
    const bonusos = editandoAtaque.dadoBonusos || []
    const custoQtd = editandoAtaque.custoRecursoQtd ?? 0
    const custoTipo = editandoAtaque.custoRecursoTipo ?? 'Nenhum'
    const final: Ataque = {
      ...editandoAtaque,
      dados: formatDados(grupos, bonusos),
      custoRecurso: formatCustoRecurso(custoQtd, custoTipo),
    }
    const exists = form.ataques.find(a => a.id === final.id)
    if (exists) {
      update('ataques', form.ataques.map(a => a.id === final.id ? final : a))
    } else {
      update('ataques', [...form.ataques, final])
    }
    setAtaqueModal(false)
    setEditandoAtaque(null)
  }

  const removeAtaque = (id: string) => {
    if (!form) return
    update('ataques', form.ataques.filter(a => a.id !== id))
  }

  const addItem = () => {
    if (!novoItem.trim() || !form) return
    update('inventario', [...((form as any).inventario || []), novoItem.trim()])
    setNovoItem('')
  }

  const removeItem = (idx: number) => {
    if (!form) return
    const inv = [...((form as any).inventario || [])]
    inv.splice(idx, 1)
    update('inventario', inv)
  }

  const editItem = (idx: number, valor: string) => {
    if (!form || !valor.trim()) return
    const inv = [...((form as any).inventario || [])]
    inv[idx] = valor.trim()
    update('inventario', inv)
  }

  if (!form) return null

  const atrs = molde?.atributos || ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']
  const tipoLabel = form.tipo === 'jogador' ? 'Jogador' : form.tipo === 'npc' ? 'NPC' : 'Monstro'
  const totalDadosAtaque = (editandoAtaque?.dadoGrupos || []).reduce((s, g) => s + g.qtd, 0)
  const inventario: string[] = (form as any).inventario || []

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>
      <Topbar
        crumbs={[
          { label: 'Início', onClick: () => tentarSair(() => navigate('/')) },
          { label: mesaNome, onClick: () => tentarSair(() => navigate(`/mesa/${donoUid}/${mesaId}`)) },
          { label: isEdit ? 'Editar personagem' : `Criar ${tipoLabel}` },
        ]}
        right={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={() => tentarSair(() => navigate(`/mesa/${donoUid}/${mesaId}`))}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nome.trim() || salvando}>
              {salvando ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar personagem'}
            </Button>
          </div>
        }
      />

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '26px 32px' }}>
        {erro && (
          <div style={{ color: '#e07a7a', fontSize: 13, background: 'var(--bg-card)', border: '1px solid var(--blood-dim)', borderRadius: 9, padding: '10px 14px', marginBottom: 16 }}>
            {erro}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, marginBottom: 20 }}>

          {/* Coluna identidade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Panel>
              <PanelTitle>{isEdit ? 'Editar' : 'Novo'} {tipoLabel}</PanelTitle>

              {/* Upload de imagens por estado */}
              <div style={{ margin: '14px 0' }}>
                {/* Imagem principal / estado normal */}
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <ImageUploadCircle
                    src={form.imagemUrl}
                    label="Normal (principal)"
                    onClick={() => imgInputRef.current?.click()}
                    onRemove={form.imagemUrl ? handleRemoveImagem : undefined}
                    size={80}
                  />
                  <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                </div>

                {/* Imagens de estado: ferido e morto */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <ImageUploadCircle
                      src={form.imagensEstado?.ferido}
                      label="Ferido (≤30% HP)"
                      onClick={() => imgFerido.current?.click()}
                      onRemove={form.imagensEstado?.ferido ? () => handleRemoveImagemEstado('ferido') : undefined}
                      size={60}
                      tint="gold"
                      fallbackIcon="🤕"
                    />
                    <input ref={imgFerido} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => handleImageEstadoUpload(e, 'ferido')} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <ImageUploadCircle
                      src={form.imagensEstado?.morto}
                      label="Morto (0 HP)"
                      onClick={() => imgMorto.current?.click()}
                      onRemove={form.imagensEstado?.morto ? () => handleRemoveImagemEstado('morto') : undefined}
                      size={60}
                      tint="blood"
                      fallbackIcon="💀"
                    />
                    <input ref={imgMorto} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => handleImageEstadoUpload(e, 'morto')} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', textAlign: 'center', marginTop: 8, lineHeight: 1.4 }}>
                  Sem foto de estado, o app aplica efeito automático na imagem principal.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input label="Nome *" value={form.nome} onChange={e => update('nome', e.target.value)} placeholder="Nome do personagem" maxLength={50} />
                <Input label="Raça" value={form.raca} onChange={e => update('raca', e.target.value)} placeholder="Ex: Humano, Elfo..." maxLength={40} />
                <Input label="Classe" value={form.classe} onChange={e => update('classe', e.target.value)} placeholder="Ex: Guerreiro, Mago..." maxLength={40} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Input label="Nível" type="number" min={1} max={100} value={form.nivel} onChange={e => {
                    const valor = Number(e.target.value)
                    update('nivel', Number.isFinite(valor) ? Math.max(1, Math.min(100, Math.trunc(valor))) : 1)
                  }} />
                  {souDono ? (
                    <Select label="Tipo" value={form.tipo} onChange={e => update('tipo', e.target.value as TPersonagem['tipo'])}>
                      <option value="jogador">Jogador</option>
                      <option value="npc">NPC</option>
                      <option value="monstro">Monstro</option>
                    </Select>
                  ) : (
                    <Input label="Tipo" value="Jogador" disabled />
                  )}
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelTitle>HP &amp; Progressão</PanelTitle>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <HpBar atual={form.hpAtual} maximo={form.hpMaximo} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Input label="HP Atual" type="number" min={0} max={1000} value={form.hpAtual} onChange={e => {
                    const valor = Number(e.target.value)
                    update('hpAtual', Number.isFinite(valor) ? Math.max(0, Math.min(1000, valor)) : 0)
                  }} />
                  <Input label="HP Máximo" type="number" min={0} max={1000} value={form.hpMaximo} onChange={e => {
                    const valor = Number(e.target.value)
                    update('hpMaximo', Number.isFinite(valor) ? Math.max(0, Math.min(1000, valor)) : 0)
                  }} />
                </div>
                {form.tipo === 'jogador' && (
                  <>
                    <XpBar xp={form.xp} xpProximo={form.xpProximoNivel} nivel={form.nivel} />
                    <Input label="XP atual" type="number" min={0} max={999999} value={form.xp} onChange={e => {
                      const valor = Number(e.target.value)
                      update('xp', Number.isFinite(valor) ? Math.max(0, Math.min(999999, valor)) : 0)
                    }} />
                  </>
                )}
              </div>
            </Panel>
          </div>

          {/* Coluna direita */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Panel>
              <PanelTitle>Atributos</PanelTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 14 }}>
                {atrs.map(nome => {
                  const atr   = form.atributos.find(a => a.nome === nome)
                  const bonus = (form.bonusAtributos || [])
                    .filter((b: BonusAtributo) => b.atributo === nome)
                    .reduce((s: number, b: BonusAtributo) => s + b.valor, 0)
                  const total = (atr?.valor ?? 0) + bonus
                  return (
                    <div key={nome} style={{
                      background: 'var(--bg-card)', border: `1px solid ${bonus !== 0 ? 'var(--gold-dim)' : 'var(--line)'}`,
                      borderRadius: 8, padding: '10px 8px', textAlign: 'center', position: 'relative',
                    }}>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-faint)', marginBottom: 4 }}>{nome}</div>
                      <input
                        type="number" min={0} max={99} value={atr?.valor ?? 0}
                        onChange={e => updateAtributo(nome, Number(e.target.value))}
                        style={{ width: '100%', background: 'none', border: 'none', color: 'var(--ink)', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, outline: 'none' }}
                      />
                      {bonus !== 0 && (
                        <div style={{ fontSize: 10, color: bonus > 0 ? 'var(--moss)' : 'var(--blood)' }}>
                          {bonus > 0 ? '+' : ''}{bonus} bônus → <b style={{ color: 'var(--gold)' }}>{total}</b>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bônus de atributos */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: 10 }}>
                  Bônus de itens &amp; habilidades
                </div>
                {(form.bonusAtributos || []).length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', textAlign: 'center', padding: '8px 0' }}>
                    Nenhum bônus ativo.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {(form.bonusAtributos || []).map((b: BonusAtributo) => (
                      <div key={b.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'var(--bg-card)', border: '1px solid var(--line)',
                        borderRadius: 7, padding: '7px 10px', fontSize: 13,
                      }}>
                        <span style={{ color: b.valor > 0 ? 'var(--moss)' : 'var(--blood)', fontFamily: 'var(--font-display)', fontWeight: 700, minWidth: 32 }}>
                          {b.valor > 0 ? '+' : ''}{b.valor}
                        </span>
                        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{b.atributo}</span>
                        <span style={{ color: 'var(--ink-faint)', flex: 1, fontSize: 12 }}>{b.origem}</span>
                        <span style={{ color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                          onClick={() => removeBonus(b.id)}>✕</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Adicionar bônus */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr auto', gap: 6, alignItems: 'end' }}>
                  <Select
                    label="Atributo"
                    value={novoBonus.atributo}
                    onChange={e => setNovoBonus(b => ({ ...b, atributo: e.target.value }))}
                  >
                    <option value="">—</option>
                    {atrs.map(a => <option key={a} value={a}>{a}</option>)}
                  </Select>
                  <Input
                    label="Valor"
                    type="number"
                    min={-99}
                    max={99}
                    value={novoBonus.valor}
                    onChange={e => {
                      const valor = Number(e.target.value)
                      setNovoBonus(b => ({ ...b, valor: Number.isFinite(valor) ? Math.max(-99, Math.min(99, valor)) : 0 }))
                    }}
                  />
                  <Input
                    label="Origem (item/habilidade)"
                    value={novoBonus.origem}
                    onChange={e => setNovoBonus(b => ({ ...b, origem: e.target.value }))}
                    placeholder="Ex: Anel da Guarda"
                    maxLength={40}
                  />
                  <Button size="sm" onClick={addBonus} disabled={!novoBonus.atributo || !novoBonus.origem} style={{ alignSelf: 'flex-end' }}>
                    +
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelTitle>Notas &amp; história</PanelTitle>
              <Textarea
                value={form.notas}
                onChange={e => update('notas', e.target.value)}
                placeholder="Descrição, história, traços de personalidade, segredos..."
                style={{ marginTop: 14, minHeight: 100 }}
                maxLength={3000}
              />
            </Panel>
          </div>
        </div>

        {/* Ataques e magias */}
        <Panel style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <PanelTitle>Ataques, armas &amp; magias</PanelTitle>
            <Button size="sm" variant="secondary" onClick={() => { setEditandoAtaque(newAtaque()); setAtaqueModal(true) }}>
              + Adicionar
            </Button>
          </div>
          {form.ataques.length === 0 ? (
            <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Nenhum ataque cadastrado ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.ataques.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 9, padding: '12px 14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.nome || '(sem nome)'}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                      {[a.dados, a.tipoDano, a.alcance].filter(Boolean).join(' · ')}
                      {a.custoRecurso && ` · ${a.custoRecurso}`}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setEditandoAtaque({ ...a, ...inferirCamposDado(a), ...inferirCustoRecurso(a) }); setAtaqueModal(true) }}>Editar</Button>
                  <Button size="sm" variant="danger-outline" onClick={() => removeAtaque(a.id)}>✕</Button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Inventário */}
        <Panel>
          <PanelTitle>Mochila &amp; inventário</PanelTitle>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, marginBottom: 12 }}>
            <input
              value={novoItem}
              onChange={e => setNovoItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Nome do item (pressione Enter para adicionar)"
              maxLength={80}
              style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)', fontSize: 13.5, padding: '9px 12px', outline: 'none' }}
            />
            <Button size="sm" onClick={addItem} disabled={!novoItem.trim()}>+ Adicionar</Button>
          </div>
          {inventario.length === 0 ? (
            <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Mochila vazia.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inventario.map((item: string, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8, padding: '9px 12px' }}>
                  {editandoItemIdx === idx ? (
                    <input
                      autoFocus
                      value={itemEditValor}
                      maxLength={80}
                      onChange={e => setItemEditValor(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { editItem(idx, itemEditValor); setEditandoItemIdx(null) }
                        if (e.key === 'Escape') setEditandoItemIdx(null)
                      }}
                      onBlur={() => { editItem(idx, itemEditValor); setEditandoItemIdx(null) }}
                      style={{ flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--gold-dim)', borderRadius: 6, color: 'var(--ink)', fontSize: 13.5, padding: '5px 8px', outline: 'none' }}
                    />
                  ) : (
                    <span
                      style={{ fontSize: 13.5, cursor: 'pointer', flex: 1, overflowWrap: 'anywhere' }}
                      title="Clique para editar"
                      onClick={() => { setEditandoItemIdx(idx); setItemEditValor(item) }}
                    >⬡ {item}</span>
                  )}
                  <span style={{ color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }} onClick={() => removeItem(idx)}>✕</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Modal editar ataque */}
      <Modal open={ataqueModal} onClose={() => setAtaqueModal(false)} title="Ataque / Magia / Habilidade" width={480}>
        {editandoAtaque && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input label="Nome" value={editandoAtaque.nome} onChange={e => setEditandoAtaque(a => a ? { ...a, nome: e.target.value } : a)} placeholder="Ex: Espada longa, Bola de Fogo..." maxLength={50} />
            <Select label="Tipo" value={editandoAtaque.tipo} onChange={e => setEditandoAtaque(a => a ? { ...a, tipo: e.target.value as Ataque['tipo'] } : a)}>
              <option value="arma_cac">Arma corpo a corpo</option>
              <option value="arma_distancia">Arma à distância</option>
              <option value="magia">Magia</option>
              <option value="habilidade">Habilidade especial</option>
            </Select>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink-faint)', marginBottom: 5 }}>
                Dados de dano
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 8 }}>
                Dá pra somar mais de um tipo de dado — algumas magias/habilidades rolam, por exemplo, "2d6+1d4".
                Clicar de novo no mesmo dado soma na linha já existente. {totalDadosAtaque}/{TOTAL_DADOS_MAX} dados no total.
              </div>

              {(editandoAtaque.dadoGrupos || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {(editandoAtaque.dadoGrupos || []).map((g, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 7,
                      padding: '5px 9px', fontFamily: 'var(--font-display)', fontSize: 13,
                    }}>
                      {g.qtd}d{g.lados}
                      <span style={{ color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 13 }} onClick={() => removeGrupoDado(idx)}>✕</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 8 }}>
                <Select
                  value={String(novoGrupoDado.lados)}
                  onChange={e => setNovoGrupoDado(g => ({ ...g, lados: Number(e.target.value) }))}
                >
                  {LADOS_DADO.map(l => <option key={l} value={l}>d{l}</option>)}
                </Select>
                <Input
                  type="number" min={1} max={50}
                  value={novoGrupoDado.qtd}
                  onChange={e => {
                    const valor = Number(e.target.value)
                    setNovoGrupoDado(g => ({ ...g, qtd: Number.isFinite(valor) ? Math.max(1, Math.min(50, Math.trunc(valor))) : 1 }))
                  }}
                />
                <Button size="sm" variant="secondary" onClick={addGrupoDado} disabled={totalDadosAtaque >= TOTAL_DADOS_MAX}>+ Dado</Button>
              </div>

              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink-faint)', margin: '14px 0 5px' }}>
                Bônus fixos
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 8 }}>
                Cada bônus precisa dizer de onde vem (Força, uma arma encantada, uma habilidade...) — evita um "+3" solto sem explicação
              </div>
              {(editandoAtaque.dadoBonusos || []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {(editandoAtaque.dadoBonusos || []).map(b => (
                    <div key={b.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 7,
                      padding: '6px 10px', fontSize: 12.5,
                    }}>
                      <span style={{ color: b.valor > 0 ? 'var(--moss)' : 'var(--blood)', fontFamily: 'var(--font-display)', fontWeight: 700, minWidth: 28 }}>
                        {b.valor > 0 ? '+' : ''}{b.valor}
                      </span>
                      <span style={{ flex: 1, color: 'var(--ink-dim)' }}>{b.origem}</span>
                      <span style={{ color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 14 }} onClick={() => removeBonusDado(b.id)}>✕</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: 8 }}>
                <Input
                  type="number" min={-50} max={50}
                  value={novoBonusDado.valor}
                  onChange={e => {
                    const valor = Number(e.target.value)
                    setNovoBonusDado(b => ({ ...b, valor: Number.isFinite(valor) ? Math.max(-50, Math.min(50, Math.trunc(valor))) : 0 }))
                  }}
                />
                <Input
                  value={novoBonusDado.origem}
                  onChange={e => setNovoBonusDado(b => ({ ...b, origem: e.target.value }))}
                  placeholder="Ex: Força, Espada +2 encantada..."
                  maxLength={30}
                />
                <Button size="sm" variant="secondary" onClick={addBonusDado} disabled={!novoBonusDado.origem.trim() || novoBonusDado.valor === 0}>+ Bônus</Button>
              </div>

              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 10 }}>
                Prévia: {formatDados(editandoAtaque.dadoGrupos || [], editandoAtaque.dadoBonusos || []) || '(sem dano — só rola acerto)'}
              </div>
            </div>
            <Select label="Tipo de dano" value={editandoAtaque.tipoDano} onChange={e => setEditandoAtaque(a => a ? { ...a, tipoDano: e.target.value } : a)}>
              <option value="">—</option>
              {opcoesAgrupadasComLegado(TIPOS_DANO_GRUPOS, editandoAtaque.tipoDano)}
            </Select>
            <Select label="Alcance" value={editandoAtaque.alcance} onChange={e => setEditandoAtaque(a => a ? { ...a, alcance: e.target.value } : a)}>
              <option value="">—</option>
              {optionsComLegado(ALCANCES, editandoAtaque.alcance).map(al => <option key={al} value={al}>{al}</option>)}
            </Select>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink-faint)', marginBottom: 5 }}>
                Custo de recurso
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 8 }}>
                <Input
                  type="number" min={0} max={99}
                  value={editandoAtaque.custoRecursoQtd ?? 0}
                  disabled={!TIPOS_RECURSO_COM_QTD.has(editandoAtaque.custoRecursoTipo ?? 'Nenhum')}
                  onChange={e => {
                    const valor = Number(e.target.value)
                    setEditandoAtaque(a => a ? { ...a, custoRecursoQtd: Number.isFinite(valor) ? Math.max(0, Math.min(99, Math.trunc(valor))) : 0 } : a)
                  }}
                />
                <Select
                  value={editandoAtaque.custoRecursoTipo ?? 'Nenhum'}
                  onChange={e => setEditandoAtaque(a => a ? {
                    ...a, custoRecursoTipo: e.target.value,
                    custoRecursoQtd: TIPOS_RECURSO_COM_QTD.has(e.target.value) ? (a.custoRecursoQtd || 1) : 0,
                  } : a)}
                >
                  <option value="Nenhum">Nenhum</option>
                  {opcoesAgrupadasComLegado(RECURSO_GRUPOS, (editandoAtaque.custoRecursoTipo ?? 'Nenhum') === 'Nenhum' ? '' : (editandoAtaque.custoRecursoTipo ?? ''))}
                </Select>
              </div>
            </div>
            <Select label="Recarga" value={editandoAtaque.recarga || ''} onChange={e => setEditandoAtaque(a => a ? { ...a, recarga: e.target.value } : a)}>
              <option value="">—</option>
              {opcoesAgrupadasComLegado(RECARGA_GRUPOS, editandoAtaque.recarga || '')}
            </Select>
            <Textarea label="Descrição / efeito" value={editandoAtaque.descricao || ''} onChange={e => setEditandoAtaque(a => a ? { ...a, descricao: e.target.value } : a)} placeholder="O que acontece quando usa?" maxLength={1000} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <Button variant="ghost" onClick={() => setAtaqueModal(false)}>Cancelar</Button>
              <Button onClick={saveAtaque} disabled={!editandoAtaque.nome.trim()}>Salvar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={confirmSairAberto} onClose={cancelarSaida} title="Alterações não salvas" width={420}>
        <div style={{ fontSize: 13.5, color: 'var(--ink-dim)', marginBottom: 20 }}>
          Você editou essa ficha e ainda não salvou. Se sair agora, essas alterações se perdem.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={cancelarSaida}>Continuar editando</Button>
          <Button variant="danger-outline" onClick={confirmarSaidaSemSalvar}>Sair sem salvar</Button>
          <Button onClick={() => { cancelarSaida(); handleSave() }} disabled={!form.nome.trim() || salvando}>
            Salvar alterações
          </Button>
        </div>
      </Modal>

      <Toast message={toastMsg || ''} visible={!!toastMsg} />
    </div>
  )
}

// ── FichaPersonagem (visualização) ────────────────────────────────────
export const FichaPersonagem: React.FC = () => {
  const { donoUid: dUid, id, personagemId: pid } = useParams<{ donoUid: string; id: string; personagemId: string }>()
  const donoUid = dUid!
  const mesaId = id!
  const personagemId = pid!
  const meuUid = auth.currentUser!.uid
  const souDono = donoUid === meuUid
  const navigate = useNavigate()
  const [personagem, setPersonagem] = useState<TPersonagem | null>(null)
  const [mesaNome, setMesaNome] = useState('')

  useEffect(() => {
    Promise.all([getMesa(donoUid, mesaId), getPersonagem(donoUid, mesaId, personagemId)]).then(([m, p]) => {
      if (m) setMesaNome(m.nome)
      if (p) setPersonagem(p)
    }).catch(err => {
      // Acesso negado de verdade (ex: removido da mesa, ficha desvinculada) — não
      // é sessão inválida, não desloga ninguém (ver db/index.ts, guarded()).
      if ((err as { code?: string })?.code === 'permission-denied') {
        sessionStorage.setItem(ACESSO_REVOGADO_KEY, '1')
        navigate('/jogos', { replace: true })
        return
      }
      throw err
    })
  }, [donoUid, mesaId, personagemId, navigate])

  if (!personagem) return null
  const podeEditar = souDono || personagem.jogadorUid === meuUid
  const inventario: string[] = (personagem as any).inventario || []

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>
      <Topbar
        crumbs={[{ label: 'Início', to: '/' }, { label: mesaNome, to: `/mesa/${donoUid}/${mesaId}` }, { label: personagem.nome }]}
        right={podeEditar
          ? <Button size="sm" onClick={() => navigate(`/mesa/${donoUid}/${mesaId}/personagem/${personagemId}/editar`)}>✎ Editar ficha</Button>
          : undefined}
      />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '26px 32px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
        <Panel style={{ alignSelf: 'start' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            {personagem.imagemUrl ? (
              <img src={personagem.imagemUrl} alt={personagem.nome} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold)', margin: '0 auto 12px', display: 'block' }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px', background: 'var(--gold-dim)', border: '2px solid var(--gold)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--bg-deep)', fontSize: 28 }}>
                {personagem.nome[0]}
              </div>
            )}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{personagem.nome}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 6 }}>{personagem.raca} · {personagem.classe}</div>
            {souDono && personagem.tipo === 'jogador' && (
              <div style={{ fontSize: 11.5, color: personagem.jogadorUid ? 'var(--gold)' : 'var(--ink-faint)' }}>
                {personagem.jogadorUid ? `Pertence a: ${personagem.jogadorNome || 'conta vinculada'}` : 'Slot livre — ninguém vinculado'}
              </div>
            )}
          </div>
          <HpBar atual={personagem.hpAtual} maximo={personagem.hpMaximo} />
          {personagem.tipo === 'jogador' && <div style={{ marginTop: 12 }}><XpBar xp={personagem.xp} xpProximo={personagem.xpProximoNivel} nivel={personagem.nivel} /></div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            {personagem.atributos.map(a => (
              <div key={a.nome} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-faint)' }}>{a.nome}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{a.valor}</div>
              </div>
            ))}
          </div>
        </Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel>
            <PanelTitle>Ataques &amp; habilidades</PanelTitle>
            {personagem.ataques.length === 0 ? (
              <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                Nenhum ataque cadastrado.
                {podeEditar && (
                  <> <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => navigate(`/mesa/${donoUid}/${mesaId}/personagem/${personagemId}/editar`)}>Editar ficha →</span></>
                )}
              </div>
            ) : personagem.ataques.map(a => (
              <div key={a.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 9, padding: '12px 14px', marginTop: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 3 }}>{[a.dados, a.tipoDano, a.alcance].filter(Boolean).join(' · ')}</div>
                {a.descricao && <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>{a.descricao}</div>}
              </div>
            ))}
          </Panel>
          <Panel>
            <PanelTitle>Mochila</PanelTitle>
            {inventario.length === 0 ? (
              <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Mochila vazia.</div>
            ) : inventario.map((item: string, idx: number) => (
              <div key={idx} style={{ fontSize: 13.5, padding: '7px 0', borderBottom: '1px solid var(--line)', color: 'var(--ink-dim)' }}>⬡ {item}</div>
            ))}
          </Panel>
          <Panel>
            <PanelTitle>Notas</PanelTitle>
            <div style={{ fontSize: 13.5, color: 'var(--ink-dim)', marginTop: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {personagem.notas || <span style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>Sem notas.</span>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
