# Checklist de testes — MasterHUD

Marque com `x` dentro dos colchetes (`- [x]`) conforme for testando. Itens com **(2 contas)** precisam de uma conta de mestre e uma de jogador em navegadores/abas anônimas separadas.

Anote bugs encontrados na seção "Bugs encontrados" no final, mesmo que pequenos — descrição curta + onde reproduzir já ajuda.

---

## 1. Autenticação & sessão

- [X] Cadastro com senha fraca é rejeitado, com a checklist visual indicando o que falta - Funcionando
- [X] Cadastro com emails iguais (maiúsculo/minúsculo, espaços) é tratado corretamente - Funcionando
- [X] Email de verificação chega e o link funciona - Funcionando
- [X] Conta não verificada fica bloqueada em **todas** as rotas (tentar digitar URL direto, ex: `/jogos`)
- [X] Botão "Reenviar email" respeita o cooldown de 60s
- [X] Login com senha errada mostra mensagem clara (não erro técnico do Firebase) - Funcionando e ainda tem timout após inúmeras tentativas
- [X] "Esqueceu sua senha?" envia o email e o link funciona - funciona perfeitamente
- [X] Logout pede confirmação antes de sair - funciona perfeitamente
- [X] Abrir o app em duas abas, deslogar em uma → a outra também desloga sozinha - funciona perfeitamente
- [X] Deixar o token expirar (ou revogar sessão) - funciona perfeitamente

## 2. Perfil

- [X] Trocar nome, frase e foto salvam corretamente - funciona perfeitamente, mas ainda não tem o menu para ajustar qual parte da foto você quer usar e não apenas usar a foto inteira selecionada.
- [X] Foto muito grande é redimensionada sem travar o navegador 
- [X] Recarregar a página mantém os dados do perfil - Funciona Perfeitamente

## 3. Mesas

- [X] Criar mesa com nome vazio é bloqueado - funciona perfeitamente
- [X] Criar mesa com sistema "conhecido" x "customizado" - funciona perfeitamente
- [X] Editar/pausar/reativar mesa reflete na lista de `/jogos`
- [X] Excluir mesa exige digitar o nome exato pra confirmar
- [X] Excluir mesa remove também personagens e resumo (checar que não sobra lixo)
- [X] Mesa pausada ainda é acessível pelo mestre (só fica marcada, não bloqueia)

## 4. Personagens

- [X] Criar personagem jogador / NPC / monstro — cada tipo salva os campos certos
- [X] Upload de imagem principal e das imagens de estado (ferido/morto) funcionam
- [X] Bônus de atributo soma certo no total exibido
- [X] Adicionar/editar/remover ataque funciona
- [X] Adicionar/remover item do inventário funciona (Enter e botão)
- [X] Editar personagem existente carrega os dados certos e salva as alterações
- [X] Excluir personagem some da lista e não quebra o resumo do grupo

## 5. Compartilhamento de mesa — convite **(2 contas)**

- [X] Gerar código de convite funciona e o botão "Copiar" copia certo - funciona perfeitamente
- [X] Código errado no `/mesa/entrar` mostra erro, não quebra a tela - funciona perfeitamente
- [X] Jogador entra, vê o nome/sistema da mesa certo antes de confirmar - funciona perfeitamente
- [X] Jogador vê **só** personagens tipo jogador **sem dono** como opção de escolha - funciona perfeitamente, mas isso só funciona se o mestre criar dentro da sessão "jogadores", se o mestre cria um personagem na sessão "NPCS & monstros", depois edita a ficha e coloca como "jogador" não aparece para escolher.
- [X] Jogador NÃO vê NPCs/monstros na lista de opções  - funciona perfeitamente, jogador que entra só vê os outros personagens marcados como "jogador"
- [X] Escolher um slot existente vincula certo (testar com 2 jogadores diferentes, cada um pega um slot distinto) - Como me certifico que foi vinculado corretamente? Deveria aparecer na ficha algo como "Personagem vinculado a fulano de tal" e com a opção de alterar a quem pertece o personagem, para não ser obrigado a remover a pessoa da mesa, para ele entrar de novo e poder escolher outro personagem.
- [X] Criar personagem novo durante a entrada vincula automaticamente ao jogador - Como me certifico que foi vinculado corretamente? Deveria aparecer na ficha algo como "Personagem vinculado a fulano de tal"
- [ ] Jogador não consegue reivindicar um slot que outro jogador já pegou (testar os dois clicando quase ao mesmo tempo, se possível)
- [X] Mestre vê a lista de jogadores na mesa com o nome da ficha de cada um
- [X] Mestre consegue "Remover" um jogador — ele perde acesso à mesa - Além de perder a ficha ele é deslogado, não me parece o caminho certo
- [X] Depois de removido, o jogador não consegue mais acessar a mesa pela URL antiga  - Além de perder a ficha ele é deslogado, não me parece o caminho certo
- [X] Resumo do grupo (painel "Grupo" na visão do jogador) mostra HP de todos os jogadores, atualizado depois de dano em combate - Aparece, mas eu tenho de ficar atualizando a página para refletir as alterações.

