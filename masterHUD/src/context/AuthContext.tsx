import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type ActionCodeSettings,
  type User,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  register: (email: string, password: string, nome: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshUser: () => void
  reloadUser: () => Promise<void>
  resendVerificationEmail: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Email inválido.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/user-not-found': 'Email ou senha incorretos.',
  'auth/wrong-password': 'Email ou senha incorretos.',
  'auth/invalid-credential': 'Email ou senha incorretos.',
  'auth/email-already-in-use': 'Já existe uma conta com esse email.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
  'auth/configuration-not-found': 'Login por email/senha não está habilitado no projeto Firebase (Authentication → Sign-in method).',
  'auth/password-does-not-meet-requirements': 'A senha não atende aos requisitos mínimos de segurança do Firebase.',
}

function traduzErro(err: unknown): Error {
  const code = (err as { code?: string })?.code
  if (code && AUTH_ERROR_MESSAGES[code]) return new Error(AUTH_ERROR_MESSAGES[code])
  if (err instanceof Error && err.message) return err
  return new Error('Não foi possível completar a ação. Tente novamente.')
}

// Depois de clicar no link do email, o Firebase confirma a verificação na própria página
// hospedada dele e então redireciona para cá — não precisamos tratar o link manualmente.
const verificationActionCodeSettings: ActionCodeSettings = {
  url: `${window.location.origin}/login`,
}

function withTimeout<T>(promise: Promise<T>, ms: number, mensagem: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(mensagem)), ms)),
  ])
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const register = async (email: string, password: string, nome: string) => {
    try {
      const { user: novoUsuario } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(novoUsuario, { displayName: nome })
      await withTimeout(
        setDoc(doc(db, 'usuarios', novoUsuario.uid), { nome, email, criadoEm: serverTimestamp() }),
        10000,
        'Conta criada, mas não foi possível salvar o perfil (Firestore demorou para responder). Verifique a configuração do Firestore.'
      )
      await sendEmailVerification(novoUsuario, verificationActionCodeSettings)
      refreshUser()
    } catch (err) {
      throw traduzErro(err)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      throw traduzErro(err)
    }
  }

  const logout = () => signOut(auth)

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (err) {
      throw traduzErro(err)
    }
  }

  const refreshUser = () => setUser(auth.currentUser ? { ...auth.currentUser } as User : null)

  const reloadUser = async () => {
    if (!auth.currentUser) return
    await auth.currentUser.reload()
    refreshUser()
  }

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return
    try {
      await sendEmailVerification(auth.currentUser, verificationActionCodeSettings)
    } catch (err) {
      throw traduzErro(err)
    }
  }

  return (
    <AuthContext.Provider value={{
      user, loading, register, login, logout, resetPassword, refreshUser, reloadUser, resendVerificationEmail,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa ser usado dentro de <AuthProvider>')
  return ctx
}
