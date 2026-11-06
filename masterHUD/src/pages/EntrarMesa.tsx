import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { Button, Input, Panel, PanelTitle, Avatar, HpBar } from '../components/ui'
import { claimPersonagem, entrarNaMesa, getSlotsLivres, resolveConvite } from '../db'
import type { Convite, Personagem } from '../types'

const sistemaLabel: Record<string, string> = {
  dnd5e: 'D&D 5e', tormenta20: 'Tormenta20', custom: 'Sistema customizado',
}

export const EntrarMesa: React.FC = () => {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [convite, setConvite] = useState<Convite | null>(null)
  const [entrando, setEntrando] = useState(false)
  const [slots, setSlots] = useState<Personagem[] | null>(null)
  const [reivindicando, setReivindicando] = useState<string | null>(null)

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigo.trim()) return
    setErro(null)
    setVerificando(true)
    try {
      const c = await resolveConvite(codigo.trim().toUpperCase())
      if (!c) {
        setErro('Código não encontrado. Confira com o mestre e tente de novo.')
        return
      }
      setConvite(c)
    } catch {
      setErro('Não foi possível verificar o código. Tente novamente.')
    } finally {
      setVerificando(false)
    }
  }

  const handleEntrar = async () => {
    if (!convite) return
    setEntrando(true)
    setErro(null)
    try {
      await entrarNaMesa(convite.donoUid, convite.mesaId)
      const livres = await getSlotsLivres(convite.donoUid, convite.mesaId)
      setSlots(livres)
    } catch {
      setErro('Não foi possível entrar na mesa. Tente novamente.')
    } finally {
      setEntrando(false)
    }
  }

  const handleEscolher = async (personagemId: string) => {
    if (!convite) return
    setReivindicando(personagemId)
    try {
      await claimPersonagem(convite.donoUid, convite.mesaId, personagemId)
      navigate(`/mesa/${convite.donoUid}/${convite.mesaId}`)
    } catch {
      setErro('Não foi possível vincular esse personagem. Tente novamente.')
      setReivindicando(null)
    }
  }

  const handleCriarNovo = () => {
    if (!convite) return
    navigate(`/mesa/${convite.donoUid}/${convite.mesaId}/personagem/novo?tipo=jogador`)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar crumbs={[{ label: 'Início', to: '/' }, { label: 'Jogos', to: '/jogos' }, { label: 'Entrar numa mesa' }]} />

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px' }}>
        {!convite && (
          <Panel>
            <PanelTitle>Entrar numa mesa</PanelTitle>
            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '4px 0 16px' }}>
              Peça o código de convite pro mestre da mesa.
            </div>
            <form onSubmit={handleBuscar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Código do convite"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="EX: AB3XK9"
                maxLength={6}
                style={{ textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', fontSize: 18 }}
                autoFocus
              />
              {erro && <div style={{ color: '#e07a7a', fontSize: 13 }}>{erro}</div>}
              <Button type="submit" disabled={!codigo.trim() || verificando}>
                {verificando ? 'Verificando…' : 'Buscar mesa'}
              </Button>
            </form>
          </Panel>
        )}

        {convite && !slots && (
          <Panel style={{ textAlign: 'center' }}>
            <PanelTitle>Você foi convidado para:</PanelTitle>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: '10px 0 4px' }}>
              {convite.mesaNome}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 20 }}>
              {sistemaLabel[convite.sistema] || convite.sistema}
            </div>
            {erro && <div style={{ color: '#e07a7a', fontSize: 13, marginBottom: 14 }}>{erro}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Button variant="ghost" onClick={() => setConvite(null)}>Cancelar</Button>
              <Button onClick={handleEntrar} disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar na mesa'}</Button>
            </div>
          </Panel>
        )}

        {convite && slots && (
          <Panel>
            <PanelTitle>Escolha seu personagem</PanelTitle>
            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '4px 0 16px' }}>
              {slots.length > 0
                ? 'Escolha uma ficha já criada pelo mestre, ou crie a sua própria.'
                : 'Nenhuma ficha disponível ainda — crie a sua.'}
            </div>
            {erro && <div style={{ color: '#e07a7a', fontSize: 13, marginBottom: 14 }}>{erro}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {slots.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--bg-card)', border: '1px solid var(--line)',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <Avatar nome={p.nome} src={p.imagemUrl} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.nome}</div>
                    <HpBar atual={p.hpAtual} maximo={p.hpMaximo} />
                  </div>
                  <Button size="sm" disabled={reivindicando === p.id} onClick={() => handleEscolher(p.id!)}>
                    {reivindicando === p.id ? 'Entrando…' : 'Escolher'}
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="secondary" style={{ width: '100%' }} onClick={handleCriarNovo}>
              + Criar novo personagem
            </Button>
          </Panel>
        )}
      </div>
    </div>
  )
}
