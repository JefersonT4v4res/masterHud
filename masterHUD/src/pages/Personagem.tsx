import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Topbar } from '../components/layout/Topbar'
import { Button, Input, Textarea, Select, Panel, PanelTitle, HpBar, XpBar, Toast, Modal } from '../components/ui'
import { getPersonagem, createPersonagem, updatePersonagem, getMesa, getMolde } from '../db'
import type { Personagem as TPersonagem, MoldeMesa, Ataque } from '../types'

// ── Helpers ──────────────────────────────────────────────────────────
const defaultAtributos = (nomes: string[]) => nomes.map(nome => ({ nome, valor: 10 }))

const defaultPersonagem = (mesaId: number, tipo: 'jogador' | 'npc' | 'monstro', atrs: string[]): Omit<TPersonagem, 'id'> => ({
  mesaId, tipo, nome: '', raca: '', classe: '', nivel: 1,
  xp: 0, xpProximoNivel: 300,
  hpAtual: 10, hpMaximo: 10,
  status: 'vivo',
  atributos: defaultAtributos(atrs),
  ataques: [], pericias: {},
  notas: '',
  inventario: [],
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
})

function newAtaque(): Ataque {
  return {
    id: Math.random().toString(36).slice(2),
    nome: '', tipo: 'arma_cac',
    dados: '', tipoDano: '', alcance: '',
    custoRecurso: '', recarga: '', descricao: '',
  }
}

