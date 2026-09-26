# PoolSafe — Frontend

Aplicativo mobile do PoolSafe em React Native + Expo.

## Requisitos

- Node.js 24 LTS
- npm
- Expo CLI (`npm install -g expo-cli` ou via `npx expo`)
- Android SDK / emulador para validação (Development Build)

## Execução e Desenvolvimento

```bash
# 1. Instalar dependências
npm install

# 2. Verificar TypeScript
npm run typecheck

# 3. Verificar saúde do projeto Expo
npm run doctor

# 4. Iniciar o servidor de desenvolvimento (Metro Bundler)
npm start

# Iniciar com cache limpo (recomendado após alterar dependências ou babel)
npx expo start -c

# 5. Compilar e executar no emulador/dispositivo Android (Development Build)
npm run android
```

## Solução de problemas no Windows (Limite de 260 caracteres no CMake / Ninja)

Na **Nova Arquitetura** do React Native, módulos nativos C++ (Fabric / Codegen) são compilados localmente com CMake e Ninja. No Windows, caminhos longos de diretório (como `C:\Users\<usuario>\Documents\...`) podem estourar o limite de 260 caracteres (`MAX_PATH`), resultando no erro:
> `ninja: error: Stat(...): Filename longer than 260 characters`

### Solução com Drive Virtual (`subst`):
Crie uma letra de unidade virtual apontando para a **pasta mãe do repositório**:

```powershell
# 1. Criar o drive virtual P: apontando para a pasta raiz do repositório
subst P: C:\Users\<SeuUsuario>\Documents\Github-Poolsafe-TCC

# 2. Acessar o frontend pela unidade virtual
cd P:\poolsafe-app-frontend

# 3. Limpar cache de compilação antigo (se houver)
Remove-Item -Recurse -Force android\app\.cxx

# 4. Compilar e rodar normalmente
npx expo run:android
```

> **Atenção:** Mapeie sempre a pasta mãe (`Github-Poolsafe-TCC`) e acesse `P:\poolsafe-app-frontend`. Não mapeie o frontend diretamente como a raiz `P:\`, pois o mecanismo de autolinking do Expo precisa subir um nível no diretório para identificar o `package.json`.
>
> Para remover o drive virtual quando não estiver usando:
> ```powershell
> subst P: /d
> ```

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
