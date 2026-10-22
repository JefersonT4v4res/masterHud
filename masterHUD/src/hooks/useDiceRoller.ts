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
}

// Parseia expressão tipo "2d6+3", "1d20", "d8-1"
export function parseDiceExpression(expr: string): { count: number; sides: number; modifier: number } | null {
  const clean = expr.toLowerCase().replace(/\s/g, '')
  const match = clean.match(/^(\d*)d(\d+)([+-]\d+)?$/)
  if (!match) return null
  return {
    count: match[1] ? parseInt(match[1]) : 1,
    sides: parseInt(match[2]),
    modifier: match[3] ? parseInt(match[3]) : 0,
  }
}

export function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
}

export function useDiceRoller() {
  const [history, setHistory] = useState<RollResult[]>([])
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null)

  const roll = useCallback((expression: string, rolledBy = 'Mestre', isPublic = true): RollResult | null => {
    const parsed = parseDiceExpression(expression)
    if (!parsed) return null
    const rolls = rollDice(parsed.count, parsed.sides)
    const total = rolls.reduce((a, b) => a + b, 0) + parsed.modifier
    const result: RollResult = {
      id: Math.random().toString(36).slice(2),
      expression,
      rolls,
      modifier: parsed.modifier,
      total,
      isPublic,
      rolledBy,
      timestamp: new Date().toISOString(),
    }
    setLastRoll(result)
    setHistory(prev => [result, ...prev.slice(0, 49)])
    return result
  }, [])

  const rollInitiative = useCallback((modifier = 0, name = 'Mestre') => {
    const rolls = rollDice(1, 20)
    const total = rolls[0] + modifier
    const result: RollResult = {
      id: Math.random().toString(36).slice(2),
      expression: `1d20${modifier >= 0 ? '+' : ''}${modifier}`,
      rolls,
      modifier,
      total,
      isPublic: true,
      rolledBy: name,
      timestamp: new Date().toISOString(),
    }
    setLastRoll(result)
    setHistory(prev => [result, ...prev.slice(0, 49)])
    return result
  }, [])

  return { roll, rollInitiative, history, lastRoll }
}