// Converte File para base64 para armazenar no IndexedDB
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── PersonagemForm ────────────────────────────────────────────────────
export const PersonagemForm: React.FC = () => {
  const { id: mesaIdStr, personagemId } = useParams<{ id: string; personagemId?: string }>()
  const mesaId = Number(mesaIdStr)
  const isEdit = !!personagemId
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tipoParam = (searchParams.get('tipo') as 'jogador' | 'npc') || 'jogador'
  const imgInputRef = useRef<HTMLInputElement>(null)

  const [molde, setMolde]       = useState<MoldeMesa | null>(null)
  const [form, setForm]         = useState<Omit<TPersonagem, 'id'> | null>(null)
  const [toast, setToast]       = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mesaNome, setMesaNome] = useState('')
  const [ataqueModal, setAtaqueModal] = useState(false)
  const [editandoAtaque, setEditandoAtaque] = useState<Ataque | null>(null)
  const [novoItem, setNovoItem] = useState('')

  const load = useCallback(async () => {
    const [m, mo] = await Promise.all([getMesa(mesaId), getMolde(mesaId)])
    if (m) setMesaNome(m.nome)
    const atrs = mo?.atributos || ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']
    setMolde(mo || null)
    if (isEdit && personagemId) {
      const p = await getPersonagem(Number(personagemId))
      if (p) setForm({ ...p, inventario: (p as any).inventario || [] })
    } else {
      setForm(defaultPersonagem(mesaId, tipoParam, atrs))
    }
  }, [mesaId, personagemId, isEdit, tipoParam])

  useEffect(() => { load() }, [load])

  const update = (field: string, value: unknown) =>
    setForm(prev => prev ? { ...prev, [field]: value } : prev)

  const updateAtributo = (nome: string, valor: number) =>
    setForm(prev => prev ? {
      ...prev,
      atributos: prev.atributos.map(a => a.nome === nome ? { ...a, valor } : a),
    } : prev)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await fileToBase64(file)
    update('imagemUrl', base64)
  }

  const handleSave = async () => {
    if (!form || !form.nome.trim()) return
    setSalvando(true)
    try {
      const payload = { ...form, atualizadoEm: new Date().toISOString() }
      if (isEdit && personagemId) {
        await updatePersonagem(Number(personagemId), payload)
      } else {
        await createPersonagem(payload)
      }
      setToast(true)
      setTimeout(() => navigate(`/mesa/${mesaId}`), 1000)
    } finally {
      setSalvando(false)
    }
  }

  const saveAtaque = () => {
    if (!editandoAtaque || !form) return
    const exists = form.ataques.find(a => a.id === editandoAtaque.id)
    if (exists) {
      update('ataques', form.ataques.map(a => a.id === editandoAtaque.id ? editandoAtaque : a))
    } else {
      update('ataques', [...form.ataques, editandoAtaque])
    }
    setAtaqueModal(false)
    setEditandoAtaque(null)
  }

  const removeAtaque = (id: string) => {
    if (!form) return
    update('ataques', form.ataques.filter(a => a.id !== id))
  }

  const addItem = () => {
    if (!novoItem.trim() || !form) return
    update('inventario', [...((form as any).inventario || []), novoItem.trim()])
    setNovoItem('')
  }

  const removeItem = (idx: number) => {
    if (!form) return
    const inv = [...((form as any).inventario || [])]
    inv.splice(idx, 1)
    update('inventario', inv)
  }

  if (!form) return null

  const atrs = molde?.atributos || ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']
  const tipoLabel = form.tipo === 'jogador' ? 'Jogador' : form.tipo === 'npc' ? 'NPC' : 'Monstro'
  const inventario: string[] = (form as any).inventario || []

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>
      <Topbar
        crumbs={[
          { label: 'Início', to: '/' },
          { label: mesaNome, to: `/mesa/${mesaId}` },
          { label: isEdit ? 'Editar personagem' : `Criar ${tipoLabel}` },
        ]}
        right={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={() => navigate(`/mesa/${mesaId}`)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nome.trim() || salvando}>
              {salvando ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar personagem'}
            </Button>
          </div>
        }
      />

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '26px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, marginBottom: 20 }}>

          {/* Coluna identidade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Panel>
              <PanelTitle>{isEdit ? 'Editar' : 'Novo'} {tipoLabel}</PanelTitle>

              {/* Upload de imagem */}
              <div style={{ textAlign: 'center', margin: '14px 0' }}>
                <div
                  onClick={() => imgInputRef.current?.click()}
                  style={{
                    width: 90, height: 90, borderRadius: '50%',
                    border: '2px dashed var(--gold-dim)',
                    margin: '0 auto 10px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'grid', placeItems: 'center',
                    background: 'var(--bg-card)',
                    position: 'relative',
                  }}
                >
                  {form.imagemUrl ? (
                    <img src={form.imagemUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 24, color: 'var(--ink-faint)' }}>+</span>
                  )}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    display: 'grid', placeItems: 'center',
                    opacity: 0, transition: 'opacity 0.15s',
                    fontSize: 11, color: 'var(--ink)',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    Trocar
                  </div>
                </div>
                <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Clique para adicionar foto</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input label="Nome *" value={form.nome} onChange={e => update('nome', e.target.value)} placeholder="Nome do personagem" />
                <Input label="Raça" value={form.raca} onChange={e => update('raca', e.target.value)} placeholder="Ex: Humano, Elfo..." />
                <Input label="Classe" value={form.classe} onChange={e => update('classe', e.target.value)} placeholder="Ex: Guerreiro, Mago..." />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Input label="Nível" type="number" value={form.nivel} onChange={e => update('nivel', Number(e.target.value))} />
                  <Select label="Tipo" value={form.tipo} onChange={e => update('tipo', e.target.value as TPersonagem['tipo'])}>
                    <option value="jogador">Jogador</option>
                    <option value="npc">NPC</option>
                    <option value="monstro">Monstro</option>
                  </Select>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelTitle>HP &amp; Progressão</PanelTitle>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <HpBar atual={form.hpAtual} maximo={form.hpMaximo} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Input label="HP Atual" type="number" value={form.hpAtual} onChange={e => update('hpAtual', Number(e.target.value))} />
                  <Input label="HP Máximo" type="number" value={form.hpMaximo} onChange={e => update('hpMaximo', Number(e.target.value))} />
                </div>
                {form.tipo === 'jogador' && (
                  <>
                    <XpBar xp={form.xp} xpProximo={form.xpProximoNivel} nivel={form.nivel} />
                    <Input label="XP atual" type="number" value={form.xp} onChange={e => update('xp', Number(e.target.value))} />
                  </>
                )}
              </div>
            </Panel>
          </div>

          {/* Coluna direita */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Panel>
              <PanelTitle>Atributos</PanelTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 14 }}>
                {atrs.map(nome => {
                  const atr = form.atributos.find(a => a.nome === nome)
                  return (
                    <div key={nome} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-faint)', marginBottom: 6 }}>{nome}</div>
                      <input
                        type="number" value={atr?.valor ?? 10}
                        onChange={e => updateAtributo(nome, Number(e.target.value))}
                        style={{ width: '100%', background: 'none', border: 'none', color: 'var(--ink)', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, outline: 'none' }}
                      />
                    </div>
                  )
                })}
              </div>
            </Panel>

            <Panel>
              <PanelTitle>Notas &amp; história</PanelTitle>
              <Textarea
                value={form.notas}
                onChange={e => update('notas', e.target.value)}
                placeholder="Descrição, história, traços de personalidade, segredos..."
                style={{ marginTop: 14, minHeight: 100 }}
              />
            </Panel>
          </div>
        </div>

        {/* Ataques e magias */}
        <Panel style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <PanelTitle>Ataques, armas &amp; magias</PanelTitle>
            <Button size="sm" variant="secondary" onClick={() => { setEditandoAtaque(newAtaque()); setAtaqueModal(true) }}>
              + Adicionar
            </Button>
          </div>
          {form.ataques.length === 0 ? (
            <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Nenhum ataque cadastrado ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.ataques.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 9, padding: '12px 14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.nome || '(sem nome)'}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                      {[a.dados, a.tipoDano, a.alcance].filter(Boolean).join(' · ')}
                      {a.custoRecurso && ` · ${a.custoRecurso}`}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setEditandoAtaque({ ...a }); setAtaqueModal(true) }}>Editar</Button>
                  <Button size="sm" variant="danger-outline" onClick={() => removeAtaque(a.id)}>✕</Button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Inventário */}
        <Panel>
          <PanelTitle>Mochila &amp; inventário</PanelTitle>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, marginBottom: 12 }}>
            <input
              value={novoItem}
              onChange={e => setNovoItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Nome do item (pressione Enter para adicionar)"
              style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)', fontSize: 13.5, padding: '9px 12px', outline: 'none' }}
            />
            <Button size="sm" onClick={addItem} disabled={!novoItem.trim()}>+ Adicionar</Button>
          </div>
          {inventario.length === 0 ? (
            <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Mochila vazia.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inventario.map((item: string, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8, padding: '9px 12px' }}>
                  <span style={{ fontSize: 13.5 }}>⬡ {item}</span>
                  <span style={{ color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 14 }} onClick={() => removeItem(idx)}>✕</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Modal editar ataque */}
      <Modal open={ataqueModal} onClose={() => setAtaqueModal(false)} title="Ataque / Magia / Habilidade" width={480}>
        {editandoAtaque && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input label="Nome" value={editandoAtaque.nome} onChange={e => setEditandoAtaque(a => a ? { ...a, nome: e.target.value } : a)} placeholder="Ex: Espada longa, Bola de Fogo..." />
            <Select label="Tipo" value={editandoAtaque.tipo} onChange={e => setEditandoAtaque(a => a ? { ...a, tipo: e.target.value as Ataque['tipo'] } : a)}>
              <option value="arma_cac">Arma corpo a corpo</option>
              <option value="arma_distancia">Arma à distância</option>
              <option value="magia">Magia</option>
              <option value="habilidade">Habilidade especial</option>
            </Select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Input label="Dados de dano" value={editandoAtaque.dados} onChange={e => setEditandoAtaque(a => a ? { ...a, dados: e.target.value } : a)} placeholder="Ex: 2d6+3" />
              <Input label="Tipo de dano" value={editandoAtaque.tipoDano} onChange={e => setEditandoAtaque(a => a ? { ...a, tipoDano: e.target.value } : a)} placeholder="Ex: fogo, cortante..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Input label="Alcance" value={editandoAtaque.alcance} onChange={e => setEditandoAtaque(a => a ? { ...a, alcance: e.target.value } : a)} placeholder="Ex: 9m, corpo a corpo" />
              <Input label="Custo de recurso" value={editandoAtaque.custoRecurso || ''} onChange={e => setEditandoAtaque(a => a ? { ...a, custoRecurso: e.target.value } : a)} placeholder="Ex: 2 de mana" />
            </div>
            <Input label="Recarga" value={editandoAtaque.recarga || ''} onChange={e => setEditandoAtaque(a => a ? { ...a, recarga: e.target.value } : a)} placeholder="Ex: 1x por combate, descanso longo..." />
            <Textarea label="Descrição / efeito" value={editandoAtaque.descricao || ''} onChange={e => setEditandoAtaque(a => a ? { ...a, descricao: e.target.value } : a)} placeholder="O que acontece quando usa?" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <Button variant="ghost" onClick={() => setAtaqueModal(false)}>Cancelar</Button>
              <Button onClick={saveAtaque} disabled={!editandoAtaque.nome.trim()}>Salvar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={isEdit ? 'Alterações salvas!' : 'Personagem criado!'} visible={toast} />
    </div>
  )
}

