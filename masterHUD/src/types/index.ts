export type SystemType = 'dnd5e' | 'tormenta20' | 'custom'

export interface Mesa {
  id?: string
  nome: string
  descricao: string
  sistema: SystemType
  status: 'ativa' | 'pausada' | 'encerrada'
  criadaEm: string
  imagemUrl?: string
  molde: MoldeMesa
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
  dados: string          // agora aceita "1d6+1d4", "2d8+3", etc.
  tipoDano: string
  alcance: string
  custoRecurso?: string
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
