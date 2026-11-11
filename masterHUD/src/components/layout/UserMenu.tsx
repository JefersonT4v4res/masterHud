import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Button, Modal } from '../ui'
import { useAuth } from '../../context/AuthContext'

export const UserMenu: React.FC = () => {
  const { user, perfil, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirmSair, setConfirmSair] = useState(false)
  const nome = user?.displayName || user?.email || 'Usuário'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
      >
        <Avatar nome={nome} src={perfil?.fotoUrl} size={32} />
        <span style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{nome}</span>
      </div>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 91,
            background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 10,
            boxShadow: '0 12px 30px rgba(0,0,0,0.4)', minWidth: 170, overflow: 'hidden',
          }}>
            <button
              onClick={() => { setOpen(false); navigate('/perfil') }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                color: 'var(--ink)', fontSize: 13.5, padding: '11px 14px', cursor: 'pointer',
              }}
            >Editar perfil</button>
            <button
              onClick={() => { setOpen(false); setConfirmSair(true) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                borderTop: '1px solid var(--line)', color: '#e07a7a', fontSize: 13.5, padding: '11px 14px', cursor: 'pointer',
              }}
            >Sair da conta</button>
          </div>
        </>
      )}

      <Modal open={confirmSair} onClose={() => setConfirmSair(false)} title="Sair da conta?" width={400}>
        <div style={{ fontSize: 13.5, color: 'var(--ink-dim)', marginBottom: 20 }}>
          Você será desconectado e voltará pra tela de login.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirmSair(false)}>Cancelar</Button>
          <Button variant="danger" onClick={handleLogout}>Sair</Button>
        </div>
      </Modal>
    </div>
  )
}
