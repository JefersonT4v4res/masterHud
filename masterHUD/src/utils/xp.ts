// Curva genérica só pra destravar o level up automático — quanto falta pro próximo
// nível varia de verdade por sistema (D&D5e, Tormenta20, customizado); isso fica
// pra quando tivermos a tabela de cada um (ver README, "O que falta").
// O fallback `|| 300` cobre fichas antigas que podem não ter `xpProximoNivel`
// gravado — sem ele, a comparação com `undefined` nunca detecta level up.
export function aplicarXp(
  atual: { xp: number; nivel: number; xpProximoNivel: number },
  ganho: number
): { xp: number; nivel: number; xpProximoNivel: number; subiuNivel: boolean } {
  const novoXp = atual.xp + ganho
  let nivel = atual.nivel
  let proximoNivel = atual.xpProximoNivel || 300
  while (novoXp >= proximoNivel) {
    nivel += 1
    proximoNivel = Math.round(proximoNivel * 1.5)
  }
  return { xp: novoXp, nivel, xpProximoNivel: proximoNivel, subiuNivel: nivel > atual.nivel }
}
