import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { Topbar } from '../../components/layout/Topbar'
import { Button, Input, Textarea, Panel, PanelTitle, Avatar, Toast, Modal } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { auth, db } from '../../firebase'
import { resizeImageToBase64 } from '../../utils/imagem'

export const Perfil: React.FC = () => {
  const { user, perfil, logout, refreshUser, refreshPerfil } = useAuth()
  const navigate = useNavigate()
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const nomeAtual = user?.displayName || user?.email || 'Usuário'
  const [nome, setNome] = useState(user?.displayName || '')
  const [frase, setFrase] = useState(perfil?.frase || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [toast, setToast] = useState(false)
  const [confirmSair, setConfirmSair] = useState(false)

  useEffect(() => {
    if (perfil?.frase) setFrase(perfil.frase)
  }, [perfil])

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !auth.currentUser) return
    try {
      const base64 = await resizeImageToBase64(file)
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { fotoUrl: base64 })
      await refreshPerfil()
    } catch (err) {
      // O redimensionamento já reduz pra 160x160 antes de salvar, então o tamanho do
      // arquivo original quase nunca é a causa real — o mais comum é um formato que o
      // navegador não consegue decodificar (ex: HEIC de iPhone) ou falha de rede.
      console.error('Falha ao atualizar foto de perfil:', err)
      setErro('Não foi possível atualizar a foto. Tente outra imagem (JPG ou PNG) ou verifique sua conexão.')
    }
  }

  const handleRemoverFoto = async () => {
    if (!auth.currentUser) return
    await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { fotoUrl: '' })
    await refreshPerfil()
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.currentUser || !nome.trim()) return
    setErro(null)
    setSalvando(true)
    try {
      await updateProfile(auth.currentUser, { displayName: nome.trim() })
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { nome: nome.trim(), frase: frase.trim() })
      refreshUser()
      await refreshPerfil()
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
      <Topbar crumbs={[{ label: 'Início', to: '/' }, { label: 'Perfil' }]} />

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px' }}>
        <Panel style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            onClick={() => fotoInputRef.current?.click()}
            title="Trocar foto"
            style={{ display: 'inline-block', cursor: 'pointer', position: 'relative' }}
          >
            <Avatar nome={nomeAtual} src={perfil?.fotoUrl} size={84} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', color: 'var(--ink)', fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.15s',
            }}
              onMouseEnter={ev => (ev.currentTarget.style.opacity = '1')}
              onMouseLeave={ev => (ev.currentTarget.style.opacity = '0')}
            >Trocar</div>
            {perfil?.fotoUrl && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); handleRemoverFoto() }}
                title="Remover foto"
                style={{
                  position: 'absolute', top: -4, right: -4, width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--blood)', color: '#fff', border: '2px solid var(--bg-deep)',
                  fontSize: 13, lineHeight: 1, cursor: 'pointer', display: 'grid', placeItems: 'center',
                  zIndex: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                }}
              >✕</button>
            )}
          </div>
          <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />
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
            <Textarea
              label="Frase"
              value={frase}
              onChange={(e) => setFrase(e.target.value)}
              placeholder="Uma frase curta pra deixar seu perfil com a sua cara..."
              style={{ minHeight: 60 }}
              maxLength={140}
            />
            <Input label="Email" value={user?.email || ''} disabled />
            {erro && <div style={{ color: '#e07a7a', fontSize: 13 }}>{erro}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 6 }}>
              <Button variant="danger-outline" type="button" onClick={() => setConfirmSair(true)}>
                Sair
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </Panel>
      </div>

      <Modal open={confirmSair} onClose={() => setConfirmSair(false)} title="Sair da conta?" width={400}>
        <div style={{ fontSize: 13.5, color: 'var(--ink-dim)', marginBottom: 20 }}>
          Você será desconectado e voltará pra tela de login.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirmSair(false)}>Cancelar</Button>
          <Button variant="danger" onClick={handleLogout}>Sair</Button>
        </div>
      </Modal>

      <Toast message="Perfil atualizado" visible={toast} />
    </div>
  )
}
