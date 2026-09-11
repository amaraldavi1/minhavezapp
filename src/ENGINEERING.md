# Engenharia

## Stack
React 18 + Vite + React Router. Firebase Realtime Database e Auth.
Testes: Vitest + @testing-library/react. Emulador: firebase emulators:start

## Comandos
npm ci / npm test / npm run dev

## Estrutura
Componentes e telas em src/. Acesso ao Firebase isolado em src/services/.
Nenhum componente chama o SDK do Firebase diretamente.
Testes em src/**/<nome>.test.jsx, ao lado do arquivo testado.

## Branches e commits
Nunca commitar em main. feat/<slug>, fix/<slug>. Conventional Commits.

## Regra de decisão — requer aprovação humana
- Qualquer alteração em database.rules.json ou storage.rules
- Qualquer mudança no modelo de dados sob /bakeries ou /users
- Qualquer dependência nova
- Qualquer coisa que afete isolamento entre padarias

## PRs
Máximo ~400 linhas. Descrição: o que mudou, como verifiquei, o que ficou de fora.
