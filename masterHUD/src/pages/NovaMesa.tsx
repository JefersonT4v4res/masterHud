import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { Button, Input, Textarea, Select, Panel, PanelTitle, Toast } from '../components/ui'
import { createMesa } from '../db'
import { auth } from '../firebase'
import { resizeImageToBase64 } from '../utils/imagem'
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
  const [imagemUrl, setImagemUrl] = useState<string | undefined>(undefined)
  const [salvando, setSalvando]   = useState(false)
  const [toast, setToast]         = useState(false)
  const [erroImagem, setErroImagem] = useState<string | null>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  const handleImagemUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setErroImagem(null)
      setImagemUrl(await resizeImageToBase64(file))
    } catch (err) {
      console.error('Falha ao processar imagem da mesa:', err)
      setErroImagem('Não foi possível usar essa imagem. Tente outro arquivo (JPG ou PNG).')
    }
  }

  const handleSubmit = async () => {
    if (!nome.trim()) return
    setSalvando(true)
    try {
      const id = await createMesa({
        nome: nome.trim(),
        descricao: descricao.trim(),
        imagemUrl: imagemUrl || '',
        sistema,
        status: 'ativa',
        criadaEm: new Date().toISOString(),
        molde: defaultMolde(),
        membros: [],
      })

      setToast(true)
      setTimeout(() => navigate(`/mesa/${auth.currentUser!.uid}/${id}`), 1200)
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
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 16 }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div
                onClick={() => imgRef.current?.click()}
                title="Adicionar imagem"
                style={{
                  width: 80, height: 80, borderRadius: 10, border: '2px dashed var(--gold-dim)',
                  cursor: 'pointer', overflow: 'hidden', display: 'grid', placeItems: 'center',
                  background: 'var(--bg-card)', marginBottom: 6,
                }}
              >
                {imagemUrl ? (
                  <img src={imagemUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 22, color: 'var(--ink-faint)' }}>+</span>
                )}
              </div>
              <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagemUpload} />
              {imagemUrl && (
                <button type="button" onClick={() => setImagemUrl(undefined)}
                  style={{ fontSize: 11, color: 'var(--blood)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Remover
                </button>
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Nome da mesa *" placeholder="Ex: A Maldição de Eldrenor" value={nome} onChange={e => setNome(e.target.value)} maxLength={80} />
              <Textarea label="Descrição" placeholder="Uma breve descrição da campanha..." value={descricao} onChange={e => setDescricao(e.target.value)} style={{ minHeight: 80 }} maxLength={2000} />
              {erroImagem && <div style={{ color: '#e07a7a', fontSize: 12.5 }}>{erroImagem}</div>}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelTitle>Base do sistema</PanelTitle>
          <div style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginBottom: 16, marginTop: 4 }}>
            Sistemas conhecidos têm cálculo automático de level up. Customizado dá total liberdade.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { value: 'conhecido' as const, label: 'Sistema conhecido', desc: 'Usa regras prontas com cálculos automáticos de progressão.' },
              { value: 'custom' as const, label: 'Sistema customizado', desc: 'Você define tudo: atributos, perícias, progressão.' },
            ].map(opt => {
              const selecionado = opt.value === 'custom' ? sistema === 'custom' : sistema !== 'custom'
              return (
                <div key={opt.value}
                  onClick={() => setSistema(opt.value === 'custom' ? 'custom' : 'dnd5e')}
                  style={{
                    background: selecionado ? 'linear-gradient(135deg,#2e2818,var(--bg-card))' : 'var(--bg-card)',
                    border: `2px solid ${selecionado ? 'var(--gold)' : 'var(--line)'}`,
                    borderRadius: 11, padding: 16, cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: `2px solid ${selecionado ? 'var(--gold)' : 'var(--ink-faint)'}`,
                    marginBottom: 10, position: 'relative',
                  }}>
                    {selecionado && (
                      <div style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: 'var(--gold)' }} />
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.4 }}>{opt.desc}</div>
                </div>
              )
            })}
          </div>

          {sistema !== 'custom' && (
            <Select label="Qual sistema?" value={sistema} onChange={e => setSistema(e.target.value as SystemType)}>
              <option value="dnd5e">D&D 5ª Edição</option>
              <option value="tormenta20">Tormenta20</option>
            </Select>
          )}
        </Panel>
      </div>

      <Toast message="Mesa criada! Redirecionando..." visible={toast} />
    </div>
  )
}