## 6. Visão reduzida do jogador **(2 contas)**

- [X] Jogador vê só "Minha ficha" + "Grupo" no Gerenciador — sem Compartilhar mesa, NPCs, Zona de risco, Gerenciador de combate
- [X] Jogador consegue editar a própria ficha (ataques, inventário, notas, HP)
- [X] Jogador NÃO consegue editar a ficha de outro jogador (testar digitando a URL de editar de outro personagem direto)
- [X] Jogador tentando abrir `/mesa/.../combate` direto pela URL é redirecionado de volta
- [X] Jogador tentando abrir a ficha de um NPC/monstro direto pela URL é bloqueado (hoje isso desloga a pessoa com "sessão expirou" — é esperado, mas repare se a mensagem confunde)

## 7. Combate

- [X] Adicionar à fila, rolar iniciativa individual e "rolar todos" funcionam - Funciona perfeitamente
- [X] Reordenar por iniciativa está correto (maior primeiro)- Funciona perfeitamente
- [X] Aplicar dano/cura reflete no HP e na cor da barra - Funciona perfeitamente
- [X] Encerrar combate e distribuir XP funciona, level up calcula certo - Funciona perfeitamente
- [X] Toggle "Modo mestre/audiência" esconde HP de NPC quando ativado - Funciona perfeitamente
- [X] Atalhos do rodapé (Chat / Fichas / Dados completo) abrem o esperado — **Chat ainda não tem função, é esperado não fazer nada** - Funciona perfeitamente
- [X] Modal "Fichas" abre a ficha certa em nova aba ao clicar em Editar - Funciona perfeitamente

## 8. Segurança — dados entre contas **(2 contas)**

- [X] Jogador não consegue, via URL manual, acessar mesa de um terceiro mestre sem convite — testado por mim via script direto no Firestore real (2 contas de teste, sem passar pela UI): `PERMISSION_DENIED` confirmado
- [X] Jogador não consegue ver o painel de outro jogador com dados sensíveis (só o resumo) — testado igual: ficha completa de outro jogador nega, resumo não vaza notas privadas
- [X] Tentar truncar/editar a URL pra trocar `donoUid` por outro uid não dá acesso a nada — mesmo teste acima, cobre esse caso (ler mesa/ficha de outro dono é sempre negado)
- [X] Mestre que não gerou convite ainda não deixa ninguém entrar (campo de código vazio = mesa não listada) — `list` em `convites` sempre negado (sem enumeração possível) e código inexistente dá `NOT_FOUND`, não vaza dado
- [X] (extra, não estava na lista) Tentei também: adicionar o uid de outra pessoa em `membros`, roubar a ficha de outro jogador, excluir a mesa sendo jogador, editar o NPC do mestre sendo jogador — todos negados

## 9. Segurança — entrada de dados maliciosa

Testar colando os valores abaixo em campos de texto livre (nome de personagem, descrição da mesa, notas, nome do item, nome do usuário no cadastro) e confirmar que **aparecem como texto puro na tela**, sem executar nada, sem quebrar o layout, sem erro no console:

- [x] `<script>alert(1)</script>`
- [x] `<img src=x onerror=alert(1)>`
- [x] `"; DROP TABLE usuarios; --`
- [x] `' OR '1'='1`
- [x] `{{7*7}}` e `${7*7}` (template injection)
- [X] Texto gigante (copiar um parágrafo bem grande, uns 5000 caracteres) — testado via script: salva e volta do Firestore intacto, 5000 caracteres, sem truncar. **Não testei visualmente** se alguma tela ainda quebra ao exibir um texto desse tamanho sem espaços — isso só dá pra ver no navegador
- [X] Emoji e caracteres especiais/acentuação (japonês, árabe, emoji) — testado via script: salvei `"🎲🧙‍♂️ Nöme cõm açentuação, 日本語のテキスト, نص عربي, emoji 🔥🛡️"` num nome e voltou byte a byte igual
- [X] Campo de código de convite com símbolos/espaços/minúsculo — confirmado lendo o código (`EntrarMesa.tsx`): o campo já converte pra maiúsculo a cada tecla digitada e o botão de buscar também força maiúsculo + remove espaço nas pontas antes de consultar; qualquer código (incluindo com símbolos) que não exista mostra "Código não encontrado", nunca quebra a tela

## 10. Navegabilidade

- [X] Breadcrumbs (Início / Jogos / Mesa / ...) levam pro lugar certo
- [X] Botão "voltar" do navegador não deixa a tela num estado inconsistente
- [X] Recarregar a página (F5) em qualquer tela interna mantém o usuário logado e na tela certa
- [X] Digitar uma URL de mesa/personagem que não existe mostra algo sensato (não tela branca)
- [X] Links "cancelar" em formulários voltam pro lugar certo sem salvar nada

