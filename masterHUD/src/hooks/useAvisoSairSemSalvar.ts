import { useEffect, useRef, useState } from 'react'

// Avisa antes de sair de uma tela com alterações não salvas, em três frentes:
// fechar a aba/atualizar (beforeunload), apertar o botão "voltar" do navegador
// (truque de empilhar uma entrada extra no histórico e interceptar o popstate —
// o app usa <BrowserRouter> simples, sem data router, então useBlocker do
// react-router não está disponível) e navegação dentro do próprio app
// (breadcrumbs/botão "Cancelar" chamam `tentarSair` em vez de navegar direto).
export function useAvisoSairSemSalvar(isDirty: boolean) {
  const [confirmando, setConfirmando] = useState(false)
  const destinoRef = useRef<(() => void) | null>(null)
  const isDirtyRef = useRef(isDirty)
  const armadoRef = useRef(false)
  isDirtyRef.current = isDirty

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // Só empilha a entrada extra na primeira vez que a tela fica suja — evita gastar
  // history à toa em quem só entrou pra olhar e saiu sem mexer em nada.
  useEffect(() => {
    if (!isDirty || armadoRef.current) return
    armadoRef.current = true
    window.history.pushState(null, '', window.location.href)
  }, [isDirty])

  useEffect(() => {
    const onPopState = () => {
      if (!isDirtyRef.current) return
      window.history.pushState(null, '', window.location.href)
      destinoRef.current = () => window.history.go(-2)
      setConfirmando(true)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const tentarSair = (destino: () => void) => {
    if (isDirtyRef.current) {
      destinoRef.current = destino
      setConfirmando(true)
    } else {
      destino()
    }
  }

  const confirmarSaidaSemSalvar = () => {
    setConfirmando(false)
    destinoRef.current?.()
    destinoRef.current = null
  }

  const cancelarSaida = () => {
    setConfirmando(false)
    destinoRef.current = null
  }

  return { confirmando, tentarSair, confirmarSaidaSemSalvar, cancelarSaida }
}
