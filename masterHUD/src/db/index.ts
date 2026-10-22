import Dexie, { Table } from 'dexie'
import type { Mesa, Personagem, Combate, MoldeMesa } from '../types'

export class MasterHudDB extends Dexie {
  mesas!: Table<Mesa>
  personagens!: Table<Personagem>
  combates!: Table<Combate>
  moldes!: Table<MoldeMesa>

  constructor() {
    super('MasterHudDB')
    this.version(1).stores({
      mesas:       '++id, status, criadaEm',
      personagens: '++id, mesaId, tipo, status',
      combates:    '++id, mesaId, status',
      moldes:      '++id, mesaId',
    })
  }
}

export const db = new MasterHudDB()

// Helpers de Mesa
export const getMesas = () => db.mesas.toArray()
export const getMesa = (id: number) => db.mesas.get(id)
export const createMesa = (mesa: Omit<Mesa, 'id'>) => db.mesas.add(mesa)
export const updateMesa = (id: number, changes: Partial<Mesa>) => db.mesas.update(id, changes)
export const deleteMesa = async (id: number) => {
  await db.personagens.where('mesaId').equals(id).delete()
  await db.combates.where('mesaId').equals(id).delete()
  await db.moldes.where('mesaId').equals(id).delete()
  await db.mesas.delete(id)
}

// Helpers de Personagem
export const getPersonagens = (mesaId: number) =>
  db.personagens.where('mesaId').equals(mesaId).toArray()
export const getPersonagem = (id: number) => db.personagens.get(id)
export const createPersonagem = (p: Omit<Personagem, 'id'>) => db.personagens.add(p)
export const updatePersonagem = (id: number, changes: Partial<Personagem>) =>
  db.personagens.update(id, changes)
export const deletePersonagem = (id: number) => db.personagens.delete(id)

// Helpers de Molde
export const getMolde = (mesaId: number) =>
  db.moldes.where('mesaId').equals(mesaId).first()
export const saveMolde = async (molde: MoldeMesa) => {
  const existing = await getMolde(molde.mesaId)
  if (existing?.id) return db.moldes.update(existing.id, molde)
  return db.moldes.add(molde)
}

// Helpers de Combate
export const getCombateAtivo = (mesaId: number) =>
  db.combates.where('mesaId').equals(mesaId).filter(c => c.status !== 'encerrado').first()
export const createCombate = (c: Omit<Combate, 'id'>) => db.combates.add(c)
export const updateCombate = (id: number, changes: Partial<Combate>) =>
  db.combates.update(id, changes)
