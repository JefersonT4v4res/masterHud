import { useState, useCallback } from 'react'

export interface RollResult {
  id: string
  expression: string
  rolls: number[]
  modifier: number
  total: number
  isPublic: boolean
  rolledBy: string
  timestamp: string
  breakdown?: string   // ex: "1d6[4] + 1d4[3] + 2"
}

// ── Crypto random com rejection sampling ─────────────────────────────
export function cryptoRollSingle(sides: number): number {
  const array = new Uint32Array(1)
  const limit = Math.floor(0xFFFFFFFF / sides) * sides
  let attempts = 0
  do {
    crypto.getRandomValues(array)
    attempts++
  } while (array[0] >= limit && attempts < 100)
  return (array[0] % sides) + 1
}

export function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => cryptoRollSingle(sides))
}

// ── Parser de expressão composta ──────────────────────────────────────
// Aceita: "1d6", "2d8+3", "1d6+1d4", "1d6+1d4+2", "1d20+FOR", "2d6-1"
// Retorna null se a expressão for inválida

export interface ParsedExpression {
  groups: Array<{ count: number; sides: number }>   // cada grupo de dados
  modifier: number                                   // modificador fixo total
  raw: string
}

export function parseDiceExpression(expr: string): ParsedExpression | null {
  if (!expr || !expr.trim()) return null
  const clean = expr.toLowerCase().trim().replace(/\s/g, '')

  // Tokeniza a expressão em termos separados por + ou -
  // Ex: "1d6+1d4+2" → ["1d6", "+1d4", "+2"]
  const tokens = clean.match(/[+-]?[^+-]+/g)
  if (!tokens) return null

  const groups: Array<{ count: number; sides: number }> = []
  let modifier = 0

  for (const token of tokens) {
    const sign = token.startsWith('-') ? -1 : 1
    const part = token.replace(/^[+-]/, '')

    const diceMatch = part.match(/^(\d*)d(\d+)$/)
    if (diceMatch) {
      const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1
      const sides = parseInt(diceMatch[2])
      if (sides < 2 || count < 1 || count > 100) return null
      // sign negativo em dados: subtrai cada rolagem (raro mas possível)
      for (let i = 0; i < count; i++) {
        groups.push({ count: sign, sides })
      }
    } else {
      const num = parseInt(part)
      if (isNaN(num)) return null
      modifier += sign * num
    }
  }

  // Reagrupa por sides para simplificar
  const grouped = new Map<number, number>()
  for (const g of groups) {
    grouped.set(g.sides, (grouped.get(g.sides) || 0) + g.count)
  }
  const finalGroups = Array.from(grouped.entries())
    .filter(([, c]) => c !== 0)
    .map(([sides, count]) => ({ count, sides }))

  if (finalGroups.length === 0 && modifier === 0) return null

  return { groups: finalGroups, modifier, raw: expr.trim() }
}

export function formatExpression(parsed: ParsedExpression): string {
  const parts = parsed.groups.map(g =>
    `${Math.abs(g.count) > 1 ? Math.abs(g.count) : ''}d${g.sides}`
  )
  if (parsed.modifier !== 0) parts.push(String(parsed.modifier))
  return parts.join('+').replace('+-', '-')
}

// ── Executa uma expressão parseada e retorna resultado ────────────────
export function executeRoll(
  parsed: ParsedExpression,
  rolledBy: string,
  isPublic: boolean,
  bonusLabel?: string    // ex: "FOR +2"
): RollResult {
  const allRolls: number[] = []
  const breakdownParts: string[] = []

  for (const g of parsed.groups) {
    const count = Math.abs(g.count)
    const sign  = g.count < 0 ? -1 : 1
    const rolls = Array.from({ length: count }, () => cryptoRollSingle(g.sides))
    const subtotal = rolls.reduce((a, b) => a + b, 0) * sign
    allRolls.push(...rolls.map(r => r * sign))
    breakdownParts.push(`${g.count > 0 && breakdownParts.length ? '+' : ''}${count === 1 ? '' : count}d${g.sides}[${rolls.join(',')}]`)
  }

  if (parsed.modifier !== 0) {
    breakdownParts.push(`${parsed.modifier > 0 ? '+' : ''}${parsed.modifier}`)
  }
  if (bonusLabel) {
    breakdownParts.push(`(${bonusLabel})`)
  }

  const total = allRolls.reduce((a, b) => a + b, 0) + parsed.modifier

  return {
    id: crypto.randomUUID(),
    expression: formatExpression(parsed),
    rolls: allRolls,
    modifier: parsed.modifier,
    total,
    isPublic,
    rolledBy,
    timestamp: new Date().toISOString(),
    breakdown: breakdownParts.join(' '),
  }
}

// ── Hook principal ────────────────────────────────────────────────────
export function useDiceRoller() {
  const [history, setHistory] = useState<RollResult[]>([])
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null)

  const roll = useCallback((
    expression: string,
    rolledBy = 'Mestre',
    isPublic = true,
    bonusLabel?: string
  ): RollResult | null => {
    const parsed = parseDiceExpression(expression)
    if (!parsed) return null
    const result = executeRoll(parsed, rolledBy, isPublic, bonusLabel)
    setLastRoll(result)
    setHistory(prev => [result, ...prev.slice(0, 49)])
    return result
  }, [])

  const rollInitiative = useCallback((modifier = 0, name = 'Mestre') => {
    const expr = `1d20${modifier >= 0 ? '+' : ''}${modifier}`
    const parsed = parseDiceExpression(expr)!
    const result = executeRoll(parsed, name, true)
    setLastRoll(result)
    setHistory(prev => [result, ...prev.slice(0, 49)])
    return result
  }, [])

  return { roll, rollInitiative, history, lastRoll }
}
