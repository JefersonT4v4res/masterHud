# Checklist de testes — MasterHUD

Marque com `x` dentro dos colchetes (`- [x]`) conforme for testando. Itens com **(2 contas)** precisam de uma conta de mestre e uma de jogador em navegadores/abas anônimas separadas.

Anote bugs encontrados na seção "Bugs encontrados" no final, mesmo que pequenos — descrição curta + onde reproduzir já ajuda.

---

## 1. Autenticação & sessão

- [X] Cadastro com senha fraca é rejeitado, com a checklist visual indicando o que falta - Funcionando e se erra a senha ele diz que não coincidem
- [X] Cadastro com emails iguais (maiúsculo/minúsculo, espaços) é tratado corretamente - Tentei cadastrar um email que já tem conta e apareceu o aviso "Já existe uma conta com esse email."
- [X] Email de verificação chega e o link funciona - Email chegou, antes de verificar cliquei em "já verifiquei, continuar" e não avançou (Perfeito!). Após clicar no link e voltar para a aba de login, clicar no "já verifiquei, continuar" funcionou.
- [X] Conta não verificada fica bloqueada em **todas** as rotas (tentar digitar URL direto, ex: `/jogos`)
- [X] Botão "Reenviar email" respeita o cooldown de 60s
- [X] Login com senha errada mostra mensagem clara (não erro técnico do Firebase) - A mensagem aparece que "email ou senha estão incorretos", mas ao clicar para acessar diversas vezes com a senha errada a mensagem que aparece é "Muitas tentativas. Tente novamente mais tarde." mas o botão continua disponível e não vejo nenhum tipo de timout.
- [X] "Esqueceu sua senha?" envia o email e o link funciona - funciona perfeitamente
- [X] Logout pede confirmação antes de sair - funciona perfeitamente
- [X] Abrir o app em duas abas, deslogar em uma → a outra também desloga sozinha - funciona perfeitamente
- [ ] Deixar o token expirar (ou revogar sessão) → app desloga com "sessão expirou" em vez de travar - como testar isso? Eu deixei o app aberto aqui por horas e nada aconteceu

## 2. Perfil

- [ ] Trocar nome, frase e foto salvam corretamente - Alterar foto está aparecendo "Não foi possível atualizar a foto. Tente uma imagem menor." talvez seria melhor ter a possibilidade de recortar o tamanho da imagem dentro da própria plataforma porque apesar da imagem ser pesada, ao recortar fica menor.
Trocar o nome funcionou perfeitamente.
frase: adicionei e salvei, mas ela não aparece em lugar nenhum e nem fica salva ao voltar no editor de perfil.
Devia ter claro um botão de "voltar para o menu" do que apenas o botão "sair" isso confunde, parece que é sair do editor de perfil.
- [X] Foto muito grande é redimensionada sem travar o navegador - eu subo a foto e realmente ajusta o tamanho, mas poderiamos adicionar uma funcionalidade de cortar a foto em um círculo para a pessoa escolher melhor o que mostrar da foto e as opções de zoom in e zoom out
- [X] Recarregar a página mantém os dados do perfil - ainda não consegui subir salvar uma foto

## 3. Mesas

- [X] Criar mesa com nome vazio é bloqueado
- [X] Criar mesa com sistema "conhecido" x "customizado" — ambos salvam certo
- [X] Editar/pausar/reativar mesa reflete na lista de `/jogos` - Funciona. Criar a mesa, pausar, reativa e apagar, mas a parte de editar? Eu não consifo editar a descrição da mesa e nem o nome dela e nem o sistema caso tenha sido errado. Acho que o botão de "iniciar mesa" deveria levar para a tela de gerenciar combate e o botão de "gerenciar" deveria levar para a tela de edição das informações da mesa.
- [X] Excluir mesa exige digitar o nome exato pra confirmar
- [X] Excluir mesa remove também personagens e resumo (checar que não sobra lixo) - onde chegar se sobra? Quando crio uma criatura e apago a mesa, ela some junto.
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

- Após voltar da verificação de email sou redirecionado para "https://www.masterhud.com.br/login" mas o que aparece é: 
This page doesn’t exist
It may have been moved, removed, or never existed.

404 NOT_FOUND

gru1::bnrwf-1794103857696-bf04e0673c51

Debug this error

404 NOT_FOUND

Request ID: gru1::bnrwf-1794103857696-bf04e0673c51
URL: https://www.masterhud.com.br/login
User agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 OPR/138.0.0.0
Docs for this error code: https://vercel.com/docs/errors/not_found
-
- ao tentar acessar "https://www.masterhud.com.br/jogos" mesmo logado sou jogado para uma página preta escrita "This page doesn't exist": This page doesn’t exist
It may have been moved, removed, or never existed.

404 NOT_FOUND

gru1::48ngz-1794105720293-c02f64b43226

Mas se eu clico no card de "mesas" o caminho funciona

- Os erros com links após atualizar a página está acontecendo com todos os caminhos, menos o menu principal

- Atributos não tem limite de pontos, eu consegui deixar uma criatura ter 1010 pontos em sabedoria 

---

## Ajustes necessários

- [X] Landing page - emoji de chave (🔑) está totalmente destoante dos outros ícones na tela (⌘, ⚔, ⬡)
- [X] Menu principal - Mesma situação da langing page, o emoji (📖) está destoante dos demais

- Criação de personsagens: Adicionado as três imagens dos estados do personagem e apareceu a mensagem: The value of property "imagemUrl" is longer than 1048487 bytes.
Tentei trocar as fotos e o erro foi: Document 'projects/masterhud-tool/databases/(default)/documents/usuarios/iae9ISVhHAPM7dFrA5GdNA6aRQ03/mesas/nXGRYtqRrL4fqXICkI6N/personagens/vwJZz3ilOstRJeTKIr4m' cannot be written because its size (2,539,345 bytes) exceeds the maximum allowed size of 1,048,576 bytes.
- Não tem como remover a foto selecionada. Eu escolhi, mas não tenho como me arrepender e deixar sem foto
-

## Dúvidas

- "jeffsaj_cat@h.com" - esse tipo de email é aceito pela ferramenta, sei que apesar disso a pessoa não vai conseguir logar porque não vai conseguir confirmar o email, mas pensando em despediçar o envio da confirmação por email para algo inexistente eu pesquisei umas soluções e achei isso:
[...]"O Script Ideal para quem já usa Ativação

Você pode criar uma função que barra o usuário imediatamente no formulário se o e-mail falhar em qualquer um destes critérios:
1. Contiver espaços (como o seu exemplo inicial).
2. Tiver um domínio curto demais (como h.com, a.br, x.io).
3. Usar sequências repetidas e óbvias de digitação rápida no teclado (como abc@, 123@, asdf@).
"[...]

- Coletar nome e Nickname, até porque se eu posso alterar meu nome no perfil, seria melhor ter um campo para nickname.
- Eu apaguei um cadastro do firebase e ele continuou falando que o email já estava cadastrado, coloquei para alterar a senha, recebi o email, alterei e por fim consegui logar, mas ainda não encontro no registro do firebase