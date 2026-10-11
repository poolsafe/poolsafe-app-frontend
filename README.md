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
subst P: <CAMINHO_RAIZ_REPOSITORIO>
# Exemplo: subst P: C:\Users\<SeuUsuario>\Documents\Github-Poolsafe-TCC

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

Copie `.env.example` para `.env` e configure o endpoint da API para desenvolvimento local:

```bash
cp .env.example .env
```

* **Desenvolvimento (`Debug`):** O aplicativo consome a variável `EXPO_PUBLIC_API_BASE_URL` configurada no `.env` (ex: `http://10.0.2.2:3000/api/v1` no emulador ou `http://<IP_DO_PC>:3012/api/v1` em celular conectado na mesma rede Wi-Fi).
* **Produção (`Release`):** O aplicativo consome **obrigatoriamente e deterministicamente** a URL pública canônica segura (`https://api.poolsafe.app/api/v1`), impedindo contaminações por arquivos locais de desenvolvimento.

## Geração de APK Release (Produção / Demonstração)

Para compilar um arquivo **APK autônomo** para instalação física em smartphones Android sem depender do computador:

Consulte o guia completo: 📖 [Guia de Geração de APK (GERAR_APK_POOLSAFE.md)](./GERAR_APK_POOLSAFE.md).

### Resumo dos comandos:
```powershell
# 1. Mapear unidade curta (evita limite de 260 caracteres no Windows)
subst P: <CAMINHO_RAIZ_REPOSITORIO>

# 2. Acessar a pasta nativa
cd P:\poolsafe-app-frontend\android

# 3. Compilar APK Release com suporte a processadores ARM reais
.\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"

# 4. Desmontar a unidade ao finalizar
subst P: /d
```

> **Chaves de Assinatura:** O build de release requer o arquivo `android/key.properties` configurado com base no modelo [`android/key.properties.example`](./android/key.properties.example) e o arquivo `android/app/poolsafe-release.keystore`. Consulte o guia acima para detalhes sobre como configurar em novas máquinas.
