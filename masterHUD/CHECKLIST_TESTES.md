# Checklist de testes — MasterHUD

Marque com `x` dentro dos colchetes (`- [x]`) conforme for testando. Itens com **(2 contas)** precisam de uma conta de mestre e uma de jogador em navegadores/abas anônimas separadas.

Anote bugs encontrados na seção "Bugs encontrados" no final, mesmo que pequenos — descrição curta + onde reproduzir já ajuda.

---

## 1. Autenticação & sessão

- [ ] Cadastro com senha fraca é rejeitado, com a checklist visual indicando o que falta
- [ ] Cadastro com emails iguais (maiúsculo/minúsculo, espaços) é tratado corretamente
- [ ] Email de verificação chega e o link funciona
- [ ] Conta não verificada fica bloqueada em **todas** as rotas (tentar digitar URL direto, ex: `/jogos`)
- [ ] Botão "Reenviar email" respeita o cooldown de 60s
- [ ] Login com senha errada mostra mensagem clara (não erro técnico do Firebase)
- [ ] "Esqueceu sua senha?" envia o email e o link funciona
- [ ] Logout pede confirmação antes de sair
- [ ] Abrir o app em duas abas, deslogar em uma → a outra também desloga sozinha
- [ ] Deixar o token expirar (ou revogar sessão) → app desloga com "sessão expirou" em vez de travar

## 2. Perfil

- [ ] Trocar nome, frase e foto salvam corretamente
- [ ] Foto muito grande é redimensionada sem travar o navegador
- [ ] Recarregar a página mantém os dados do perfil

## 3. Mesas

- [ ] Criar mesa com nome vazio é bloqueado
- [ ] Criar mesa com sistema "conhecido" x "customizado" — ambos salvam certo
- [ ] Editar/pausar/reativar mesa reflete na lista de `/jogos`
- [ ] Excluir mesa exige digitar o nome exato pra confirmar
- [ ] Excluir mesa remove também personagens e resumo (checar que não sobra lixo)
- [ ] Mesa pausada ainda é acessível pelo mestre (só fica marcada, não bloqueia)

## 4. Personagens

- [ ] Criar personagem jogador / NPC / monstro — cada tipo salva os campos certos
- [ ] Upload de imagem principal e das imagens de estado (ferido/morto) funcionam
- [ ] Bônus de atributo soma certo no total exibido
- [ ] Adicionar/editar/remover ataque funciona
- [ ] Adicionar/remover item do inventário funciona (Enter e botão)
- [ ] Editar personagem existente carrega os dados certos e salva as alterações
- [ ] Excluir personagem some da lista e não quebra o resumo do grupo

## 5. Compartilhamento de mesa — convite **(2 contas)**

- [ ] Gerar código de convite funciona e o botão "Copiar" copia certo
- [ ] Código errado no `/mesa/entrar` mostra erro, não quebra a tela
- [ ] Jogador entra, vê o nome/sistema da mesa certo antes de confirmar
- [ ] Jogador vê **só** personagens tipo jogador **sem dono** como opção de escolha
- [ ] Jogador NÃO vê NPCs/monstros na lista de opções
- [ ] Escolher um slot existente vincula certo (testar com 2 jogadores diferentes, cada um pega um slot distinto)
- [ ] Criar personagem novo durante a entrada vincula automaticamente ao jogador
- [ ] Jogador não consegue reivindicar um slot que outro jogador já pegou (testar os dois clicando quase ao mesmo tempo, se possível)
- [ ] Mestre vê a lista de jogadores na mesa com o nome da ficha de cada um
- [ ] Mestre consegue "Remover" um jogador — ele perde acesso à mesa
- [ ] Depois de removido, o jogador não consegue mais acessar a mesa pela URL antiga
- [ ] Resumo do grupo (painel "Grupo" na visão do jogador) mostra HP de todos os jogadores, atualizado depois de dano em combate

## 6. Visão reduzida do jogador **(2 contas)**

