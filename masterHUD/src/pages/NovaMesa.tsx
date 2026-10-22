import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { Button, Input, Textarea, Select, Panel, PanelTitle, Toast } from '../components/ui'
import { createMesa } from '../db'
import type { SystemType, MoldeMesa } from '../types'

const defaultMolde = (): MoldeMesa => ({
  atributos: ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma'],
  camposLivres: ['História & notas'],
  moldeArmasMagias: {
    armas:  { dados: true, tipoDano: true, alcance: true, custo: false },
    magias: { dados: true, tipoDano: true, alcance: true, custo: true, recarga: true },
  },
})

export const NovaMesa: React.FC = () => {
  const navigate = useNavigate()
  const [nome, setNome]           = useState('')
  const [descricao, setDescricao] = useState('')
  const [sistema, setSistema]     = useState<SystemType>('dnd5e')
  const [salvando, setSalvando]   = useState(false)
  const [toast, setToast]         = useState(false)

  const handleSubmit = async () => {
    if (!nome.trim()) return
    setSalvando(true)
    try {
      const id = await createMesa({
        nome: nome.trim(),
        descricao: descricao.trim(),
        sistema,
        status: 'ativa',
        criadaEm: new Date().toISOString(),
        molde: defaultMolde(),
      })

      setToast(true)
      setTimeout(() => navigate(`/mesa/${id}`), 1200)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar
        crumbs={[{ label: 'Início', to: '/' }, { label: 'Jogos', to: '/jogos' }, { label: 'Nova mesa' }]}
        right={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={() => navigate('/jogos')}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!nome.trim() || salvando}>
              {salvando ? 'Criando...' : 'Criar mesa'}
            </Button>
          </div>
        }
      />

      <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 32px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
          Criar nova mesa
        </div>
        <div style={{ color: 'var(--ink-dim)', fontSize: 13.5, marginBottom: 28 }}>
          Configure as informações básicas. Você pode editar o molde de fichas depois.
        </div>

        <Panel style={{ marginBottom: 18 }}>
          <PanelTitle>Informações da mesa</PanelTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            <Input label="Nome da mesa *" placeholder="Ex: A Maldição de Eldrenor" value={nome} onChange={e => setNome(e.target.value)} />
            <Textarea label="Descrição" placeholder="Uma breve descrição da campanha..." value={descricao} onChange={e => setDescricao(e.target.value)} style={{ minHeight: 80 }} />
          </div>
        </Panel>

        <Panel>
          <PanelTitle>Base do sistema</PanelTitle>
          <div style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginBottom: 16, marginTop: 4 }}>
            Sistemas conhecidos têm cálculo automático de level up. Customizado dá total liberdade.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { value: 'dnd5e' as SystemType, label: 'Sistema conhecido', desc: 'Usa regras prontas com cálculos automáticos de progressão.' },
              { value: 'custom' as SystemType, label: 'Sistema customizado', desc: 'Você define tudo: atributos, perícias, progressão.' },
            ].map(opt => (
              <div key={opt.value}
                onClick={() => setSistema(opt.value)}
                style={{
                  background: sistema === opt.value ? 'linear-gradient(135deg,#2e2818,var(--bg-card))' : 'var(--bg-card)',
                  border: `2px solid ${sistema === opt.value ? 'var(--gold)' : 'var(--line)'}`,
                  borderRadius: 11, padding: 16, cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: `2px solid ${sistema === opt.value ? 'var(--gold)' : 'var(--ink-faint)'}`,
                  marginBottom: 10, position: 'relative',
                }}>
                  {sistema === opt.value && (
                    <div style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: 'var(--gold)' }} />
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.4 }}>{opt.desc}</div>
              </div>
            ))}
          </div>

          {sistema === 'dnd5e' && (
            <Select label="Qual sistema?" value="dnd5e" onChange={() => {}}>
              <option value="dnd5e">D&D 5ª Edição</option>
              <option value="tormenta20">Tormenta20</option>
              <option value="coc">Call of Cthulhu</option>
            </Select>
          )}
        </Panel>
      </div>

      <Toast message="Mesa criada! Redirecionando..." visible={toast} />
    </div>
  )
}
