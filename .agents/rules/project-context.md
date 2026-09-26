# PoolSafe Frontend — Project Context

## Projeto

Este repositório contém somente o aplicativo mobile do PoolSafe. O PoolSafe é um sistema acadêmico de apoio à prevenção de afogamentos em piscinas residenciais. O aplicativo permite que responsáveis acompanhem o monitoramento, consultem câmeras e alertas e recebam notificações de possíveis situações de risco.

O sistema não confirma afogamentos e não substitui supervisão humana, barreiras físicas ou atendimento de emergência.

## Autoridades do projeto

Antes de planejar ou implementar, consulte os documentos aplicáveis:

- `POOLSAFE_SOURCE_OF_TRUTH.md`: arquitetura, escopo e fronteiras gerais;
- `docs/app-requirements.md`: telas, jornadas e critérios funcionais do aplicativo;
- `docs/design-system.md`: tokens, componentes e regras visuais;
- `docs/domain-model.md`: estados, comportamentos e invariantes;
- `docs/api-contract.md`: endpoints, payloads, autenticação e erros da API.

Não invente telas, endpoints, campos, estados ou regras. Se os documentos forem ambíguos ou incompatíveis, interrompa a tarefa e solicite uma decisão.

## Stack aprovada

- Expo com Development Build;
- React Native;
- TypeScript em modo estrito;
- Expo Router;
- NativeWind em versão estável compatível;
- TanStack Query para estado remoto;
- React Hook Form para formulários;
- Zod para schemas e validação;
- Expo SecureStore para tokens e dados sensíveis da sessão;
- React Native Firebase Messaging para Firebase Cloud Messaging.

A validação inicial será no Android. Preserve compatibilidade arquitetural com iOS, mas não transforme a validação de iOS em requisito do MVP.

## Fronteiras obrigatórias

- O aplicativo acessa dados exclusivamente pela API Node.js.
- Não acessar diretamente MySQL, N8N, backend Python, câmera, Orange Pi ou Cloudflare.
- Não usar Firestore nem Firebase Realtime Database.
- FCM serve somente para entrega de notificações push.
- Não implementar streaming ao vivo ou reprodução de vídeo no MVP.
- Não usar Expo Go, pois a mensageria depende de integração nativa.
- Não armazenar access token ou refresh token em AsyncStorage comum.
- Não persistir alertas ou evidências offline no MVP.
- Falha de rede ou ausência de resposta nunca representa situação segura.

## Organização esperada

Use organização por funcionalidade, mantendo rotas separadas da implementação interna:

```text
app/                 rotas do Expo Router
src/components/      componentes reutilizáveis e componentes de UI
src/features/        autenticação, home, câmeras, monitoramento, alertas e definições
src/lib/api/         cliente HTTP, tipos e tratamento de erros
src/providers/       providers globais
src/theme/           tokens e configuração visual
src/hooks/           hooks realmente compartilhados
src/utils/           utilitários pequenos e puros
```

Não crie abstrações ou estado global sem uma necessidade concreta.

## Convenções de implementação

- Componentes devem possuir responsabilidade clara e tamanho controlado.
- Reutilize componentes quando houver repetição real; não generalize antecipadamente.
- Separe estado remoto do estado local de interface.
- Use TanStack Query para consultas, mutações, invalidação e cache da API.
- Use React Hook Form e Zod nos formulários.
- Centralize comunicação HTTP e tradução dos erros RFC 9457.
- Não espalhe chamadas HTTP diretamente pelas telas.
- Não altere o estado definitivo de uma ação antes da confirmação da API.
- Trate estados de carregamento, vazio, erro, dados desatualizados e falta de autorização.
- Cores não podem ser o único indicador de estados críticos.
- Use tokens do design system; não improvise cores e espaçamentos em cada tela.
- Preserve acessibilidade, safe areas, contraste e redução de movimento.
- Tokens, senhas, FCM Tokens e payloads sensíveis nunca aparecem em logs.

## Sessão e notificações

