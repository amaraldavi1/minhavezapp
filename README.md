# Minha Vez — Gestão de filas digitais (SaaS)

Sistema **multi-tenant** de gerenciamento de filas por senha com sincronização
em tempo real. Serve qualquer negócio que precise organizar atendimento —
barbearias, clínicas, cartórios, comércios, órgãos públicos, pet shops, etc.
Cada estabelecimento tem sua própria conta, fila isolada e QR Code exclusivo.

## Arquitetura

- **Frontend:** React + Vite + React Router (SPA, sem backend próprio)
- **Backend:** Firebase Realtime Database (estado da fila em tempo real)
- **Auth dos gestores:** Firebase Auth — login por **link mágico** (sem senha)
- **Clientes:** Firebase Auth anônimo (invisível, identifica o dispositivo)
- **Logomarcas:** Firebase Storage
- **Segurança:** Regras do RTDB + Storage como camada de autorização

### Modelo de dados

```
/superadmins/{uid}: true

/bakeries/{bakeryId}
  /info    { name, ownerUid | 'unclaimed', ownerEmail?, createdAt, menuUrl?, logoUrl? }
  /state   { nextTicketNumber, currentlyServing, servingName? }
  /waiting/{senha} { number, joinedAt, uid?, name? }

/users/{uid}            { bakeryId, email }
/invites/{email}        { bakeryId, bakeryName, ownerEmail, createdAt }
/allowedEmails/{email}: true          // allowlist pública para envio do link mágico
```

> `{email}` é o e-mail com `.` trocado por `,` (chave válida no Firebase).

### Rotas

| Rota | Quem usa | Descrição |
|------|----------|-----------|
| `/` | Visitante | Landing — apresenta o produto e leva ao login |
| `/painel/login` | Gestor | Envio/conclusão do link mágico |
| `/painel` | Gestor (autenticado) | Confirmação de convite → painel da fila (ou "acesso restrito") |
| `/fila/:bakeryId` | Cliente | Tela de fila acessada via QR Code |
| `/monitor/:bakeryId` | Balcão | Painel de senhas em tempo real (TV/monitor) |
| `/admin` | Superadmin | Gerencia todos os estabelecimentos e administradores |

## Cadastro manual (convite pelo superadmin)

Para a primeira versão, **o cadastro de estabelecimentos é feito manualmente
pelo superadmin** — não há auto-registro. O fluxo:

1. No `/admin`, o superadmin cria o estabelecimento (nome + e-mail do responsável).
   A conta nasce como `ownerUid: 'unclaimed'` e o e-mail entra na `allowedEmails`.
2. O superadmin envia o **link mágico** para o responsável pelo próprio painel.
3. O responsável faz login e vê a tela **"Bem-vindo! Você foi convidado"** →
   confirma o acesso e assume o estabelecimento.
4. E-mails fora da `allowedEmails` recebem **"Acesso restrito"** e nenhum link é enviado.

## Configuração do Firebase