- [ ] Jogador vê só "Minha ficha" + "Grupo" no Gerenciador — sem Compartilhar mesa, NPCs, Zona de risco, Gerenciador de combate
- [ ] Jogador consegue editar a própria ficha (ataques, inventário, notas, HP)
- [ ] Jogador NÃO consegue editar a ficha de outro jogador (testar digitando a URL de editar de outro personagem direto)
- [ ] Jogador tentando abrir `/mesa/.../combate` direto pela URL é redirecionado de volta
- [ ] Jogador tentando abrir a ficha de um NPC/monstro direto pela URL é bloqueado (hoje isso desloga a pessoa com "sessão expirou" — é esperado, mas repare se a mensagem confunde)

## 7. Combate

- [ ] Adicionar à fila, rolar iniciativa individual e "rolar todos" funcionam
- [ ] Reordenar por iniciativa está correto (maior primeiro)
- [ ] Aplicar dano/cura reflete no HP e na cor da barra
- [ ] Encerrar combate e distribuir XP funciona, level up calcula certo
- [ ] Toggle "Modo mestre/audiência" esconde HP de NPC quando ativado
- [ ] Atalhos do rodapé (Chat / Fichas / Dados completo) abrem o esperado — **Chat ainda não tem função, é esperado não fazer nada**
- [ ] Modal "Fichas" abre a ficha certa em nova aba ao clicar em Editar

## 8. Segurança — dados entre contas **(2 contas)**

- [ ] Jogador não consegue, via URL manual, acessar mesa de um terceiro mestre sem convite
- [ ] Jogador não consegue ver o painel de outro jogador com dados sensíveis (só o resumo)
- [ ] Tentar truncar/editar a URL pra trocar `donoUid` por outro uid não dá acesso a nada
- [ ] Mestre que não gerou convite ainda não deixa ninguém entrar (campo de código vazio = mesa não listada)

## 9. Segurança — entrada de dados maliciosa

Testar colando os valores abaixo em campos de texto livre (nome de personagem, descrição da mesa, notas, nome do item, nome do usuário no cadastro) e confirmar que **aparecem como texto puro na tela**, sem executar nada, sem quebrar o layout, sem erro no console:

- [ ] `<script>alert(1)</script>`
- [ ] `<img src=x onerror=alert(1)>`
- [ ] `"; DROP TABLE usuarios; --`
- [ ] `' OR '1'='1`
- [ ] `{{7*7}}` e `${7*7}` (template injection)
- [ ] Texto gigante (copiar um parágrafo bem grande, uns 5000 caracteres) — não trava a tela nem corta de forma estranha
- [ ] Emoji e caracteres especiais/acentuação (japonês, árabe, emoji) — salvam e exibem certo
- [ ] Campo de código de convite com símbolos/espaços/minúsculo — não quebra, e minúsculo deveria funcionar igual (o campo converte pra maiúsculo?)

## 10. Navegabilidade

- [ ] Breadcrumbs (Início / Jogos / Mesa / ...) levam pro lugar certo
- [ ] Botão "voltar" do navegador não deixa a tela num estado inconsistente
- [ ] Recarregar a página (F5) em qualquer tela interna mantém o usuário logado e na tela certa
- [ ] Digitar uma URL de mesa/personagem que não existe mostra algo sensato (não tela branca)
- [ ] Links "cancelar" em formulários voltam pro lugar certo sem salvar nada

## 11. Erros de interface / UX geral

- [ ] Estados vazios (zero mesas, zero personagens, zero jogadores) mostram mensagem clara, não tela em branco
- [ ] Botões desabilitados (ex: "Criar mesa" sem nome) realmente impedem o clique
- [ ] Toasts de sucesso aparecem e desaparecem sozinhos
- [ ] Nenhum texto quebra o layout (nomes muito longos, mesas com nomes muito longos no breadcrumb)
- [ ] Testar em janela pequena/redimensionada — nada corta ou sobrepõe de forma ilegível
- [ ] Testar com conexão lenta (DevTools → Network → Slow 3G) — telas de loading fazem sentido, não ficam travadas sem feedback

---

## Bugs encontrados

(preencher livremente conforme for testando)

-
-
-
