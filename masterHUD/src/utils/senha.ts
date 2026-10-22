export interface RegraSenha {
  id: string
  label: string
  valido: (senha: string) => boolean
}

// Sequências de teclado/alfabeto comuns — checadas como substring (e seu reverso)
const SEQUENCIAS_TECLADO = [
  '1234567890',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'abcdefghijklmnopqrstuvwxyz',
]

function temSequenciaClassica(senha: string): boolean {
  const s = senha.toLowerCase()

  // mesmo caractere repetido 4+ vezes seguidas (ex: aaaa, 1111)
  if (/(.)\1{3,}/.test(s)) return true

  // 4+ caracteres consecutivos em ordem crescente ou decrescente (ex: abcd, 4321)
  for (let i = 0; i <= s.length - 4; i++) {
    const c0 = s.charCodeAt(i)
    let crescente = true
    let decrescente = true
    for (let j = 1; j < 4; j++) {
      const diff = s.charCodeAt(i + j) - c0
      if (diff !== j) crescente = false
      if (diff !== -j) decrescente = false
    }
    if (crescente || decrescente) return true
  }

  // substring de 4+ caracteres de uma sequência de teclado conhecida (ou seu reverso)
  for (const seq of SEQUENCIAS_TECLADO) {
    const reversa = [...seq].reverse().join('')
    for (let i = 0; i <= seq.length - 4; i++) {
      const trecho = seq.slice(i, i + 4)
      if (s.includes(trecho) || s.includes(reversa.slice(i, i + 4))) return true
    }
  }

  return false
}

export const REGRAS_SENHA: RegraSenha[] = [
  { id: 'tamanho', label: 'Pelo menos 12 caracteres', valido: (s) => s.length >= 12 },
  { id: 'maiuscula', label: 'Uma letra maiúscula (A-Z)', valido: (s) => /[A-Z]/.test(s) },
  { id: 'minuscula', label: 'Uma letra minúscula (a-z)', valido: (s) => /[a-z]/.test(s) },
  { id: 'numero', label: 'Um número (0-9)', valido: (s) => /[0-9]/.test(s) },
  { id: 'especial', label: 'Um caractere especial (!@#$*...)', valido: (s) => /[^A-Za-z0-9]/.test(s) },
  { id: 'sequencia', label: 'Sem sequências óbvias (123456, abcdef, qwerty...)', valido: (s) => !temSequenciaClassica(s) },
]

export function senhaValida(senha: string): boolean {
  return REGRAS_SENHA.every((r) => r.valido(senha))
}
