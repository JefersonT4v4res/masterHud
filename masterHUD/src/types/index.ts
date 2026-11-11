export type SystemType = 'dnd5e' | 'tormenta20' | 'custom'

export interface Mesa {
  id?: string
  nome: string
  descricao: string
  sistema: SystemType
  status: 'ativa' | 'pausada' | 'encerrada'
  criadaEm: string
  encerradaEm?: string | null
  imagemUrl?: string
  molde: MoldeMesa
  membros: string[]
  conviteCodigo?: string
}

// Doc em `convites/{codigo}` — resolve um código pra mesa sem precisar de query.
export interface Convite {
  donoUid: string
  mesaId: string
  mesaNome: string
  sistema: SystemType
  criadoEm: string
}

// Doc em `usuarios/{uid}/mesas/{mesaId}/resumo/jogadores` — projeção mínima e
// pública-entre-membros, só personagens tipo 'jogador'. Nunca inclui NPC/monstro
// nem campos além dos listados aqui (é isso que torna a privacidade real).
export interface ResumoJogador {
  id: string
  nome: string
  hpAtual: number
  hpMaximo: number
  imagemUrl?: string
  tipo: 'jogador'
}

// Doc em `usuarios/{meuUid}/mesasParticipando/{mesaId}` — índice pessoal de
// "em quais mesas eu entrei como jogador".
export interface MesaParticipando {
  donoUid: string
  personagemId?: string
  entradoEm: string
}

export interface BonusAtributo {
  id: string
  atributo: string       // ex: "Força", "FOR"
  valor: number          // pode ser negativo (penalidade)
  origem: string         // ex: "Anel da Guarda", "Magia de Endurecimento"
}

export interface Atributo {
  nome: string
  valor: number          // valor base
  abreviacao?: string    // ex: "FOR", "DES"
}

export interface Ataque {
  id: string
  nome: string
  tipo: 'arma_cac' | 'arma_distancia' | 'magia' | 'habilidade'
  // `dados` é gerado a partir de dadoGrupos/dadoBonusos (nunca digitado livre — era
  // assim que um texto tipo "100000000d999999999999" conseguia ser salvo). Continua
  // existindo como string porque é o formato que o roller (useDiceRoller) e o
  // histórico de rolagens leem; fichas antigas só têm `dados` (sem os campos
  // estruturados) e são reinterpretadas na edição via parseDiceExpression.
  dados: string
  dadoGrupos?: { lados: number; qtd: number }[]              // ex: [{lados:6,qtd:2},{lados:4,qtd:1}] = "2d6+1d4"
  dadoBonusos?: { id: string; valor: number; origem: string }[] // bônus fixos nomeados, ex: {valor:2, origem:"Força"}
  tipoDano: string
  alcance: string
  // `custoRecurso` é gerado a partir de custoRecursoQtd/custoRecursoTipo, mesmo
  // padrão do `dados` acima — existe como string pronta pra exibir na lista de
  // ataques sem precisar montar o texto toda vez.
  custoRecurso?: string
  custoRecursoQtd?: number
  custoRecursoTipo?: string
  recarga?: string
  descricao?: string
}

export interface Personagem {
  id?: string
  nome: string
  raca: string
  classe: string
  nivel: number
  xp: number
  xpProximoNivel: number
  hpAtual: number
  hpMaximo: number
  tipo: 'jogador' | 'npc' | 'monstro'
  status: 'vivo' | 'morto' | 'inconsciente'
  atributos: Atributo[]
  bonusAtributos: BonusAtributo[]   // bônus de itens/habilidades
  ataques: Ataque[]
  pericias: Record<string, number>
  inventario: string[]
  notas: string
  imagemUrl?: string
  imagensEstado?: {
    normal?: string
    ferido?: string
    morto?: string
  }
  criadoEm: string
  atualizadoEm: string
  // uid do jogador dono dessa ficha. null = slot 'jogador' ainda não reivindicado.
  // Sempre undefined/ausente em NPCs e monstros.
  jogadorUid?: string | null
  // Nome de exibição de quem reivindicou essa ficha, gravado pelo próprio jogador no
  // momento do vínculo (claim) — o mestre não tem permissão de ler o perfil de outra
  // conta no Firestore, então sem isso não haveria como mostrar "vinculado a fulano".
  jogadorNome?: string | null
}

// Calcula o valor total de um atributo (base + todos os bônus)
export function calcAtributo(personagem: Personagem, nomeAtributo: string): number {
  const base = personagem.atributos.find(a =>
    a.nome === nomeAtributo || a.abreviacao === nomeAtributo
  )?.valor ?? 0
  const bonus = (personagem.bonusAtributos || [])
    .filter(b => b.atributo === nomeAtributo || b.atributo === nomeAtributo)
    .reduce((sum, b) => sum + b.valor, 0)
  return base + bonus
}

// Imagem a exibir pro estado atual do personagem — cai pra `imagemUrl` quando não
// há imagem específica de estado (ou quando o personagem está vivo e saudável).
export function imagemAtual(p: Pick<Personagem, 'imagemUrl' | 'imagensEstado' | 'hpAtual' | 'hpMaximo' | 'status'>): string | undefined {
  if ((p.status === 'morto' || p.hpAtual <= 0) && p.imagensEstado?.morto) return p.imagensEstado.morto
  if (p.hpMaximo > 0 && p.hpAtual / p.hpMaximo <= 0.3 && p.imagensEstado?.ferido) return p.imagensEstado.ferido
  return p.imagemUrl
}

export interface CombatParticipant {
  personagemId: string
  iniciativa: number
  ordemTurno: number
}

// Mantido só como tipo — usado localmente em FilaItem (location.state do router),
// não é persistido hoje (ver README, "O que falta").
export interface Combate {
  id?: string
  rodada: number
  turnoAtual: number
  participantes: CombatParticipant[]
  status: 'preparando' | 'emandamento' | 'encerrado'
  iniciadoEm: string
}

export interface MoldeArmasMagias {
  armas: { dados: boolean; tipoDano: boolean; alcance: boolean; custo: boolean }
  magias: { dados: boolean; tipoDano: boolean; alcance: boolean; custo: boolean; recarga: boolean }
}

export interface MoldeMesa {
  atributos: string[]
  camposLivres: string[]
  moldeArmasMagias: MoldeArmasMagias
}

// XP necessário por nível (D&D 5e como referência padrão)
export const XP_POR_NIVEL: Record<number, number> = {
  1: 300, 2: 900, 3: 2700, 4: 6500, 5: 14000,
  6: 23000, 7: 34000, 8: 48000, 9: 64000, 10: 85000,
}
