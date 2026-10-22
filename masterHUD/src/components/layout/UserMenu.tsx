import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui'
import { useAuth } from '../../context/AuthContext'

export const UserMenu: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const nome = user?.displayName || user?.email || 'Usuário'

  return (
    <div
      onClick={() => navigate('/perfil')}
      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
    >
      <Avatar nome={nome} size={32} />
      <span style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{nome}</span>
    </div>
  )
}
