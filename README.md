# 🍞 Minha Vez — Fila digital para padarias (SaaS)

Sistema multi-tenant de gerenciamento de fila com sincronização em tempo real.
Cada padaria tem sua própria conta, fila isolada e QR Code exclusivo.

## Arquitetura

- **Frontend:** React + Vite + React Router
- **Backend:** Firebase Realtime Database (estado da fila em tempo real)
- **Auth dos donos:** Firebase Auth — login por **link mágico** (sem senha)
- **Clientes:** Firebase Auth anônimo (invisível, identifica o dispositivo)

### Modelo de dados

```
/bakeries/{bakeryId}
  /info    { name, ownerUid, createdAt }
  /state   { nextTicketNumber, currentlyServing }
  /waiting/{senha} { number, joinedAt }

/users/{uid}  { bakeryId, email }
```

### Rotas

| Rota | Quem usa | Descrição |
|------|----------|-----------|
| `/` | Visitante | Landing — leva o dono ao login |
| `/painel/login` | Dono | Envio/conclusão do link mágico |
| `/painel` | Dono (autenticado) | Onboarding (1ª vez) → painel da fila |
| `/fila/:bakeryId` | Cliente | Tela de fila acessada via QR Code |

## Configuração do Firebase

1. **Crie um projeto** em [console.firebase.google.com](https://console.firebase.google.com)

2. **Realtime Database** → Criar banco de dados

3. **Authentication → Sign-in method**, habilite:
   - **E-mail/senha** → ative a opção **"Link de e-mail (login sem senha)"**
   - **Anônimo** (para os clientes)

4. **Authentication → Settings → Authorized domains**: adicione o domínio de
   produção (localhost já vem liberado)

5. **Registre um app Web** e copie as credenciais para o `.env.local`
   (veja `.env.example`)

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com suas credenciais
npm run dev
```

## Deploy (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # selecione seu projeto

npm run build
firebase deploy               # publica hosting + regras de segurança
```

As regras de segurança (`database.rules.json`) garantem que:
- Qualquer pessoa **lê** a fila de uma padaria (necessário para o cliente)
- Só o **dono autenticado** muda `currentlyServing` e reseta a fila
- Clientes só conseguem **incrementar** o contador de senha em +1 (anti-fraude)
- Cada usuário só acessa o próprio registro em `/users`

## Fluxo de uso

1. Dono acessa `/painel/login`, recebe o link mágico, entra
2. Na 1ª vez, cadastra o nome da padaria (onboarding)
3. No painel, clica em **"Mostrar QR Code"** e imprime/expõe no balcão
4. Cliente escaneia → cai em `/fila/{bakeryId}` → pega senha
5. Tudo sincroniza em tempo real entre todos os dispositivos
