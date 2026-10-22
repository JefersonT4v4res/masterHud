import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { Button, Badge, Panel } from '../components/ui'
import { getMesas } from '../db'
import type { Mesa } from '../types'

type Filtro = 'todas' | 'ativas' | 'pausadas' | 'encerradas'

const statusLabel: Record<Mesa['status'], string> = {
  ativa: '● Ativa', pausada: '⏸ Pausada', encerrada: '✕ Encerrada',
}
const statusColor: Record<Mesa['status'], 'moss' | 'neutral' | 'blood'> = {
  ativa: 'moss', pausada: 'neutral', encerrada: 'blood',
}
const sistemaLabel: Record<string, string> = {
  dnd5e: 'D&D 5e', tormenta20: 'Tormenta20', custom: 'Sistema customizado',
}

export const Jogos: React.FC = () => {
  const navigate = useNavigate()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busca, setBusca] = useState('')

  useEffect(() => { getMesas().then(setMesas) }, [])

  const filtroStatusMap: Record<Filtro, Mesa['status'] | null> = {
    todas: null,
    ativas: 'ativa',
    pausadas: 'pausada',
    encerradas: 'encerrada',
  }

  const filtradas = mesas.filter(m => {
    const statusFiltro = filtroStatusMap[filtro]
    const passaFiltro = statusFiltro === null || m.status === statusFiltro
    const passaBusca = m.nome.toLowerCase().includes(busca.toLowerCase())
    return passaFiltro && passaBusca
  })

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar
        crumbs={[{ label: 'Início', to: '/' }, { label: 'Jogos' }]}
        right={<Button size="sm" onClick={() => navigate('/mesa/nova')}>+ Criar nova mesa</Button>}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 22 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, marginBottom: 20 }}>
            Os meus jogos
          </div>

          {/* Search + filtros */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 14px',
            }}>
              <span style={{ color: 'var(--ink-faint)' }}>⚲</span>
              <input
                value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar pelo nome da mesa..."
                style={{ background: 'none', border: 'none', color: 'var(--ink)', fontSize: 14, width: '100%', outline: 'none' }}
              />
            </div>
            {(['todas', 'ativas', 'pausadas', 'encerradas'] as Filtro[]).map(f => (
              <button key={f} onClick={() => setFiltro(f)} style={{
                background: filtro === f ? 'rgba(232,163,61,0.08)' : 'var(--bg-card)',
                border: filtro === f ? '1px solid var(--gold-dim)' : '1px solid var(--line)',
                color: filtro === f ? 'var(--gold)' : 'var(--ink-dim)',
                fontSize: 13, padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                textTransform: 'capitalize',
              }}>{f}</button>
            ))}
          </div>

          {/* Lista de mesas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtradas.map(mesa => (
              <div key={mesa.id} style={{
                display: 'flex', gap: 18, alignItems: 'center',
                background: mesa.status === 'pausada' ? 'rgba(42,49,66,0.5)' : 'var(--bg-card)',
                border: '1px solid var(--line)', borderRadius: 12, padding: 18,
                opacity: mesa.status === 'pausada' ? 0.75 : 1, cursor: 'default',
              }}>
                <div style={{
                  width: 90, height: 90, borderRadius: 10, flexShrink: 0,
                  background: 'var(--gold-dim)', display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--bg-deep)', fontSize: 28,
                  filter: mesa.status === 'pausada' ? 'grayscale(0.5)' : 'none',
                }}>{mesa.nome[0]}</div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>{mesa.nome}</div>
                    <Badge color={mesa.sistema === 'custom' ? 'moss' : 'gold'}>
                      {sistemaLabel[mesa.sistema] || mesa.sistema}
                    </Badge>
                    {mesa.status !== 'ativa' && <Badge color={statusColor[mesa.status]}>{statusLabel[mesa.status]}</Badge>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 10 }}>
                    {mesa.descricao || 'Sem descrição'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                    Criada em {new Date(mesa.criadaEm).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {mesa.status === 'ativa' ? (
                    <>
                      <Button size="sm" onClick={() => navigate(`/mesa/${mesa.id}/combate`)}>Iniciar jogo</Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/mesa/${mesa.id}`)}>Gerenciar mesa</Button>
                    </>
                  ) : mesa.status === 'pausada' ? (
                    <>
                      <Button size="sm" variant="secondary">Reativar mesa</Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/mesa/${mesa.id}`)}>Gerenciar mesa</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/mesa/${mesa.id}`)}>Ver mesa</Button>
                  )}
                </div>
              </div>
            ))}

            {filtradas.length === 0 && (
              <Panel style={{ textAlign: 'center', padding: '40px 24px' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>
                  {busca ? 'Nenhuma mesa encontrada' : 'Nenhuma mesa nessa categoria'}
                </div>
                <div style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 20 }}>
                  {busca ? `Sem resultados para "${busca}".` : 'Crie uma nova mesa para começar.'}
                </div>
                {!busca && <Button onClick={() => navigate('/mesa/nova')}>+ Criar nova mesa</Button>}
              </Panel>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <Panel style={{ textAlign: 'center', alignSelf: 'start' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 14px',
            background: 'var(--gold-dim)', display: 'grid', placeItems: 'center',
            border: '2px solid var(--gold)', fontFamily: 'var(--font-display)',
            fontWeight: 700, color: 'var(--bg-deep)', fontSize: 28,
          }}>M</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, marginBottom: 18 }}>Mestre</div>
          <div style={{ height: 1, background: 'var(--line)', marginBottom: 18 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Button style={{ width: '100%' }} onClick={() => navigate('/mesa/nova')}>+ Criar nova mesa</Button>
            <Button variant="secondary" style={{ width: '100%' }}>Entrar numa mesa</Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
