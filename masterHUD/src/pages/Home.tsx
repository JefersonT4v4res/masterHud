import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { UserMenu } from '../components/layout/UserMenu'
import { Button, Badge, Panel, Avatar } from '../components/ui'
import { getMesas } from '../db'
import { useAuth } from '../context/AuthContext'
import type { Mesa } from '../types'

const statusColor: Record<Mesa['status'], 'moss' | 'neutral' | 'blood'> = {
  ativa: 'moss', pausada: 'neutral', encerrada: 'blood',
}
const statusLabel: Record<Mesa['status'], string> = {
  ativa: '● Ativa', pausada: '⏸ Pausada', encerrada: '✕ Encerrada',
}

export const Home: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const nomeUsuario = user?.displayName || user?.email || 'Usuário'
  const [mesas, setMesas] = useState<Mesa[]>([])

  useEffect(() => { getMesas().then(setMesas) }, [])

  const ativas = mesas.filter(m => m.status === 'ativa')
  const pausadas = mesas.filter(m => m.status === 'pausada')

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar right={<UserMenu />} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 22 }}>
        {/* Conteúdo principal */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
            Bem-vindo, {nomeUsuario.split(' ')[0]}
          </div>
          <div style={{ color: 'var(--ink-dim)', fontSize: 14, marginBottom: 24 }}>
            Você tem <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{ativas.length} {ativas.length === 1 ? 'mesa ativa' : 'mesas ativas'}</span>
            {pausadas.length > 0 && ` e ${pausadas.length} pausada${pausadas.length > 1 ? 's' : ''}`}.
          </div>
          {/* Ações rápidas */}
          <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 14 }}>
            Ações rápidas
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 32 }}>
            {[
              { icon: '⬡', title: 'Criar personagem', desc: 'Ficha customizada ou baseada em sistema', to: '/personagem/novo' },
              { icon: '✦', title: 'Criar nova mesa', desc: 'Configure jogadores, sistema e cenário', to: '/mesa/nova' },
              { icon: '⌘', title: 'Suas mesas', desc: 'Ver e gerenciar todas as campanhas', to: '/jogos' },
            ].map(item => (
              <div key={item.title}
                onClick={() => navigate(item.to)}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--line)',
                  borderRadius: 11, padding: 18, cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold-dim)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
              >
                <div style={{ fontSize: 20, color: 'var(--gold)', marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>

          {/* Mesas recentes */}
          {mesas.length > 0 && (
            <>
              <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 14 }}>
                Suas mesas
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mesas.slice(0, 3).map(mesa => (
                  <div key={mesa.id}
                    onClick={() => navigate(`/mesa/${mesa.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: 'var(--bg-card)', border: '1px solid var(--line)',
                      borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: 'var(--gold-dim)', display: 'grid', placeItems: 'center',
                      fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--bg-deep)', fontSize: 16,
                      flexShrink: 0,
                    }}>
                      {mesa.nome[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{mesa.nome}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{mesa.descricao || 'Sem descrição'}</div>
                    </div>
                    <Badge color={statusColor[mesa.status]}>{statusLabel[mesa.status]}</Badge>
                    <span style={{ color: 'var(--ink-faint)' }}>→</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {mesas.length === 0 && (
            <Panel style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>Nenhuma mesa ainda</div>
              <div style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 20 }}>
                Crie sua primeira mesa para começar a organizar sua campanha.
              </div>
              <Button onClick={() => navigate('/mesa/nova')}>+ Criar primeira mesa</Button>
            </Panel>
          )}
        </div>

        {/* Sidebar perfil */}
        <Panel style={{ textAlign: 'center', alignSelf: 'start' }}>
          <div onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <Avatar nome={nomeUsuario} size={80} border="2px solid var(--gold)" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, marginBottom: 6 }}>{nomeUsuario}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 20 }}>
            {mesas.length} mesa{mesas.length !== 1 ? 's' : ''} criada{mesas.length !== 1 ? 's' : ''}
          </div>
          <div style={{ height: 1, background: 'var(--line)', marginBottom: 18 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Button style={{ width: '100%' }} onClick={() => navigate('/mesa/nova')}>+ Criar nova mesa</Button>
            <Button variant="secondary" style={{ width: '100%' }} onClick={() => navigate('/jogos')}>Ver todas as mesas</Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
