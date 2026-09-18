# PoolSafe — Frontend

Aplicativo mobile do PoolSafe em React Native + Expo.

## Requisitos

- Node.js 24 LTS
- npm
- Expo CLI (`npm install -g expo-cli` ou via `npx expo`)
- Android SDK / emulador para validação (Development Build)

## Bootstrap

```bash
# 1. Instalar dependências
npm install

# 2. Verificar TypeScript
npm run typecheck

# 3. Verificar saúde do projeto Expo
npm run doctor

# 4. Iniciar o servidor de desenvolvimento
npm start
```

## Estrutura

```
app/                  Rotas do Expo Router
  _layout.tsx         Layout raiz (providers, navegação)
  index.tsx           Rota inicial

src/
  providers/          Providers globais (QueryClient, etc.)
  theme/              Tokens visuais do design system
```

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha os valores:

```bash
cp .env.example .env.local
```

## Pendências do bootstrap

Consulte `.agents/BOOTSTRAP_PENDENCIAS.md` na raiz do workspace.
