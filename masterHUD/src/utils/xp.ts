// Curva genérica só pra destravar o level up automático — quanto falta pro próximo
// nível varia de verdade por sistema (D&D5e, Tormenta20, customizado); isso fica
// pra quando tivermos a tabela de cada um (ver README, "O que falta").
// O fallback `|| 300` cobre fichas antigas que podem não ter `xpProximoNivel`
// gravado — sem ele, a comparação com `undefined` nunca detecta level up.
// Nível e XP são saneados aqui (não só na UI): uma ficha antiga que ficou com um
// valor absurdo salvo (ex: de um bug já corrigido) se autocorrige no próximo cálculo,
// em vez de propagar o lixo pra sempre.
export function aplicarXp(
  atual: { xp: number; nivel: number; xpProximoNivel: number },
  ganho: number
): { xp: number; nivel: number; xpProximoNivel: number; subiuNivel: boolean } {
  const novoXp = Math.max(0, Math.min(999999, atual.xp + ganho))
  const nivelBase = Number.isFinite(atual.nivel) ? Math.max(1, Math.min(100, Math.trunc(atual.nivel))) : 1
  let nivel = nivelBase
  let proximoNivel = Number.isFinite(atual.xpProximoNivel) && atual.xpProximoNivel > 0 ? atual.xpProximoNivel : 300
  while (novoXp >= proximoNivel && nivel < 100) {
    nivel += 1
    proximoNivel = Math.round(proximoNivel * 1.5)
  }
  return { xp: novoXp, nivel, xpProximoNivel: proximoNivel, subiuNivel: nivel > nivelBase }
}
