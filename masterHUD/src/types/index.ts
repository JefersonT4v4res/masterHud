export type SystemType = 'dnd5e' | 'tormenta20' | 'custom'

export interface Mesa {
  id?: number
  nome: string
  descricao: string
  sistema: SystemType
  status: 'ativa' | 'pausada' | 'encerrada'
  criadaEm: string
  imagemUrl?: string
}

export interface Atributo {
  nome: string
  valor: number
}

export interface Ataque {
  id: string
  nome: string
  tipo: 'arma_cac' | 'arma_distancia' | 'magia' | 'habilidade'
  dados: string
  tipoDano: string
  alcance: string
  custoRecurso?: string
  recarga?: string
  descricao?: string
}

export interface Personagem {
  id?: number
  mesaId: number
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
  ataques: Ataque[]
  pericias: Record<string, number>
  inventario: string[]
  notas: string
  imagemUrl?: string
  criadoEm: string
  atualizadoEm: string
}

export interface CombatParticipant {
  personagemId: number
  iniciativa: number
  ordemTurno: number
}

export interface Combate {
  id?: number
  mesaId: number
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
  id?: number
  mesaId: number
  atributos: string[]
  camposLivres: string[]
  moldeArmasMagias: MoldeArmasMagias
}

// XP necessário por nível (D&D 5e como referência padrão)
export const XP_POR_NIVEL: Record<number, number> = {
  1: 300, 2: 900, 3: 2700, 4: 6500, 5: 14000,
  6: 23000, 7: 34000, 8: 48000, 9: 64000, 10: 85000,
}
