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

## Rotas disponíveis

| Rota | Tela | Acesso |
|------|------|--------|
| `/login` | Login | público |
| `/register` | Cadastro | público |
| `/` | Landing (deslogado) / Menu principal (logado) | condicional |
| `/perfil` | Perfil do usuário | logado |
| `/jogos` | Lista de mesas | logado |
| `/mesa/nova` | Criar nova mesa | logado |
| `/mesa/:id` | Gerenciador da mesa | logado |
| `/mesa/:id/combate` | Tela de combate | logado |
| `/mesa/:id/personagem/novo` | Criar personagem/NPC | logado |
| `/mesa/:id/personagem/:pid` | Ver ficha | logado |
| `/mesa/:id/personagem/:pid/editar` | Editar ficha | logado |

## Arquitetura de dados

Tudo vive no Firestore, aninhado embaixo da conta do usuário:

```
usuarios/{uid}                                            perfil (nome, email, criadoEm)
usuarios/{uid}/mesas/{mesaId}                              Mesa (com `molde` embutido)
usuarios/{uid}/mesas/{mesaId}/personagens/{personagemId}   Personagem (jogador/npc/monstro)
```

`src/db/index.ts` lê o usuário logado internamente (`auth.currentUser`) — nenhuma página precisa passar `uid` manualmente. Ainda é **só individual**: cada conta só enxerga suas próprias mesas, sem compartilhar com outras contas (ver "Próxima prioridade").

`Combate`/`CombatParticipant` continuam existindo só como tipos TypeScript — a ordem de turno hoje é passada entre telas via `location.state` do router, nunca persistida (ver "O que falta").

A tela `/stream` (overlay pra compartilhar com jogadores sem acesso à ferramenta) foi removida nessa migração — ficava obsoleta assim que cada jogador tem conta própria (ver "Próxima prioridade").

## O que já temos

- Landing page pública em `/` (para quem não está logado) com botões Entrar/Cadastrar
- Login / Cadastro (Firebase Auth) com rotas protegidas e recuperação de senha
- Perfil do usuário — ver e editar nome, logout
- Política de senha forte no cadastro (12+ caracteres, maiúscula, minúscula, número, caractere especial, sem sequências óbvias como `123456`/`qwerty`), com checklist visual em tempo real (`src/utils/senha.ts`)
- Verificação de email obrigatória — conta nova fica bloqueada em todas as rotas protegidas até confirmar o link enviado por email (`src/components/VerifyEmailGate.tsx`)
- Modal de rolagem de dados (pública/privada)
- Gerenciador de mesa, combate com iniciativa/turnos, fichas de personagem/NPC/monstro
- Toggle "Modo mestre/audiência" no Combate — esconde HP/descrições de NPC quando o mestre compartilha a própria tela
- **Mesas e personagens persistem por conta no Firestore** — acesse de qualquer computador fazendo login
- Estado vazio (conta nova, zero mesas)

## Segurança

- **Senha**: a regra de complexidade (12+ caracteres, maiúscula/minúscula/número/especial) é validada no cliente antes de chamar o Firebase. Recomendado reforçar também no servidor em Firebase Console → Authentication → Settings → Password policy, marcando "Enforce" e os mesmos requisitos (exceto a checagem de sequências como `123456`/`qwerty`, que o Firebase não suporta nativamente — fica só no cliente).
- **Verificação de email**: todo cadastro novo recebe automaticamente um email de verificação (`sendEmailVerification`) e fica bloqueado por `ProtectedRoute`/`VerifyEmailGate` até confirmar. **Contas criadas antes dessa mudança não têm o email verificado** e vão ver essa tela na próxima vez que acessarem — inclusive contas de teste já existentes.
- **Sessão inválida**: toda função de `src/db/index.ts` é envolvida por um `guarded()` — se o Firestore recusar uma chamada por `permission-denied`/`unauthenticated` (token expirado, revogado, ou conta deslogada em outro lugar), a sessão é encerrada automaticamente e a tela de login mostra "Sua sessão expirou". Entre abas do mesmo navegador, isso já acontece de graça via `onAuthStateChanged` do Firebase — sem precisar de nada extra.

## O que falta

- **Entrar numa mesa via código de convite** — hoje cada mesa só é visível pra conta que a criou; falta o modelo de compartilhamento entre contas
- **Jogador acompanhar HP (seu e dos outros) dentro do app** — depende do item acima (precisa primeiro existir acesso de jogador a uma mesa que não é a dele)
- **Fichas privadas** — o mestre vê a ficha de todos os jogadores da mesa; cada jogador só a própria (evita metagame). Só faz sentido quando existir mais de uma conta acessando a mesma mesa
- Chat mestre ↔ jogadores — botão existe na tela de combate, sem lógica implementada
- Tela de molde da mesa — hoje só é definido um padrão na criação da mesa, sem UI para editar depois
- Marcar status do personagem (vivo/morto/inconsciente) manualmente — o campo existe no modelo (`Personagem.status`) mas não há UI para alterá-lo
- O toggle "Modo mestre/audiência" do Combate hoje só esconde HP de NPC — poderia esconder também descrição de ataques, e/ou ganhar um equivalente no Gerenciador

## Próxima prioridade

Compartilhamento entre contas: convite por código pra um jogador entrar numa mesa do mestre. Hoje o modelo é `usuarios/{uid}/mesas/{mesaId}` (só o dono vê) — compartilhar exige repensar essa estrutura (provavelmente uma coleção de mesas separada da árvore do dono, com lista de membros) e as regras de segurança do Firestore que vêm junto.
