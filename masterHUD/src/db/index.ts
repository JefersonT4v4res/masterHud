import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import type { Convite, Mesa, MesaParticipando, MoldeMesa, Personagem, ResumoJogador } from '../types'
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
const mesaDoc = (donoUid: string, mesaId: string) => doc(db, 'usuarios', donoUid, 'mesas', mesaId)
const personagensCol = (donoUid: string, mesaId: string) =>
  collection(db, 'usuarios', donoUid, 'mesas', mesaId, 'personagens')
const personagemDoc = (donoUid: string, mesaId: string, personagemId: string) =>
  doc(db, 'usuarios', donoUid, 'mesas', mesaId, 'personagens', personagemId)
const resumoDoc = (donoUid: string, mesaId: string) => doc(db, 'usuarios', donoUid, 'mesas', mesaId, 'resumo', 'jogadores')
const conviteDoc = (codigo: string) => doc(db, 'convites', codigo)
const mesaParticipandoDoc = (mesaId: string) => doc(db, 'usuarios', uid(), 'mesasParticipando', mesaId)

// Recalcula a projeção pública (só jogadores, só os campos não-sensíveis) —
// só o dono consegue (é o único que enxerga o elenco inteiro pra recalcular certo).
async function refreshResumo(donoUid: string, mesaId: string): Promise<void> {
  if (donoUid !== uid()) return
  const snap = await getDocs(personagensCol(donoUid, mesaId))
  const jogadores: ResumoJogador[] = snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<Personagem, 'id'>) }))
    .filter(p => p.tipo === 'jogador')
    .map(p => ({
      id: p.id!, nome: p.nome, hpAtual: p.hpAtual, hpMaximo: p.hpMaximo, tipo: 'jogador',
      ...(p.imagemUrl ? { imagemUrl: p.imagemUrl } : {}),
    }))
  await setDoc(resumoDoc(donoUid, mesaId), { jogadores })
}

// ── Mesa ─────────────────────────────────────────────────────────────
export const getMesas = guarded(async (): Promise<Mesa[]> => {
  const snap = await getDocs(mesasCol())
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Mesa, 'id'>) }))
})

export const getMesa = guarded(async (donoUid: string, mesaId: string): Promise<Mesa | undefined> => {
  const snap = await getDoc(mesaDoc(donoUid, mesaId))
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Mesa, 'id'>) } : undefined
})

export const createMesa = guarded(async (mesa: Omit<Mesa, 'id'>): Promise<string> => {
  const ref = await addDoc(mesasCol(), mesa)
  return ref.id
})

export const updateMesa = guarded((donoUid: string, mesaId: string, changes: Partial<Mesa>) =>
  updateDoc(mesaDoc(donoUid, mesaId), changes))

export const deleteMesa = guarded(async (mesaId: string): Promise<void> => {
  const donoUid = uid()
  const personagensSnap = await getDocs(personagensCol(donoUid, mesaId))
  const batch = writeBatch(db)
  personagensSnap.docs.forEach(d => batch.delete(d.ref))
  batch.delete(resumoDoc(donoUid, mesaId))
  batch.delete(mesaDoc(donoUid, mesaId))
  await batch.commit()
})

// ── Molde (embutido na Mesa) ────────────────────────────────────────
// updateMesa já é guarded — não precisa envolver de novo aqui.
export const saveMolde = (donoUid: string, mesaId: string, molde: MoldeMesa) =>
  updateMesa(donoUid, mesaId, { molde })

// ── Personagem ───────────────────────────────────────────────────────
export const getPersonagens = guarded(async (donoUid: string, mesaId: string): Promise<Personagem[]> => {
  const snap = await getDocs(personagensCol(donoUid, mesaId))
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Personagem, 'id'>) }))
})

export const getPersonagem = guarded(async (donoUid: string, mesaId: string, personagemId: string): Promise<Personagem | undefined> => {
  const snap = await getDoc(personagemDoc(donoUid, mesaId, personagemId))
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Personagem, 'id'>) } : undefined
})

// As regras do Firestore negam a query INTEIRA (não filtram por documento) se ela puder
// retornar algo que o usuário não tem permissão de ler — por isso um membro não-dono não
// pode usar getPersonagens() direto (a coleção também tem NPCs). Os filtros abaixo espelham
// exatamente a condição de leitura liberada pra slot não reivindicado nas regras.
export const getSlotsLivres = guarded(async (donoUid: string, mesaId: string): Promise<Personagem[]> => {
  const q = query(personagensCol(donoUid, mesaId), where('tipo', '==', 'jogador'), where('jogadorUid', '==', null))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Personagem, 'id'>) }))
})

