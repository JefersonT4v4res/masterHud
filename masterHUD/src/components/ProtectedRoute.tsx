import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { VerifyEmailGate } from './VerifyEmailGate'

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  if (!user) return <Navigate to="/login" replace />

  if (!user.emailVerified) return <VerifyEmailGate />

  return <>{children}</>
}