1. **Crie um projeto** em [console.firebase.google.com](https://console.firebase.google.com)
2. **Realtime Database** → Criar banco de dados
3. **Authentication → Sign-in method**, habilite:
   - **E-mail/senha** → ative **"Link de e-mail (login sem senha)"**
   - **Anônimo** (para os clientes)
4. **Storage** → ative (para as logomarcas)
5. **Authentication → Settings → Authorized domains**: adicione o domínio de produção
6. **Registre um app Web** e copie as credenciais para o `.env.local` (veja `.env.example`)

## Superadmin (painel `/admin`)

O acesso é controlado pelo nó `/superadmins/{uid}` — fonte de verdade das regras
de segurança. Para **promover o primeiro superadmin** (bootstrap manual, uma vez):

1. Adicione o e-mail do superadmin em `/allowedEmails/{email}` (com `.` → `,`)
2. Faça login em `/painel/login` com esse e-mail
3. No Console → **Authentication → Users**, copie o **User UID**
4. No Console → **Realtime Database**, crie:
   ```json
   { "superadmins": { "COLE_O_UID_AQUI": true } }
   ```
5. Recarregue — o botão **⚙️ Admin** aparece e a rota `/admin` fica liberada

## Link para clientes

No painel, o gestor pode salvar uma URL (`info.menuUrl`) que aparece como
**"📄 Mais informações"** na tela do cliente, antes de entrar na fila.
Pode ser cardápio, catálogo, site, Instagram, etc.

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
firebase deploy               # publica hosting + regras (database + storage)
```

As regras de segurança garantem que:
- Qualquer pessoa **lê** a fila de um estabelecimento (necessário para o cliente)
- Só o **dono autenticado** muda `currentlyServing`/`servingName` e reseta a fila
- Clientes só conseguem **incrementar** a senha em +1 e mexer no **próprio** ticket
- Só o superadmin escreve em `/bakeries` (listagem), `/invites` e `/allowedEmails`

---

# 🗺️ Roadmap

Elaborado a partir do **Scan Q** (produto de referência do vídeo), mapeando suas
funcionalidades contra o estado atual do **Minha Vez**. A priorização considera a
stack atual (Firebase RTDB + SPA, **sem backend próprio**): o que dá para fazer só
no front + regras entra em **médio prazo**; o que exige servidor e provedores pagos
(SMS/WhatsApp/voz/IA) vai para **longo prazo**.

## ✅ Já implementado

- Fila em tempo real multi-tenant (um QR Code por estabelecimento)
- Entrada do cliente por QR Code + auth anônimo
- Painel do atendente: chamar próximo, marcar atendido, resetar fila
- **Senha manual** para clientes sem celular (com nome opcional)
- **Monitor/TV** com chamada em destaque, QR de entrada e nome do cliente
- Logomarca + link para clientes (cardápio/catálogo/site)
- Cadastro por **convite** (superadmin) + allowlist de e-mails
- Painel de superadmin (CRUD de estabelecimentos e administradores)
- Aviso no dispositivo do cliente (som + vibração) quando é a vez

## 🎯 Médio prazo — viável na stack atual

Agrupado pelas mesmas seções da página de configurações do Scan Q:

### Perfil do estabelecimento
- [ ] **Tipo de negócio** (restaurante, clínica, barbearia, evento...) com defaults
- [ ] **Slug amigável** na URL do cliente (`/fila/joesbarbers` em vez do id)
- [ ] Descrição/tagline, telefone e endereço
- [ ] **Fuso horário** (relógio do monitor e relatórios corretos)
- [ ] **Ticker** no monitor — linha rolante com avisos (Wi-Fi, promoções)
- [ ] Escolher quais campos aparecem **sob o nome no monitor**

### Configurações da fila
- [ ] **Abrir/fechar fila** (interruptor mestre) — hoje só existe "resetar"
- [ ] **Tamanho máximo** da fila (fecha automaticamente ao atingir)
- [ ] **Tempo médio de atendimento** → **estimativa de espera** para o cliente
- [ ] **Party size** (mais de uma pessoa numa senha) + cálculo ponderado
- [ ] **Self-serve**: cliente marca a própria senha como atendida
- [ ] **Auto ausência** (no-show): marca ausente após X minutos sem comparecer
- [ ] **Mensagens personalizáveis** por estado (chamado, aguardando, obrigado,
      ausente), com textos padrão sensatos

### Serviços e guichês
- [ ] **Serviços** (corte/barba, consulta/exame) — prefixo de senha por serviço (A001, B001)
- [ ] **Guichês/atendentes**: chamar "senha X → guichê Y"; monitor mostra o guichê
- [ ] Cliente **escolhe o serviço/atendente** ao entrar (ou pool compartilhado)
- [ ] Capacidade paralela por serviço (quantos em paralelo)

### Formulário de entrada
- [ ] Campos configuráveis (nome, telefone, e-mail, observações) — mostrar/obrigatório
- [ ] **Renomear rótulos** dos campos
- [ ] **Campos personalizados** (texto, seleção, checkbox, número) e ordem

### Equipe
- [ ] **Login de equipe por PIN** (rota `/staff`) com papéis (atendente/gerente)
- [ ] Adicionar membros por PIN ou convite, com status ativo/pendente

### Monitor / chamada
- [ ] **Chamada por voz (TTS)** — Web Speech API, sem custo ("Senha 42, guichê 3")
- [ ] **Rechamar** senha e diferenciar **ausência × desistência**

### Relatórios
- [ ] Tempo médio de espera/atendimento, volume por hora/dia, desistências, por atendente
- [ ] Base: registrar eventos (`chamada`, `atendido`, `ausência`) com timestamp em `/history`

### Plataforma
- [ ] **Página de Configurações** unificada (seções recolhíveis + botão "Salvar"
      que só aparece quando há mudança) — o padrão do Scan Q
- [ ] **PWA**: app instalável (base para push no futuro)

## 🌟 Longo prazo — exige backend + provedores pagos

Requer Cloud Functions (ou servidor) e, quase sempre, custo por mensagem:

- [ ] **Notificações SMS / WhatsApp / E-mail** (boas-vindas, "quase sua vez",
      chamado, alerta p/ equipe) + **medidor de uso** e **compra de créditos**
- [ ] **Chamadas de voz** e **Recepcionista IA** (entrar na fila por chat/voz/telefone)
- [ ] **Agendamento online** (booking): página pública, horários por dia,
      antecedência mínima, tolerância de no-show
- [ ] **Pedido de avaliação no Google** pós-atendimento
- [ ] **Reference List**: upload de CSV diário para auto-identificar clientes
- [ ] Configurações de **evento/imobiliária** (aviso de fechamento, slots de vistoria)
- [ ] **Planos e cobrança** (Free / Growth / Pro / Enterprise) com gating + Stripe;
      habilita o **auto-registro com trial** no lugar do cadastro manual
- [ ] **Mídia/publicidade** no monitor, **multi-idioma** e **white-label** (cores/tema)

## 🔧 Débitos técnicos

- [ ] **Danger zone**: excluir conta/estabelecimento com confirmação por digitação do nome
- [ ] Remover código morto (`Onboarding.jsx`, `createBakery` — auto-registro desativado)
- [ ] Extrair a lógica de fila para hooks reutilizáveis (`useQueue`)
- [ ] Testes automatizados (regras de segurança + fluxo de fila)
- [ ] Code-splitting do bundle (hoje > 500 kB)

## Referências

- **Vídeo de referência:** Scan Q — visão geral da página de configurações
  (base para o mapeamento de features acima)
- Mercado (sistemas de senha/fila BR):
  [SGM (voz na TV)](https://sistemadesenha.com.br/sistema-de-senha-por-tv/) ·
  [Spider (TV/LED)](https://www.spider.com.br/chamada-de-senhas-e-atendimento-de-filas-pela-tve-e-painel-led.php) ·
  [Q.track (relatórios)](https://q.track.pt/gestao-de-filas/) ·
  [TiraSenha (totem/impressora)](https://www.tirasenha.com/)