- Access e refresh tokens ficam no SecureStore.
- O aplicativo deve renovar a sessão conforme `docs/api-contract.md`.
- Logout deve limpar a sessão local e chamar a revogação definida pela API.
- O dispositivo e seu FCM Token devem ser registrados pela API.
- Renovação do FCM Token deve ser enviada ao backend.
- Ao abrir uma notificação, use o `alertId` somente para navegar e consultar novamente a API autenticada.
- Nunca confie no conteúdo da notificação como fonte completa dos dados do alerta.

## Forma de trabalho

- Implemente somente o escopo solicitado.
- Trabalhe por pequenas fatias verticais revisáveis.
- Antes de codificar uma funcionalidade, apresente o plano e os arquivos que pretende alterar.
- Não troque a stack aprovada sem autorização.
- Não adicione dependências sem justificar a necessidade.
- Não modifique contratos compartilhados silenciosamente.
- No bootstrap inicial, prepare apenas a estrutura, as dependências e as configurações básicas. Não implemente funcionalidades do produto sem nova autorização.

## Fundação Visual e Navegação (Fatia 1)

### Design System e Tokens
- **Cores Semânticas:** `src/theme/colors.ts` é a fonte única de verdade para os mapas de cores claro e escuro (`darkColors` e `lightColors`).
- **Tokens Estruturais:** `src/theme/tokens.ts` centraliza escala tipográfica (11 variantes), espaçamentos (base 4), raios, alvos de toque (mínimo 44x44) e gradientes.
- **Tema:** Fornecido via `ThemeProvider` e consumido com `useTheme()`. Acompanha o sistema (`useColorScheme()`) com fallback escuro e ajuste dinâmico da `StatusBar`.
- **Tipografia:** Família Inter para interface (`Inter_400Regular`, `Inter_600SemiBold`, `Inter_700Bold`, `Inter_800ExtraBold`) e JetBrains Mono (`JetBrainsMono_600SemiBold`) restrita a badges/telemetria. Licenças: SIL Open Font License 1.1 e MIT. Fallback nativo automático sem bloquear o app.
- **Ícones:** Exclusivamente a família Feather via `@expo/vector-icons`, envelopada pela primitiva tipada `AppIcon` (tamanhos 16, 20 e 24).
- **Primitivas de Interface:** `AppText`, `AppIcon`, `AppButton`, `AppCard`, `AppBadge`, `AppDivider`, `AppBackground`, `ScreenHeader`.
- **Componente Interno DEV:** `src/components/dev/RoutePlaceholder.tsx` para sinalizar rotas registradas sem mockar regras de negócio nem antecipar dados.

### Arquitetura de Navegação e Estabilidade Fabric no Android
- **Árvore Expo Router:**
  - `app/index.tsx`: Gateway técnico ativo em `__DEV__` (em produção redireciona para `/(public)/login`).
  - `app/(public)/`: Rotas públicas (`login`, `register`, `forgot-password`, `reset-password`).
  - `app/(app)/`: Shell autenticado com Stack contendo `(tabs)` e detalhes (`alerts/[id]`, `cameras/[id]`).
  - `app/(app)/(tabs)/`: 4 abas na ordem estrita: Home, Histórico, Câmeras, Definições.
- **Detalhes sobre as Abas:** As rotas `alerts/[id]` e `cameras/[id]` sobrepõem as abas inferiores e contam com retorno garantido para a aba de origem.
- **Estabilidade do Fabric (Android):**
  - Native screens (`react-native-screens`) opera normalmente em modo nativo padrão.
  - Contêineres de scroll e estruturais utilizam `removeClippedSubviews={false}` e evitam `overflow: 'hidden'` em hierarquias transitórias para prevenir conflitos no `ReactClippingViewManager` durante transições.
  - Transições do stack raiz e do app stack utilizam `animation: 'none'` para montagem atômica imediata.

## Pendências conhecidas

- versões exatas compatíveis serão fixadas pelo projeto e pelo lockfile;
- versão mínima do Android e futura versão mínima do iOS;
- domínio público da API;
- mecanismo definitivo de link ou código para redefinição de senha;
- estratégia de geração ou sincronização dos tipos a partir de `openapi.yaml`;
- testes automatizados serão definidos posteriormente.


