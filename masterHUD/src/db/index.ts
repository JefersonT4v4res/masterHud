import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import type { Mesa, Personagem, MoldeMesa } from '../types'
import { auth, db } from '../firebase'

export const SESSION_EXPIRED_KEY = 'mh_session_expired'

function uid(): string {
  const u = auth.currentUser
  if (!u) throw new Error('Usuário não autenticado.')
  return u.uid
}

// Se uma chamada falhar porque a sessão não é mais válida (token expirado/revogado,
// ou a conta foi deslogada em outro lugar), força logout e sinaliza pra tela de
// login mostrar uma mensagem — em vez de deixar a tela travada com dado nenhum.
function guarded<Args extends unknown[], R>(fn: (...args: Args) => Promise<R>) {
  return async (...args: Args): Promise<R> => {
    try {
      return await fn(...args)
    } catch (err) {
      const code = (err as { code?: string })?.code
      const semSessao =
        code === 'permission-denied' ||
        code === 'unauthenticated' ||
        (err instanceof Error && err.message === 'Usuário não autenticado.')
      if (semSessao) {
        sessionStorage.setItem(SESSION_EXPIRED_KEY, '1')
        await signOut(auth)
      }
      throw err
    }
  }
}

const mesasCol = () => collection(db, 'usuarios', uid(), 'mesas')
const mesaDoc = (mesaId: string) => doc(db, 'usuarios', uid(), 'mesas', mesaId)
const personagensCol = (mesaId: string) => collection(db, 'usuarios', uid(), 'mesas', mesaId, 'personagens')
const personagemDoc = (mesaId: string, personagemId: string) =>
  doc(db, 'usuarios', uid(), 'mesas', mesaId, 'personagens', personagemId)

// ── Mesa ─────────────────────────────────────────────────────────────
export const getMesas = guarded(async (): Promise<Mesa[]> => {
  const snap = await getDocs(mesasCol())
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Mesa, 'id'>) }))
})

export const getMesa = guarded(async (mesaId: string): Promise<Mesa | undefined> => {
  const snap = await getDoc(mesaDoc(mesaId))
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Mesa, 'id'>) } : undefined
})

export const createMesa = guarded(async (mesa: Omit<Mesa, 'id'>): Promise<string> => {
  const ref = await addDoc(mesasCol(), mesa)
  return ref.id
})

export const updateMesa = guarded((mesaId: string, changes: Partial<Mesa>) =>
  updateDoc(mesaDoc(mesaId), changes))

export const deleteMesa = guarded(async (mesaId: string): Promise<void> => {
  const personagensSnap = await getDocs(personagensCol(mesaId))
  const batch = writeBatch(db)
  personagensSnap.docs.forEach(d => batch.delete(d.ref))
  batch.delete(mesaDoc(mesaId))
  await batch.commit()
})

// ── Molde (embutido na Mesa) ────────────────────────────────────────
// updateMesa já é guarded — não precisa envolver de novo aqui.
export const saveMolde = (mesaId: string, molde: MoldeMesa) =>
  updateMesa(mesaId, { molde })

// ── Personagem ───────────────────────────────────────────────────────
export const getPersonagens = guarded(async (mesaId: string): Promise<Personagem[]> => {
  const snap = await getDocs(personagensCol(mesaId))
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Personagem, 'id'>) }))
})

export const getPersonagem = guarded(async (mesaId: string, personagemId: string): Promise<Personagem | undefined> => {
  const snap = await getDoc(personagemDoc(mesaId, personagemId))
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Personagem, 'id'>) } : undefined
})

export const createPersonagem = guarded(async (mesaId: string, p: Omit<Personagem, 'id'>): Promise<string> => {
  const ref = await addDoc(personagensCol(mesaId), p)
  return ref.id
})

export const updatePersonagem = guarded((mesaId: string, personagemId: string, changes: Partial<Personagem>) =>
  updateDoc(personagemDoc(mesaId, personagemId), changes))

export const deletePersonagem = guarded((mesaId: string, personagemId: string) =>
  deleteDoc(personagemDoc(mesaId, personagemId)))
