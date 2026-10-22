import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Panel } from './ui'
import { IconMail } from './icons'
import { useAuth } from '../context/AuthContext'

const COOLDOWN_SEGUNDOS = 60

export const VerifyEmailGate: React.FC = () => {
  const { user, logout, reloadUser, resendVerificationEmail } = useAuth()
  const navigate = useNavigate()

  const [cooldown, setCooldown] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [checando, setChecando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleReenviar = async () => {
    setErro(null)
    setMensagem(null)
    setEnviando(true)
    try {
      await resendVerificationEmail()
      setMensagem('Email reenviado. Confira sua caixa de entrada (e o spam).')
      setCooldown(COOLDOWN_SEGUNDOS)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível reenviar o email.')
    } finally {
      setEnviando(false)
    }
  }

  const handleJaVerifiquei = async () => {
    setErro(null)
    setMensagem(null)
    setChecando(true)
    try {
      await reloadUser()
    } finally {
      setChecando(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-deep)', padding: 24 }}>
      <Panel style={{ maxWidth: 440, textAlign: 'center' }}>
        <IconMail width={32} height={32} style={{ color: 'var(--gold)', marginBottom: 12 }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
          Verifique seu email
        </div>
        <div style={{ color: 'var(--ink-dim)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>
          Enviamos um link de confirmação para <strong style={{ color: 'var(--ink)' }}>{user?.email}</strong>.
          Clique no link e depois volte aqui.
        </div>

        {mensagem && <div style={{ color: 'var(--moss)', fontSize: 13, marginBottom: 12 }}>{mensagem}</div>}
        {erro && <div style={{ color: '#e07a7a', fontSize: 13, marginBottom: 12 }}>{erro}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button onClick={handleJaVerifiquei} disabled={checando}>
            {checando ? 'Verificando…' : 'Já verifiquei, continuar'}
          </Button>
          <Button variant="secondary" onClick={handleReenviar} disabled={enviando || cooldown > 0}>
            {cooldown > 0 ? `Reenviar email (${cooldown}s)` : enviando ? 'Enviando…' : 'Reenviar email'}
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </Panel>
    </div>
  )
}
