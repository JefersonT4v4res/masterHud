import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { Topbar } from '../../components/layout/Topbar'
import { Button, Input, Panel, PanelTitle, Avatar, Toast } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { auth, db } from '../../firebase'

export const Perfil: React.FC = () => {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()

  const nomeAtual = user?.displayName || user?.email || 'Usuário'
  const [nome, setNome] = useState(user?.displayName || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [toast, setToast] = useState(false)

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.currentUser || !nome.trim()) return
    setErro(null)
    setSalvando(true)
    try {
      await updateProfile(auth.currentUser, { displayName: nome.trim() })
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { nome: nome.trim() })
      refreshUser()
      setToast(true)
      setTimeout(() => setToast(false), 2000)
    } catch {
      setErro('Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar crumbs={[{ label: 'Perfil' }]} />

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px' }}>
        <Panel style={{ textAlign: 'center', marginBottom: 20 }}>
          <Avatar nome={nomeAtual} size={84} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: '14px 0 2px' }}>
            {nomeAtual}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{user?.email}</div>
        </Panel>

        <Panel>
          <PanelTitle>Editar perfil</PanelTitle>
          <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
            <Input
              label="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
            <Input label="Email" value={user?.email || ''} disabled />
            {erro && <div style={{ color: '#e07a7a', fontSize: 13 }}>{erro}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 6 }}>
              <Button variant="danger-outline" type="button" onClick={handleLogout}>
                Sair
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </Panel>
      </div>

      <Toast message="Perfil atualizado" visible={toast} />
    </div>
  )
}
