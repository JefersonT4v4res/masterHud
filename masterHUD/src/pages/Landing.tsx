import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { Button, Panel } from '../components/ui'
import masterhudIconLg from '../assets/masterhud-icon-lg.png'

const features = [
  {
    icon: '⌘',
    title: 'Gerenciador de mesas',
    desc: 'Organize jogadores, NPCs e status de cada campanha num só lugar.',
  },
  {
    icon: '⚔',
    title: 'Combate com iniciativa',
    desc: 'Controle turnos, rodadas e HP em tempo real durante a sessão.',
  },
  {
    icon: '⬡',
    title: 'Fichas completas',
    desc: 'Atributos, ataques, perícias e inventário para jogadores, NPCs e monstros.',
  },
  {
    icon: '🎬',
    title: 'Overlay para stream',
    desc: 'Mostre o status dos personagens ao vivo direto no OBS.',
  },
]

export const Landing: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button variant="secondary" onClick={() => navigate('/login')}>Entrar</Button>
          <Button onClick={() => navigate('/register')}>Cadastrar</Button>
        </div>
      } />

      {/* Hero */}
      <div style={{
        maxWidth: 760, margin: '0 auto', padding: '72px 32px 56px',
        textAlign: 'center',
      }}>
        <img
          src={masterhudIconLg}
          alt=""
          style={{ width: 80, height: 80, borderRadius: 16, marginBottom: 20 }}
        />
        <div style={{
          fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase',
          color: 'var(--gold)', marginBottom: 16,
        }}>
          Para mestres de RPG
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 600,
          margin: '0 0 18px', lineHeight: 1.15,
        }}>
          Conduza suas mesas sem perder o fio da narrativa
        </h1>
        <p style={{ color: 'var(--ink-dim)', fontSize: 16, lineHeight: 1.6, margin: '0 0 32px' }}>
          MasterHUD reúne mesas, fichas, combate e rolagem de dados numa única ferramenta,
          para você focar na história e não na planilha.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <Button size="md" onClick={() => navigate('/register')} style={{ padding: '12px 24px', fontSize: 14 }}>
            Criar conta grátis
          </Button>
          <Button variant="secondary" size="md" onClick={() => navigate('/login')} style={{ padding: '12px 24px', fontSize: 14 }}>
            Já tenho conta
          </Button>
        </div>
      </div>

      {/* Features */}
      <div style={{
        maxWidth: 1000, margin: '0 auto', padding: '0 32px 96px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16,
      }}>
        {features.map(f => (
          <Panel key={f.title} style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 22, color: 'var(--gold)', marginBottom: 12 }}>{f.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              {f.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1.5 }}>{f.desc}</div>
          </Panel>
        ))}
      </div>

      <div style={{
        textAlign: 'center', padding: '0 32px 48px',
        fontSize: 12, color: 'var(--ink-faint)',
      }}>
        MasterHUD — feito para mestres, por mestres.
      </div>
    </div>
  )
}
