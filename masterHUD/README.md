# MasterHUD

Ferramenta para mestres de RPG. Login, perfil, mesas e personagens rodam no Firebase (Auth + Firestore), vinculados à sua conta — acesse de qualquer computador fazendo login.

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Configurar o Firebase (necessário para login funcionar)
# Crie masterHUD/.env.local com as chaves do projeto Firebase:
#   VITE_FIREBASE_API_KEY=...
#   VITE_FIREBASE_AUTH_DOMAIN=...
#   VITE_FIREBASE_PROJECT_ID=...
#   VITE_FIREBASE_STORAGE_BUCKET=...
#   VITE_FIREBASE_MESSAGING_SENDER_ID=...
#   VITE_FIREBASE_APP_ID=...

# 3. Rodar em modo dev
npm run dev
```

Acesse http://localhost:5173

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Firebase Auth** — login/cadastro, verificação de email
- **Firestore** — perfil do usuário, mesas e personagens, com cache local automático (`persistentLocalCache`)
- **React Router v6** — navegação entre telas, com rotas protegidas por sessão
- Sem bibliotecas de UI — design próprio com CSS-in-JS inline
- **Deploy (Vercel)** — `vercel.json` reescreve qualquer caminho pra `index.html`; sem isso, o React Router funciona navegando por dentro do app (clicando em links), mas recarregar a página (F5) ou abrir uma URL interna direto (ex: `/jogos`) dá 404 puro do Vercel, porque ele tenta servir um arquivo físico nesse caminho antes do React Router sequer carregar

## Rotas disponíveis

| Rota | Tela | Acesso |
|------|------|--------|
| `/login` | Login | público |
| `/register` | Cadastro | público |
| `/` | Landing (deslogado) / Menu principal (logado) | condicional |
| `/perfil` | Perfil do usuário | logado |
| `/jogos` | Lista de mesas (suas e as que você entrou como jogador) | logado |
| `/mesa/nova` | Criar nova mesa | logado |
| `/mesa/entrar` | Entrar numa mesa via código de convite | logado |
| `/mesa/:donoUid/:id` | Gerenciador da mesa (visão completa pro dono, reduzida pro jogador) | logado |
| `/mesa/:donoUid/:id/combate` | Tela de combate (só o mestre; jogador é redirecionado) | logado |
| `/mesa/:donoUid/:id/personagem/novo` | Criar personagem/NPC | logado |
| `/mesa/:donoUid/:id/personagem/:pid` | Ver ficha | logado |
| `/mesa/:donoUid/:id/personagem/:pid/editar` | Editar ficha | logado |
| `/compendio` | Compêndio do Mestre (notas pessoais) | logado |

## Arquitetura de dados

Tudo vive no Firestore, aninhado embaixo da conta do dono da mesa:

```
usuarios/{uid}                                            perfil (nome, email, criadoEm)
usuarios/{uid}/mesasParticipando/{mesaId}                 índice pessoal: mesas de outros donos que você entrou (donoUid, personagemId)
usuarios/{uid}/mesas/{mesaId}                              Mesa (com `molde` embutido, `membros[]`, `conviteCodigo`)
usuarios/{uid}/mesas/{mesaId}/personagens/{personagemId}   Personagem (jogador/npc/monstro, jogador tem `jogadorUid`)
usuarios/{uid}/mesas/{mesaId}/resumo/jogadores             Projeção só com HP/nome/foto dos personagens tipo jogador (nunca NPC) — o que um jogador comum pode ler do resto do grupo
usuarios/{uid}/mesas/{mesaId}/membrosInfo/{memberUid}      { nome } autodeclarado por cada jogador ao entrar — só o mestre lê (precisa pra montar o dropdown de atribuir ficha, já que não pode ler o perfil de outra conta)
convites/{codigo}                                          { donoUid, mesaId, mesaNome, sistema } — só leitura direta por código (nunca listagem, pra não dar pra enumerar convite de mesa de ninguém)
```

`src/db/index.ts` lê o usuário logado internamente (`auth.currentUser`) pra tudo que é "minha conta", mas toda função que lê/escreve uma mesa recebe `donoUid` explicitamente — uma conta pode não ser dona da mesa que está acessando. As regras do Firestore (`masterHUD/firestore.rules`) são o que de fato impede um jogador de ler ficha de NPC ou de outro jogador; a UI só reflete o que as regras permitem.

`Combate`/`CombatParticipant` continuam existindo só como tipos TypeScript — a ordem de turno hoje é passada entre telas via `location.state` do router, nunca persistida (ver "O que falta").

A tela `/stream` (overlay pra compartilhar com jogadores sem acesso à ferramenta) foi removida nessa migração — ficava obsoleta assim que cada jogador tem conta própria e consegue entrar na mesa pelo convite.

## O que já temos

- Landing page pública em `/` (para quem não está logado) com botões Entrar/Cadastrar
- Login / Cadastro (Firebase Auth) com rotas protegidas e recuperação de senha
- Perfil do usuário — nome, foto (redimensionada no cliente, guardada só no Firestore), frase, logout com confirmação
- Política de senha forte no cadastro (12+ caracteres, maiúscula, minúscula, número, caractere especial, sem sequências óbvias como `123456`/`qwerty`), com checklist visual em tempo real (`src/utils/senha.ts`)
- Verificação de email obrigatória — conta nova fica bloqueada em todas as rotas protegidas até confirmar o link enviado por email (`src/components/VerifyEmailGate.tsx`)
- Modal de rolagem de dados (pública/privada)
- Gerenciador de mesa, combate com iniciativa/turnos, fichas de personagem/NPC/monstro
- Toggle "Modo mestre/audiência" no Combate — esconde HP/descrições de NPC quando o mestre compartilha a própria tela
- Rodapé de atalhos flutuante no Combate (canto inferior central) com acesso rápido a Fichas (modal com HP dos jogadores + link de edição em nova aba) e Dados completo (rolador avançado) — o terceiro atalho, Chat, está no lugar mas sem lógica (ver "O que falta")
- **Mesas e personagens persistem por conta no Firestore** — acesse de qualquer computador fazendo login
- Compêndio do Mestre (`/compendio`) — notas pessoais, abre em nova aba a partir da Home
- Estado vazio (conta nova, zero mesas)
- **Compartilhamento de mesa via código de convite** — mestre gera um código em `Gerenciador → Compartilhar mesa`; jogador entra em `/mesa/entrar`, reivindica um personagem jogador já criado (ainda sem dono) ou cria o seu; mestre pode remover um jogador da mesa depois
- **Fichas privadas** — jogador vê a própria ficha completa e um resumo (nome/HP/foto) dos outros jogadores, mas nunca a ficha de NPCs/monstros nem a ficha completa de outro jogador; isso é garantido pelas regras do Firestore, não só por esconder na UI
- Visão reduzida do Gerenciador pra quem entra como jogador (sem Zona de risco, NPCs ou gerenciador de combate); `Combate` continua exclusivo do mestre
- Editar nome/descrição da mesa depois de criada (`Gerenciador → Informações da mesa`) — o sistema (`dnd5e`/`tormenta20`/`custom`) não pode ser trocado depois, porque muda os atributos que as fichas já existentes esperam
- Mestre vê quem é dono de cada ficha ("Jogado por: fulano", inclusive na própria ficha) e pode atribuir/trocar o dono de uma ficha direto por um dropdown com quem já entrou na mesa — com checagem pra não deixar o mesmo jogador com duas fichas ao mesmo tempo
- Upload de imagem (perfil e fichas) sempre passa por `src/utils/imagem.ts`, que redimensiona pra um quadrado pequeno (160–200px) antes de virar base64 — documentos do Firestore têm limite de 1MB, e uma foto de câmera em tamanho original estoura isso fácil
- Imagem da mesa pode ser definida já na criação (`/mesa/nova`), não só depois no Gerenciador
- Mesa pode ser "encerrada" (campanha finalizada, some da aba "Ativas" em `/jogos`) além de pausada/excluída — reversível a qualquer momento (`Zona de risco → Encerrar mesa` / botão "Reabrir mesa" na lista)
- Dados rápidos no Combate (d4–d20) acumulam na expressão em vez de rolar na hora — dá pra clicar várias vezes (soma o mesmo tipo de dado) e só rola de fato ao confirmar

## Segurança

- **Senha**: a regra de complexidade (12+ caracteres, maiúscula/minúscula/número/especial) é validada no cliente antes de chamar o Firebase. Recomendado reforçar também no servidor em Firebase Console → Authentication → Settings → Password policy, marcando "Enforce" e os mesmos requisitos (exceto a checagem de sequências como `123456`/`qwerty`, que o Firebase não suporta nativamente — fica só no cliente).
- **Verificação de email**: todo cadastro novo recebe automaticamente um email de verificação (`sendEmailVerification`) e fica bloqueado por `ProtectedRoute`/`VerifyEmailGate` até confirmar. **Contas criadas antes dessa mudança não têm o email verificado** e vão ver essa tela na próxima vez que acessarem — inclusive contas de teste já existentes.
- **Sessão inválida**: toda função de `src/db/index.ts` é envolvida por um `guarded()` — se o Firestore recusar uma chamada por `unauthenticated` (token revogado, ou conta deslogada em outro lugar), a sessão é encerrada automaticamente e a tela de login mostra "Sua sessão expirou". Entre abas do mesmo navegador, isso já acontece de graça via `onAuthStateChanged` do Firebase — sem precisar de nada extra. **`permission-denied` não força mais logout** (decisão revertida depois de observar na prática que esse código quase nunca significa sessão inválida — é o resultado normal de uma regra negando algo que faz sentido negar, como um jogador removido da mesa ou uma ficha desvinculada entre uma tela e outra; um token realmente inválido aparece como `unauthenticated`, não `permission-denied`). Em vez disso, cada tela que lê uma mesa/ficha específica de quem não é dono (`GerenciadorJogador`, `FichaPersonagem`, `PersonagemForm`) captura esse erro localmente e redireciona pra `/jogos` com o aviso "Você perdeu o acesso a essa mesa" (`ACESSO_REVOGADO_KEY`), sem mexer na sessão.
- **Regras do Firestore** (`masterHUD/firestore.rules`, versionado no repo e colado manualmente no Firebase Console) — cobrem mesas, personagens, o resumo do grupo e os convites. Um ponto que vale registrar pra quem for alterar essas regras: `convites/{codigo}` libera `get` (buscar um código específico) mas bloqueia `list` por completo — sem isso, qualquer conta logada poderia listar o convite de toda mesa de todo mestre. Além disso, qualquer `getDocs`/query sem filtro numa coleção que mistura documentos com permissões diferentes (como `personagens`, que tem NPC e jogador juntos) é **negada por completo** pelo Firestore se puder teoricamente retornar algo que o usuário não pode ler — por isso consultas feitas por quem não é dono da mesa usam `where` explícito (ex: `getSlotsLivres`) em vez do `getPersonagens` genérico.

## O que falta

- Chat mestre ↔ jogadores — é o terceiro atalho do rodapé flutuante no Combate (💬), já no lugar, mas sem lógica implementada
- Revogar/regenerar código de convite, e jogador conseguir "sair da mesa" sozinho — hoje só o mestre consegue remover um jogador manualmente - esconder o código de convite
- Tela do jogador durante o combate precisa ser reformulada, não só "ficar em tempo real" — feedback de teste real (3 contas): jogador quer rolar os próprios dados, ver a própria ficha e a vida dos aliados tudo na mesma tela, ao vivo; hoje ele só vê o resumo do grupo (HP), que fica obsoleto até o mestre recarregar o Gerenciador. Tecnicamente depende de trocar leitura "busca uma vez" por `onSnapshot`, mas o problema é também de design de tela, não só de atualização
- Tela de molde da mesa — hoje só é definido um padrão na criação da mesa, sem UI para editar depois
- Marcar status do personagem (vivo/morto/inconsciente) manualmente — o campo existe no modelo (`Personagem.status`) mas não há UI para alterá-lo
- O toggle "Modo mestre/audiência" do Combate hoje só esconde HP de NPC — poderia esconder também descrição de ataques, e/ou ganhar um equivalente no Gerenciador

## Considerações e ideias

- Loja de itens que o mestre pode criar e disponibilizar para os jogadores comprarem - O jogador vai na sessão "loja" e lá ele pode comprar o item com o dinheiro que ele tem na ficha do personagem. Aqui temos duas visões o do Mestre e o do jogador. O mestre é capaz de adicionar, editar e remover itens, o jogador só consegue comprar ou modificar a quantidade que quer comprar daquele item - mestre também decide quantas versões daquele item ficam disponíveis para evitar que itens raros seram comprados aos montes
* OBS.: Adicionar um campo "Dinheiro" na ficha de cada personagem — provável candidato a reaproveitar o mesmo padrão flexível do `molde` (atributos customizáveis por mesa), já que o tipo de moeda varia por sistema (ouro/prata/bronze, etc.)
* Possibilidade de jogar uma informação direto na tela do jogador? Pensar sobre. Depende de trocar leitura "puxar uma vez" por listener em tempo real (`onSnapshot`) — a mesma mudança técnica do item "Combate ao vivo" em "O que falta".
- Enciclopédia de Raças, Classes, Origens, Divindades, Magias e Poderes — conteúdo próprio (não importar material oficial de sistemas como D&D sem checar licença/SRD antes)
- Bestiário + "salvar NPCs/criaturas pra reaproveitar entre campanhas" — são a mesma feature na prática: `Personagem` já tem `tipo: 'monstro'`, então isso vira uma biblioteca pessoal de personagens não presos a uma mesa específica, e "importar" é só copiar o registro pra dentro de uma mesa
- Campo "Nickname" separado de "Nome" no perfil — hoje só existe `nome` (o mesmo que aparece editável em `/perfil` e é usado como saudação); avaliar se faz sentido ter os dois ou se um só já resolve
- Cortar/zoom da foto - crop + zoom interativo 

## Próxima prioridade

Nenhuma definida ainda. A rodada atual é uma passada de testes manuais gerais (UI/UX, navegabilidade, segurança entre contas, entrada de dados maliciosa) — checklist em [`CHECKLIST_TESTES.md`](./CHECKLIST_TESTES.md).