export const createPersonagem = guarded(async (donoUid: string, mesaId: string, p: Omit<Personagem, 'id'>): Promise<string> => {
  const ref = await addDoc(personagensCol(donoUid, mesaId), p)
  if (p.tipo === 'jogador') await refreshResumo(donoUid, mesaId)
  return ref.id
})

export const updatePersonagem = guarded(async (donoUid: string, mesaId: string, personagemId: string, changes: Partial<Personagem>): Promise<void> => {
  await updateDoc(personagemDoc(donoUid, mesaId, personagemId), changes)
  await refreshResumo(donoUid, mesaId)
})

export const deletePersonagem = guarded(async (donoUid: string, mesaId: string, personagemId: string): Promise<void> => {
  await deleteDoc(personagemDoc(donoUid, mesaId, personagemId))
  await refreshResumo(donoUid, mesaId)
})

// ── Resumo (projeção pública entre membros) ───────────────────────────
export const getResumoJogadores = guarded(async (donoUid: string, mesaId: string): Promise<ResumoJogador[]> => {
  const snap = await getDoc(resumoDoc(donoUid, mesaId))
  return snap.exists() ? ((snap.data().jogadores as ResumoJogador[]) || []) : []
})

// Exposto pra Gerenciador.tsx recalcular a cada carregamento (não só quando o
// próprio mestre edita um personagem) — assim reflete edições feitas pelo jogador.
export const refreshResumoJogadores = guarded(refreshResumo)

// ── Convite / entrada em mesa de outra conta ──────────────────────────
export const resolveConvite = guarded(async (codigo: string): Promise<Convite | undefined> => {
  const snap = await getDoc(conviteDoc(codigo))
  return snap.exists() ? (snap.data() as Convite) : undefined
})

function gerarCodigo(): string {
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // sem 0/O/1/I pra evitar confusão
  let codigo = ''
  for (let i = 0; i < 6; i++) codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)]
  return codigo
}

export const getOrCreateConvite = guarded(async (mesaId: string): Promise<string> => {
  const donoUid = uid()
  const mesa = await getDoc(mesaDoc(donoUid, mesaId))
  const existente = mesa.data()?.conviteCodigo as string | undefined
  if (existente) return existente

  const m = mesa.data() as Omit<Mesa, 'id'> | undefined
  if (!m) throw new Error('Mesa não encontrada.')

  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const codigo = gerarCodigo()
    try {
      await setDoc(conviteDoc(codigo), {
        donoUid, mesaId, mesaNome: m.nome, sistema: m.sistema, criadoEm: new Date().toISOString(),
      } as Convite)
      await updateMesa(donoUid, mesaId, { conviteCodigo: codigo })
      return codigo
    } catch {
      // código já existe (setDoc numa regra que só permite create) — tenta outro
      continue
    }
  }
  throw new Error('Não foi possível gerar um código. Tente novamente.')
})

export const entrarNaMesa = guarded(async (donoUid: string, mesaId: string): Promise<void> => {
  const meuUid = uid()
  const batch = writeBatch(db)
  batch.update(mesaDoc(donoUid, mesaId), { membros: arrayUnion(meuUid) })
  batch.set(mesaParticipandoDoc(mesaId), { donoUid, entradoEm: new Date().toISOString() } as MesaParticipando)
  await batch.commit()
})

// Registra qual personagem é "o meu" no índice pessoal — usado tanto ao reivindicar
// um slot já existente quanto ao criar uma ficha nova durante a entrada na mesa.
export const vincularPersonagemParticipando = guarded(async (mesaId: string, personagemId: string): Promise<void> => {
  await updateDoc(mesaParticipandoDoc(mesaId), { personagemId })
})

export const claimPersonagem = guarded(async (donoUid: string, mesaId: string, personagemId: string): Promise<void> => {
  const meuUid = uid()
  await updateDoc(personagemDoc(donoUid, mesaId, personagemId), { jogadorUid: meuUid })
  await updateDoc(mesaParticipandoDoc(mesaId), { personagemId })
})

export const getMesasParticipando = guarded(async (): Promise<(MesaParticipando & { mesaId: string })[]> => {
  const snap = await getDocs(collection(db, 'usuarios', uid(), 'mesasParticipando'))
  return snap.docs.map(d => ({ mesaId: d.id, ...(d.data() as MesaParticipando) }))
})

// Revoga o acesso de um jogador à mesa (só o dono pode). A ficha dele continua
// existindo, só perde o vínculo com a mesa — "sair"/reivindicar de novo fica
// pra uma rodada futura.
export const removerMembro = guarded((donoUid: string, mesaId: string, uidJogador: string) =>
  updateMesa(donoUid, mesaId, { membros: arrayRemove(uidJogador) } as unknown as Partial<Mesa>))
