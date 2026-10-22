import React, { useEffect, useState } from 'react'
import { getPersonagens } from '../db'
import type { Personagem } from '../types'

// Determina qual variação de imagem usar baseada no % de HP
function getImageVariant(hpAtual: number, hpMaximo: number): 'normal' | 'hurt' | 'dead' {
  if (hpAtual <= 0) return 'dead'
  const pct = hpAtual / hpMaximo
  if (pct <= 0.3) return 'hurt'
  return 'normal'
}

function getHpColor(hpAtual: number, hpMaximo: number) {
  const pct = hpAtual / hpMaximo
  if (pct <= 0) return '#555'
  if (pct <= 0.3) return 'var(--blood)'
  if (pct <= 0.6) return 'var(--gold)'
  return 'var(--moss)'
}

interface StreamPersonagemProps {
  personagem: Personagem
}

const StreamPersonagem: React.FC<StreamPersonagemProps> = ({ personagem: p }) => {
  const variant = getImageVariant(p.hpAtual, p.hpMaximo)
  const hpPct = Math.max(0, Math.min(100, (p.hpAtual / p.hpMaximo) * 100))
  const isDead = variant === 'dead'
  const isHurt = variant === 'hurt'

  // Seleciona imagem baseada no estado — usa imagemUrl base + sufixo de variante
  // Convenção: imagemUrl_hurt.jpg, imagemUrl_dead.jpg (ou usa a base se não tiver variante)
  // O usuário pode definir imageUrls separadas por estado no futuro
  const displayImg = p.imagemUrl || null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: 160,
      filter: isDead ? 'grayscale(1)' : isHurt ? 'saturate(0.6) brightness(0.85)' : 'none',
      transition: 'filter 0.5s',
    }}>
      {/* Avatar */}
      <div style={{
        width: 120, height: 120, borderRadius: '50%',
        border: `3px solid ${getHpColor(p.hpAtual, p.hpMaximo)}`,
        overflow: 'hidden',
        boxShadow: `0 0 0 2px var(--bg-deep), 0 0 20px ${getHpColor(p.hpAtual, p.hpMaximo)}44`,
        marginBottom: 10,
        transition: 'border-color 0.5s, box-shadow 0.5s',
        position: 'relative',
      }}>
        {displayImg ? (
          <img src={displayImg} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'var(--gold-dim)',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            color: 'var(--bg-deep)', fontSize: 36,
          }}>
            {p.nome[0]}
          </div>
        )}
        {isDead && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid', placeItems: 'center',
            fontSize: 36,
          }}>💀</div>
        )}
      </div>

      {/* Nome */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 16, fontWeight: 600,
        color: isDead ? 'var(--ink-faint)' : 'var(--ink)',
        marginBottom: 6,
      }}>
        {p.nome}
      </div>

      {/* Status badge */}
      {(isDead || isHurt) && (
        <div style={{
          fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5,
          padding: '2px 8px', borderRadius: 20, marginBottom: 6,
          background: isDead ? 'rgba(193,62,62,0.2)' : 'rgba(232,163,61,0.15)',
          color: isDead ? '#e07a7a' : 'var(--gold)',
          border: `1px solid ${isDead ? 'var(--blood-dim)' : 'var(--gold-dim)'}`,
        }}>
          {isDead ? 'Morto' : 'Ferido'}
        </div>
      )}

      {/* HP bar */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: 'var(--ink-faint)' }}>
          <span>HP</span>
          <span style={{ color: getHpColor(p.hpAtual, p.hpMaximo), fontWeight: 600 }}>
            {p.hpAtual} / {p.hpMaximo}
          </span>
        </div>
        <div style={{ height: 8, background: '#11141d', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${hpPct}%`,
            background: getHpColor(p.hpAtual, p.hpMaximo),
            borderRadius: 4,
            transition: 'width 0.5s, background 0.5s',
          }} />
        </div>
      </div>
    </div>
  )
}

interface StreamOverlayProps {
  mesaId: number
}

export const StreamOverlay: React.FC<StreamOverlayProps> = ({ mesaId }) => {
  const [jogadores, setJogadores] = useState<Personagem[]>([])

  useEffect(() => {
    const load = () => getPersonagens(mesaId).then(ps => setJogadores(ps.filter(p => p.tipo === 'jogador')))
    load()
    // Atualiza a cada 3 segundos para refletir mudanças de HP em tempo real
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [mesaId])

  if (jogadores.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      gap: 24,
      flexWrap: 'wrap',
      justifyContent: 'center',
      padding: 24,
      background: 'rgba(22,27,39,0.92)',
      backdropFilter: 'blur(8px)',
      borderRadius: 16,
      border: '1px solid var(--line)',
    }}>
      {jogadores.map(p => <StreamPersonagem key={p.id} personagem={p} />)}
    </div>
  )
}

// Página de stream — abre em janela separada, otimizada para OBS/captura
export const StreamPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search)
  const mesaId = Number(params.get('mesa') || 0)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'transparent', // transparente para key de chroma no OBS
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      padding: 20,
    }}>
      {mesaId ? (
        <StreamOverlay mesaId={mesaId} />
      ) : (
        <div style={{ color: 'var(--ink-faint)', fontSize: 14 }}>
          Adicione ?mesa=ID na URL
        </div>
      )}
    </div>
  )
}