## 11. Erros de interface / UX geral

- [X] Estados vazios (zero mesas, zero personagens, zero jogadores) mostram mensagem clara, não tela em branco
- [X] Botões desabilitados (ex: "Criar mesa" sem nome) realmente impedem o clique
- [ ] Toasts de sucesso aparecem e desaparecem sozinhos
- [X] Nenhum texto quebra o layout (nomes muito longos, mesas com nomes muito longos no breadcrumb)
- [X] Testar em janela pequena/redimensionada — nada corta ou sobrepõe de forma ilegível - temos problemas de responsividade
- [ ] Testar com conexão lenta (DevTools → Network → Slow 3G) — telas de loading fazem sentido, não ficam travadas sem feedback

---

## Bugs encontrados

Todos os 4 abaixo foram corrigidos nesta rodada — peço pra reconferir no próximo teste:

- ~~lista dos sistemas não aparecendo, mostrando apenas "D&D 5ª edição"~~ — o dropdown "Qual sistema?" em Criar mesa era decorativo (`onChange` vazio, `value` travado); agora funciona e seleciona D&D 5e/Tormenta20 de verdade
- ~~Xp aceitando valor negativo~~ — XP, Nível, HP e bônus de atributo agora têm limites (não aceitam mais negativo nem número absurdo tipo "Nível -5e+159")
- ~~Tela criação de ficha: cliques sem querer fora dos modais fecha o modal e perde tudo~~ — corrigido no componente de modal compartilhado (agora só fecha se o clique começar E terminar fora dele, não quando é só o fim de uma seleção de texto)
- ~~Editar perfil: nome bugou e virou o email~~ — campo "Nome" (perfil e cadastro) agora tem limite de 60 caracteres, que era o que faltava pra evitar a escrita falhar

---

## Ajustes necessários

Os itens já resolvidos nesta rodada (incluindo os 3 que você confirmou que eram comportamento esperado, não bug) saíram da lista.

**Implementados nesta rodada, peço pra reconferir:**
- ~~A tela de Criar mesa tem de ter a opção de adicionar imagem~~ — já dá pra adicionar na criação, não só depois
- ~~Dados rápidos poderiam somar antes de rolar~~ — clicar em +d4/+d6/etc. agora acumula na expressão (soma o mesmo tipo de dado); só rola de fato no botão "Rolar" ou Enter
- ~~Não temos a opção de encerrar uma mesa~~ — `Zona de risco → Encerrar mesa`; aparece na aba "Encerradas" de `/jogos` com botão "Reabrir mesa"
- ~~Botões na tela de gerenciar tem de ser mais claros que são botões~~ — os cards de personagem agora têm um botão "+ Fila"/"✓ Na fila" visível em vez de depender do clique no card inteiro (que era a causa de "descobrir sem querer"), e a fileira de ações embaixo não quebra mais palavra por palavra

**UX, ainda não mexido:**
- ~~Botão de salvar alterações está muito escondido (em qual tela além do perfil? já ajustei o perfil — Cancelar/Salvar ficaram lado a lado)~~
- ~~Tipos de dados tem de ser fixos e selecionáveis — "Dados de dano" trocado de texto livre pra lista de dados (soma mais de um tipo, ex: "2d6+1d4") + lista de bônus fixos com origem obrigatória (Força, arma encantada...), total travado em 50 dados combinados. "Tipo de dano" (físico/elemental/mágico, agrupado), "Alcance" e "Recarga" (descanso curto/longo/recarga por turno) agora são dropdown com opções fixas. "Custo de recurso" virou tipo (quantificável: PM/PE/espaços/cargas; ação: padrão/bônus/reação; ou componente/sacrifício) + quantidade só nos tipos que fazem sentido ter número. Valor digitado antigo que não bate com nenhuma opção aparece como extra na lista em vez de ser apagado — tudo se ajusta sozinho na primeira vez que o mestre reabrir o ataque pra editar~~
- ~~Após alterações feitas, se a pessoa esquecer de salvar, avisar antes de sair da página~~
- ~~Tela combate: campos redundantes de rolagem pública~~ — o modal "Dados completo" (atalho do rodapé) tinha seu próprio toggle público/privado e seu próprio histórico, desconectados do painel "Dados" principal; agora os dois compartilham o mesmo estado (rolar em um atualiza o outro, o toggle é um só). O campo de expressão do painel "Dados" também virou só-leitura — a rolagem se monta clicando nos dados, sem precisar digitar
- ~~Tela de gerenciamento de mesa como um todo precisa de uma repensada maior de UX (você mencionou que "pode ser melhorada em muito") — isso é um projeto à parte, maior que um ajuste pontual; vale conversar separado sobre o que incomoda além do que já foi listado aqui~~

## Dúvidas
