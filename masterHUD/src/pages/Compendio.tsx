import React, { useEffect, useState } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { Topbar } from '../components/layout/Topbar'
import { Button, Panel, PanelTitle, Textarea, Toast } from '../components/ui'
import { auth, db } from '../firebase'

export const Compendio: React.FC = () => {
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    if (!auth.currentUser) return
    getDoc(doc(db, 'usuarios', auth.currentUser.uid)).then(snap => {
      setTexto(snap.data()?.compendio || '')
      setCarregando(false)
    })
  }, [])

  const handleSalvar = async () => {
    if (!auth.currentUser) return
    setSalvando(true)
    try {
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { compendio: texto })
      setToast(true)
      setTimeout(() => setToast(false), 2000)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar crumbs={[{ label: 'Início', to: '/' }, { label: 'Compêndio do Mestre' }]} />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px' }}>
        <Panel>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <PanelTitle>Compêndio do Mestre</PanelTitle>
            <Button onClick={handleSalvar} disabled={salvando || carregando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginBottom: 16 }}>
            Suas anotações pessoais — segredos da campanha, lembretes, ideias soltas. Só você vê isso.
          </div>
          {carregando ? (
            <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Carregando…</div>
          ) : (
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva aqui suas anotações..."
              style={{ minHeight: 400 }}
            />
          )}
        </Panel>
      </div>

      <Toast message="Compêndio salvo" visible={toast} />
    </div>
  )
}
