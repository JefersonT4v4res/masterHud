import React from 'react'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Landing } from './Landing'
import { Home } from './Home'

export const Root: React.FC = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center',
        background: 'var(--bg-deep)', color: 'var(--ink-dim)', fontFamily: 'var(--font-body)',
      }}>
        Carregando…
      </div>
    )
  }

  if (!user) return <Landing />

  return (
    <ProtectedRoute>
      <Home />
    </ProtectedRoute>
  )
}