// ── FichaPersonagem (visualização) ────────────────────────────────────
export const FichaPersonagem: React.FC = () => {
  const { id: mesaIdStr, personagemId } = useParams<{ id: string; personagemId: string }>()
  const mesaId = Number(mesaIdStr)
  const navigate = useNavigate()
  const [personagem, setPersonagem] = useState<TPersonagem | null>(null)
  const [mesaNome, setMesaNome] = useState('')

  useEffect(() => {
    Promise.all([getMesa(mesaId), getPersonagem(Number(personagemId))]).then(([m, p]) => {
      if (m) setMesaNome(m.nome)
      if (p) setPersonagem(p)
    })
  }, [mesaId, personagemId])

  if (!personagem) return null
  const inventario: string[] = (personagem as any).inventario || []

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>
      <Topbar
        crumbs={[{ label: 'Início', to: '/' }, { label: mesaNome, to: `/mesa/${mesaId}` }, { label: personagem.nome }]}
        right={<Button size="sm" onClick={() => navigate(`/mesa/${mesaId}/personagem/${personagemId}/editar`)}>✎ Editar ficha</Button>}
      />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '26px 32px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
        <Panel style={{ alignSelf: 'start' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            {personagem.imagemUrl ? (
              <img src={personagem.imagemUrl} alt={personagem.nome} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold)', margin: '0 auto 12px', display: 'block' }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px', background: 'var(--gold-dim)', border: '2px solid var(--gold)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--bg-deep)', fontSize: 28 }}>
                {personagem.nome[0]}
              </div>
            )}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{personagem.nome}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 6 }}>{personagem.raca} · {personagem.classe}</div>
          </div>
          <HpBar atual={personagem.hpAtual} maximo={personagem.hpMaximo} />
          {personagem.tipo === 'jogador' && <div style={{ marginTop: 12 }}><XpBar xp={personagem.xp} xpProximo={personagem.xpProximoNivel} nivel={personagem.nivel} /></div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            {personagem.atributos.map(a => (
              <div key={a.nome} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-faint)' }}>{a.nome}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{a.valor}</div>
              </div>
            ))}
          </div>
        </Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel>
            <PanelTitle>Ataques &amp; habilidades</PanelTitle>
            {personagem.ataques.length === 0 ? (
              <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                Nenhum ataque cadastrado. <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => navigate(`/mesa/${mesaId}/personagem/${personagemId}/editar`)}>Editar ficha →</span>
              </div>
            ) : personagem.ataques.map(a => (
              <div key={a.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 9, padding: '12px 14px', marginTop: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 3 }}>{[a.dados, a.tipoDano, a.alcance].filter(Boolean).join(' · ')}</div>
                {a.descricao && <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>{a.descricao}</div>}
              </div>
            ))}
          </Panel>
          <Panel>
            <PanelTitle>Mochila</PanelTitle>
            {inventario.length === 0 ? (
              <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Mochila vazia.</div>
            ) : inventario.map((item: string, idx: number) => (
              <div key={idx} style={{ fontSize: 13.5, padding: '7px 0', borderBottom: '1px solid var(--line)', color: 'var(--ink-dim)' }}>⬡ {item}</div>
            ))}
          </Panel>
          <Panel>
            <PanelTitle>Notas</PanelTitle>
            <div style={{ fontSize: 13.5, color: 'var(--ink-dim)', marginTop: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {personagem.notas || <span style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>Sem notas.</span>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
