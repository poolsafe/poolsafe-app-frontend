# PoolSafe - Design System

> Especificação visual e de interação do aplicativo mobile PoolSafe.

**Versão:** 0.1  
**Status:** Direção visual inicial aprovada  
**Última consolidação:** 18 de setembro de 2026  
**Escopo:** MVP Android com arquitetura visual compatível com React Native e futura adaptação para iOS

## 1. Finalidade

Este documento define a linguagem visual, os tokens, os componentes e os princípios de interação do aplicativo PoolSafe. Seu objetivo é permitir que designers, desenvolvedores e agentes de código implementem uma interface consistente sem improvisar cores, espaçamentos, estados ou padrões de navegação a cada tela.

O design system complementa:

- `POOLSAFE_SOURCE_OF_TRUTH.md`, que define a arquitetura e as fronteiras do projeto;
- `docs/app-requirements.md`, que define o MVP, as telas e os comportamentos funcionais;
- `docs/domain-model.md`, que define os estados e comportamentos do domínio;
- `docs/api-contract.md`, que define os dados fornecidos pela API.

Este documento não contém código de implementação. Os nomes dos tokens devem orientar a futura configuração de tema no aplicativo.

## 2. Referência visual

A principal referência visual é o projeto comunitário **Ocean Hero Mobile App UI**, publicado no Figma Make:

<https://www.figma.com/make/bgUYfPXfyqpuk900PTqFht/Ocean-Hero-Mobile-App-UI--Community-?p=f&t=q161x5TM6KwMWvOX-0>

O projeto foi escolhido como referência por combinar:

- atmosfera aquática;
- sensação de monitoramento contínuo;
- superfícies escuras translúcidas;
- cartões com bordas e gradientes discretos;
- indicadores coloridos de prioridade;
- ícones lineares;
- Bottom Navigation integrada ao ambiente visual;
- decoração com bolhas e silhuetas de água.

O PoolSafe não deve reproduzir literalmente o Ocean Hero. A referência fornece direção e vocabulário visual, enquanto a composição, a marca, os componentes, os textos, a hierarquia e os fluxos devem ser próprios do PoolSafe.

Antes de qualquer publicação comercial, o projeto deverá registrar em documentação:

- nome do autor original;
- link da publicação;
- licença exata apresentada pelo Figma;
- data em que a licença foi verificada;
- requisitos de atribuição, se existirem.

Uma cópia ou captura dessa licença deve ser preservada, pois publicações comunitárias podem ser alteradas ou removidas.

## 3. Personalidade da interface

O PoolSafe deve parecer:

- **confiável:** estados e alertas são claros e previsíveis;
- **atento:** o aplicativo comunica monitoramento contínuo;
- **aquático:** cores e formas remetem à água sem prejudicar a leitura;
- **tecnológico:** dados operacionais são apresentados com precisão;
- **humano:** mensagens críticas evitam linguagem fria, alarmista ou excessivamente técnica;
- **responsável:** o aplicativo não afirma certezas que o sistema não possui.

O PoolSafe não deve parecer:

- um jogo;
- um painel militar;
- um aplicativo de criptomoedas;
- uma interface hospitalar genérica;
- um terminal técnico para administradores;
- uma reprodução da identidade do Ocean Hero.

## 4. Princípios de design

### 4.1 Segurança antes de decoração

Em situações críticas, texto, ação e hierarquia visual têm prioridade sobre bolhas, ondas, gradientes ou animações.

### 4.2 Estado conhecido e estado desconhecido são diferentes

Falha de rede não significa segurança. A interface deve diferenciar claramente:

- monitoramento ativo confirmado;
- monitoramento pausado;
- estado degradado;
- câmera offline;
- estado ainda não verificado;
- serviço indisponível.

### 4.3 Cor reforça, mas não substitui significado

Todo estado relevante deve usar uma combinação de:

- cor;
- ícone;
- texto;
- posição ou hierarquia.

### 4.4 Profundidade controlada

O efeito de vidro será produzido principalmente por cor translúcida, borda, gradiente e contraste. Blur real deve ser usado apenas quando trouxer ganho visual perceptível, como na Bottom Navigation ou em modais.

### 4.5 Movimento não compete com alertas

Animações de água e bolhas devem ser lentas, discretas e pausáveis pelas preferências de redução de movimento.

### 4.6 Componentes explicam o sistema

Cards, badges e banners devem ajudar o usuário a entender a situação, e não apenas decorar dados.

## 5. Temas

### 5.1 Tema escuro

O tema escuro é a expressão visual principal do PoolSafe. Ele se aproxima da referência aquática e deve receber a primeira validação visual do MVP.

Características:

- fundo azul-marinho profundo;
- superfícies azul-petróleo;
- alto contraste com branco frio;
- ciano e turquesa para atividade e informação;
- cores semânticas vivas, mas não fluorescentes em grandes áreas;
- profundidade criada por camadas e bordas.

### 5.2 Tema claro

O tema claro não deve ser uma simples inversão. Ele deve manter a identidade aquática com:

- fundo azul muito claro;
- superfícies brancas ou azuladas;
- texto azul-marinho;
- tons semânticos mais escuros para garantir contraste;
- decoração de água com baixa saturação.

### 5.3 Comportamento

O usuário poderá escolher:

- acompanhar o sistema;
- claro;
- escuro.

O padrão inicial será acompanhar o tema do sistema operacional. A escolha deve ser preservada localmente.

## 6. Tokens de cor

Os valores abaixo são uma proposta própria do PoolSafe derivada da atmosfera da referência. Eles não pretendem reproduzir exatamente os valores do projeto original.

### 6.1 Tokens-base do tema escuro

| Token | Valor | Uso |
|---|---:|---|
| `color.background` | `#041728` | Fundo principal |
| `color.backgroundDeep` | `#070E16` | Regiões de maior profundidade e navegação |
| `color.surface` | `#072438` | Cards e painéis principais |
| `color.surfaceRaised` | `#082E45` | Cards destacados, menus e modais |
| `color.surfaceGlass` | `rgba(7, 36, 56, 0.78)` | Superfície translúcida |
| `color.border` | `#175464` | Bordas neutras |
| `color.borderSubtle` | `rgba(120, 167, 181, 0.20)` | Divisores e limites discretos |
| `color.textPrimary` | `#F2FAFC` | Texto principal |
| `color.textSecondary` | `#A3C2CC` | Texto secundário |
| `color.textMuted` | `#78A7B5` | Legendas e metadados |
| `color.textDisabled` | `#506877` | Conteúdo desabilitado |
| `color.primary` | `#00D9E8` | Ações principais e foco |
| `color.primaryPressed` | `#00B8C6` | Estado pressionado |
| `color.primarySoft` | `rgba(0, 217, 232, 0.12)` | Fundo de item ativo |
| `color.success` | `#00D8B4` | Seguro, ativo, conectado |
| `color.successSoft` | `rgba(0, 216, 180, 0.12)` | Fundo de sucesso |
| `color.warning` | `#F6C95C` | Atenção e degradação |
| `color.warningSoft` | `rgba(246, 201, 92, 0.12)` | Fundo de atenção |
| `color.danger` | `#FF4D73` | Possível risco e falha crítica |
| `color.dangerSoft` | `rgba(255, 77, 115, 0.12)` | Fundo crítico |
| `color.info` | `#44A8FF` | Informação e estados auxiliares |
| `color.offline` | `#78909C` | Offline ou indisponível |
| `color.overlay` | `rgba(0, 7, 14, 0.72)` | Fundo sob modais |

### 6.2 Tokens-base do tema claro

| Token | Valor | Uso |
|---|---:|---|
| `color.background` | `#F3FAFC` | Fundo principal |
| `color.backgroundDeep` | `#E2F3F7` | Regiões aquáticas decorativas |
| `color.surface` | `#FFFFFF` | Cards e painéis |
| `color.surfaceRaised` | `#F8FCFD` | Superfícies elevadas |
| `color.surfaceGlass` | `rgba(255, 255, 255, 0.84)` | Superfície translúcida |
| `color.border` | `#B9DDE5` | Bordas neutras |
| `color.borderSubtle` | `rgba(7, 38, 52, 0.12)` | Divisores discretos |
| `color.textPrimary` | `#072634` | Texto principal |
| `color.textSecondary` | `#294D5A` | Texto secundário |
| `color.textMuted` | `#4E6D78` | Legendas e metadados |
| `color.textDisabled` | `#8AA0A8` | Conteúdo desabilitado |
| `color.primary` | `#007B8D` | Ações principais e foco |
| `color.primaryPressed` | `#006272` | Estado pressionado |
| `color.primarySoft` | `#DDF6F9` | Fundo de item ativo |
| `color.success` | `#007E68` | Seguro, ativo, conectado |
| `color.successSoft` | `#DDF5EF` | Fundo de sucesso |
| `color.warning` | `#755500` | Atenção e degradação |
| `color.warningSoft` | `#FFF4D1` | Fundo de atenção |
| `color.danger` | `#B4234D` | Possível risco e falha crítica |
| `color.dangerSoft` | `#FFE5EB` | Fundo crítico |
| `color.info` | `#006FA8` | Informação e estados auxiliares |
| `color.offline` | `#607D86` | Offline ou indisponível |
| `color.overlay` | `rgba(1, 20, 29, 0.52)` | Fundo sob modais |

### 6.3 Contraste e uso

Os pares principais foram escolhidos para manter contraste adequado em texto normal:

- `textPrimary` sobre `background`;
- `textMuted` sobre `background`;
- `primary`, `success`, `warning` e `danger` sobre o fundo escuro;
- equivalentes semânticos escurecidos sobre o fundo claro.

Mesmo assim, a implementação final deve validar contraste em cada combinação real. Tons `Soft` servem como fundos e não devem ser usados como texto principal.

### 6.4 Regra semântica

| Significado | Cor | Exemplo |
|---|---|---|
| Operação normal | Ciano | Navegação, informação, ação principal |
| Seguro ou ativo | Turquesa | Monitoramento ativo, câmera online |
| Atenção | Amarelo | Estado degradado, comunicação atrasada |
| Possível risco | Rosa/vermelho | Alerta crítico |
| Informação auxiliar | Azul | Ajuda, item secundário |
| Indisponível | Cinza-azulado | Offline, desabilitado, desconhecido |

“Desconhecido” não deve utilizar verde. Deve usar tom neutro ou amarelo acompanhado de texto explícito.

## 7. Gradientes

Gradientes devem ser discretos e concentrados em cards de destaque, nunca atrás de textos longos.

| Token | Definição sugerida | Uso |
|---|---|---|
| `gradient.aqua` | `#064D6A` -> `#033447` | Card informativo principal |
| `gradient.safe` | `#064B52` -> `#04343A` | Monitoramento ativo |
| `gradient.alert` | `#3B1E35` -> `#24192B` | Área de alerta crítico |
| `gradient.blue` | `#0A2852` -> `#071D3D` | Relatórios e conteúdo secundário |
| `gradient.background` | `#041728` -> `#02111E` | Fundo vertical escuro |

Gradientes não substituem os tokens semânticos de borda, ícone e badge.

## 8. Tipografia

### 8.1 Famílias

**Interface principal:** Inter  
**Dados operacionais e rótulos técnicos:** JetBrains Mono

Inter será utilizada em títulos, parágrafos, botões, inputs e navegação. JetBrains Mono será reservada para horários, pequenas métricas, estados curtos em caixa alta e identificadores úteis ao usuário.

O uso da fonte monoespaçada deve ser moderado. Textos de alerta e instruções não devem parecer logs de sistema.

Antes de incorporar as fontes, suas licenças e arquivos oficiais devem ser verificados. Caso o carregamento personalizado falhe, a interface deve utilizar fontes nativas legíveis como fallback.

### 8.2 Escala tipográfica

| Token | Tamanho / linha | Peso | Uso |
|---|---:|---:|---|
| `type.display` | `32 / 38` | 800 | Marca e mensagem principal curta |
| `type.heading1` | `28 / 34` | 800 | Título principal da tela |
| `type.heading2` | `22 / 28` | 700 | Seções de maior importância |
| `type.heading3` | `18 / 24` | 700 | Títulos de cards e modais |
| `type.bodyLarge` | `18 / 27` | 400 | Texto em destaque |
| `type.body` | `16 / 24` | 400 | Texto padrão |
| `type.bodyStrong` | `16 / 24` | 600 | Ações e informações importantes |
| `type.small` | `14 / 20` | 400 | Conteúdo secundário |
| `type.smallStrong` | `14 / 20` | 600 | Labels e botões compactos |
| `type.caption` | `12 / 16` | 400 | Metadados |
| `type.telemetry` | `11 / 16` | 600 Mono | Horários, badges e status técnicos |

### 8.3 Regras

- Títulos de tela usam capitalização natural, não caixa alta completa.
- Badges podem utilizar caixa alta quando contêm uma única palavra curta.
- Texto monoespaçado pode usar espaçamento entre letras de `0.8` a `1.2`.
- Corpo de texto não deve ser menor que 14 px equivalentes.
- Valores numéricos importantes podem usar peso 700 ou 800.
- Linhas longas devem evitar peso excessivamente condensado.

## 9. Espaçamento

O sistema utiliza uma base de 4 unidades.

| Token | Valor | Uso típico |
|---|---:|---|
| `space.1` | 4 | Distância mínima entre elementos relacionados |
| `space.2` | 8 | Ícone e texto, conteúdo compacto |
| `space.3` | 12 | Padding interno pequeno |
| `space.4` | 16 | Padding padrão e margem lateral |
| `space.5` | 20 | Separação entre grupos |
| `space.6` | 24 | Seções e cards maiores |
| `space.8` | 32 | Grandes blocos de conteúdo |
| `space.10` | 40 | Separação de regiões principais |
| `space.12` | 48 | Espaço de destaque e topo amplo |

Regras de layout:

- margem horizontal padrão: 16;
- padding interno padrão de card: 16;
- intervalo padrão entre cards: 12;
- intervalo entre seções: 24 ou 32;
- layouts em grade devem manter colunas de largura consistente;
- o conteúdo deve respeitar safe areas superior e inferior.

## 10. Bordas e raios

| Token | Valor | Uso |
|---|---:|---|
| `radius.small` | 8 | Badges e elementos compactos |
| `radius.medium` | 12 | Inputs e botões |
| `radius.large` | 16 | Cards de lista |
| `radius.xlarge` | 20 | Cards de destaque |
| `radius.panel` | 24 | Painéis grandes e modais |
| `radius.full` | 999 | Pills, avatares e indicadores circulares |

Bordas geralmente terão 1 unidade. Um estado de foco, alerta selecionado ou card crítico pode utilizar 1.5 ou 2 unidades, desde que não altere o layout.

## 11. Elevação, sombra e transparência

### 11.1 Elevação

O tema escuro utiliza mais contraste de superfície e borda do que sombra. O tema claro pode utilizar sombras suaves.

| Token | Uso |
|---|---|
| `elevation.none` | Fundo e listas simples |
| `elevation.low` | Cards padrão |
| `elevation.medium` | Bottom Navigation e cards selecionados |
| `elevation.high` | Modais e alertas prioritários |

### 11.2 Transparência

- cards padrão: opacidade visual entre 88% e 96%;
- superfícies glass: entre 72% e 86%;
- bolhas decorativas: entre 6% e 18%;
- ondas decorativas: entre 8% e 20%;
- overlays: suficientes para manter foco no modal.

### 11.3 Blur

Blur não é obrigatório para todos os cards. Usar preferencialmente em:

- Bottom Navigation;
- modal de confirmação;
- cabeçalhos flutuantes, caso existam.

Se o dispositivo não executar blur de forma adequada, a superfície deve continuar legível utilizando apenas cor translúcida e borda.

## 12. Iconografia

O sistema utilizará uma única família de ícones lineares durante o MVP.

Características:

- traços arredondados;
- espessura visual consistente;
- tamanhos principais de 20 e 24;
- ícones de 16 apenas em metadados ou badges;
- preenchimento limitado a indicadores muito específicos;
- nenhuma mistura arbitrária de estilos lineares, sólidos e ilustrativos.

Mapeamento conceitual:

| Conceito | Ícone esperado |
|---|---|
| Home | casa ou painel |
| Histórico | sino, relógio ou lista de alertas |
| Câmeras | câmera de vídeo |
| Definições | engrenagem ou controles |
| Monitoramento ativo | escudo, pulso ou radar |
| Câmera online | círculo com check ou sinal |
| Câmera offline | câmera ou sinal interrompido |
| Possível risco | triângulo de alerta |
| Horário | relógio |
| Evidência | imagem |
| Conta | usuário |

Todo ícone essencial deve possuir rótulo acessível. Ícones sem texto só podem ser usados quando o significado for inequívoco e ainda houver descrição para tecnologias assistivas.

## 13. Elementos decorativos aquáticos

### 13.1 Bolhas

As bolhas ajudam a criar a atmosfera aquática da referência.

Regras:

- pouca quantidade por tela;
- baixa opacidade;
- tamanhos variados;
- distribuição irregular, evitando padrão artificial;
- não posicionar atrás de textos críticos, botões ou valores;
- não responder a toque;
- animação opcional, lenta e sem mudança brusca de direção.

### 13.2 Silhueta de água

A forma de água pode aparecer próxima ao rodapé ou em divisões de grandes regiões.

Regras:

- deve permanecer atrás do conteúdo;
- não deve invadir a área de toque da Bottom Navigation;
- utilizar variação pequena de tom em relação ao fundo;
- preferir forma vetorial ou asset escalável;
- evitar animação contínua caso afete desempenho.

### 13.3 Brilhos

Brilhos cianos podem realçar estados ativos, mas não devem ser aplicados em grandes blocos ou textos longos. Um brilho não substitui foco, borda ou contraste.

## 14. Componentes fundamentais

### 14.1 App Background

Camada visual compartilhada pelas telas autenticadas.

Composição:

- gradiente vertical profundo;
- bolhas discretas opcionais;
- forma de água no rodapé quando não competir com o conteúdo;
- safe areas respeitadas;
- ausência de interação.

Telas de autenticação podem usar uma versão mais limpa e com maior destaque para a marca.

### 14.2 Screen Header

Variações:

- título simples;
- título com ação à direita;
- detalhe com botão Voltar;
- cabeçalho de Home com marca e estado do usuário.

O título principal deve continuar visível sem depender exclusivamente da navegação inferior.

### 14.3 Monitoring Status Pill

Componente central para o estado do monitoramento.

Conteúdo:

- indicador visual;
- texto de estado;
- informação curta opcional;
- ação somente quando o contexto permitir.

Estados:

| Estado | Cor | Texto sugerido |
|---|---|---|
| Ativo | `success` | Monitoramento ativo |
| Pausado | `warning` | Monitoramento pausado |
| Degradado | `warning` | Monitoramento com atenção |
| Indisponível | `danger` ou `offline` | Monitoramento indisponível |
| Desconhecido | `offline` | Não foi possível verificar |

### 14.4 Metric Card

Card compacto para valores do dashboard.

Conteúdo:

- ícone pequeno;
- valor de destaque;
- label curta;
- estado semântico opcional.

Exemplos:

- `1/2` câmeras online;
- `3` alertas recentes;
- `Agora` última atualização.

Métricas não devem usar cor crítica se não exigirem ação.

### 14.5 Dashboard Action Card

Card grande inspirado na grade do protótipo de referência.

Conteúdo:

- ícone;
- título;
- descrição curta;
- indicador opcional;
- affordance de navegação.

Uso:

- Câmeras;
- Alertas recentes;
- Status do sistema;
- Histórico.

Evitar duplicar todas as abas apenas por estética. Cards devem possuir valor informativo ou atalho útil.

### 14.6 Camera Card

Conteúdo mínimo:

- nome;
- local;
- online, offline ou desconhecido;
- monitoramento ativo ou pausado;
- última comunicação;
- alerta recente opcional;
- affordance para abrir detalhes.

O estado online deve usar texto e ícone além de verde. “Sem atualização” e “Offline” são estados distintos quando a API permitir diferenciá-los.

### 14.7 Alert Card

Inspirado nos cards de alertas do Ocean Hero, mas adaptado à linguagem responsável do PoolSafe.

Conteúdo:

- ícone semântico;
- título não conclusivo;
- câmera ou local;
- data relativa e/ou absoluta;
- badge de prioridade ou estado;
- indicador de não visualizado;
- borda ou detalhe colorido.

Variações:

- possível risco crítico;
- atenção;
- visualizado;
- indisponível ou incompleto.

Não utilizar “Afogamento detectado” como texto automático. Preferir “Possível situação de risco”.

### 14.8 Evidence Frame

Recipiente para o frame associado ao alerta.

Regras:

- proporção consistente;
- cantos arredondados;
- estado de carregamento;
- fallback quando indisponível;
- indicação de conteúdo sensível quando necessário;
- sem download ou compartilhamento no MVP;
- não distorcer a imagem.

### 14.9 Status Badge

Usado para rótulos curtos:

- ATIVO;
- PAUSADO;
- ONLINE;
- OFFLINE;
- ATENÇÃO;
- NÃO VISUALIZADO.

Badges usam tipografia `telemetry`, ícone opcional e fundo `Soft`. O texto deve manter contraste suficiente.

### 14.10 Button

Variações:

| Variante | Uso |
|---|---|
| Primary | Ação principal da tela |
| Secondary | Ação alternativa |
| Ghost | Ação discreta ou navegação contextual |
| Danger | Pausar monitoramento, sair ou ação sensível |
| Icon | Ação compacta com rótulo acessível |

Estados obrigatórios:

- padrão;
- pressionado;
- focado;
- carregando;
- desabilitado.

Altura recomendada do botão principal: 48 a 52. Botões não devem trocar de largura ao entrar em carregamento.

### 14.11 Input

Conteúdo:

- label persistente;
- campo;
- texto de apoio opcional;
- mensagem de erro;
- ícone opcional;
- ação de mostrar senha quando aplicável.

Estados:

- vazio;
- preenchido;
- foco;
- erro;
- desabilitado;
- preenchimento automático.

Placeholder não substitui label. Erros devem explicar como corrigir o campo.

### 14.12 Banner

Usado para problemas ou informações persistentes:

- câmera offline;
- monitoramento pausado;
- notificações desabilitadas;
- dados desatualizados;
- serviço indisponível.

O banner pode incluir uma ação curta, como “Tentar novamente” ou “Abrir configurações”.

### 14.13 Confirmation Dialog

Usado antes de ações sensíveis.

No caso de pausa do monitoramento:

- título claro;
- explicação do impacto;
- ação Cancelar como opção segura;
- ação Pausar com estilo de perigo;
- etapa de reautenticação conforme o requisito funcional;
- nenhuma confirmação ambígua como apenas “OK”.

### 14.14 Empty State

Estrutura:

- ícone ou pequena ilustração;
- título;
- explicação;
- ação somente quando existir algo que o usuário realmente possa fazer.

Exemplos:

- nenhum alerta registrado;
- nenhuma câmera associada;
- filtro sem resultados.

Não mostrar botão “Adicionar câmera” no MVP.

### 14.15 Skeleton e Loading

Skeletons devem reproduzir aproximadamente o formato do conteúdo sem pulsação excessiva. Indicadores indeterminados são permitidos em ações curtas.

Não bloquear a tela inteira para atualizações secundárias quando os dados anteriores ainda puderem ser apresentados como desatualizados.

## 15. Bottom Navigation

A Bottom Navigation é uma das principais características adaptadas da referência.

Itens, da esquerda para a direita:

1. Home;
2. Histórico;
3. Câmeras;
4. Definições.

### 15.1 Aparência

- superfície escura ou clara translúcida conforme o tema;
- separação sutil do conteúdo;
- item ativo dentro de uma região circular ou arredondada;
- ícone ativo em `primary`;
- label ativa visível;
- pequeno traço inferior ciano opcional;
- itens inativos em `textMuted`;
- safe area inferior incorporada.

### 15.2 Comportamento

- o item ativo sempre deve ser identificável sem depender só da cor;
- os quatro labels permanecem visíveis;
- a barra não deve desaparecer em telas raiz;
- detalhes de alerta e câmera podem ocultá-la se isso melhorar foco e navegação;
- tocar na aba atual pode retornar ao topo da lista, se implementado de modo consistente;
- badges na navegação devem ser usados somente quando agregarem informação real.

## 16. Padrões por tela

### 16.1 Login e Cadastro

- fundo aquático simplificado;
- marca centralizada ou alinhada ao topo;
- painel de formulário com superfície glass moderada;
- um único botão principal dominante;
- decoração sem competir com teclado e campos;
- mensagens de erro próximas aos campos;
- recuperação de senha como ação secundária.

### 16.2 Home

Hierarquia recomendada:

1. marca ou saudação curta;
2. `Monitoring Status Pill`;
3. métricas principais;
4. avisos operacionais;
5. cards de resumo e atalhos;
6. alerta mais recente;
7. Bottom Navigation.

A Home deve responder rapidamente à pergunta: “O sistema está funcionando e existe algo que exige minha atenção?”.

### 16.3 Histórico

- título e resumo curto;
- filtros somente quando aprovados;
- lista vertical de `Alert Card`;
- prioridade semântica clara;
- itens não visualizados distinguíveis;
- paginação discreta;
- Bottom Navigation persistente.

### 16.4 Detalhes do alerta

- estado e título no topo;
- data, horário e câmera;
- evidência em posição de destaque;
- explicação responsável;
- metadados secundários;
- ação Marcar como visualizado quando aplicável;
- ausência de elementos decorativos próximos ao alerta crítico.

### 16.5 Câmeras

- resumo de conectividade;
- lista de `Camera Card`;
- estados online, offline e desconhecido;
- nenhuma ação de cadastro;
- Bottom Navigation persistente.

### 16.6 Detalhes da câmera

- nome e localização;
- conexão;
- estado do monitoramento;
- última comunicação;
- controle de ativação ou pausa;
- alertas recentes;
- confirmação reforçada ao pausar.

### 16.7 Definições

- lista agrupada por Conta, Notificações, Aparência, Sobre e Sessão;
- ícone, label e valor atual quando útil;
- divisores discretos;
- ação Sair visualmente separada;
- opções críticas sem aparência de ação cotidiana.

## 17. Estados e linguagem visual

### 17.1 Estado ativo

- turquesa;
- ícone de check, escudo ou pulso;
- texto “Monitoramento ativo”;
- brilho leve permitido.

### 17.2 Estado pausado

- amarelo;
- ícone de pausa;
- texto explícito;
- banner persistente na Home;
- ação de reativação visível.

### 17.3 Estado degradado

- amarelo;
- descrição da limitação;
- não ocultar quais câmeras ou serviços estão afetados.

### 17.4 Câmera offline

- cinza-azulado ou rosa conforme criticidade;
- ícone interrompido;
- horário da última comunicação;
- texto “Offline” ou “Sem comunicação”.

### 17.5 Estado desconhecido

- neutro;
- texto “Não foi possível verificar”;
- ação para tentar novamente quando aplicável;
- nunca utilizar verde.

### 17.6 Possível risco

- rosa/vermelho;
- ícone de alerta;
- título não conclusivo;
- horário e câmera imediatamente visíveis;
- fundo crítico contido, evitando preencher a tela inteira com vermelho;
- prioridade sobre decoração.

## 18. Movimento e feedback

### 18.1 Durações

| Token | Duração | Uso |
|---|---:|---|
| `motion.fast` | 120 ms | Press, ripple e feedback curto |
| `motion.base` | 180 ms | Mudança de estado e expansão pequena |
| `motion.slow` | 240 ms | Entrada de modal e transição de painel |
| `motion.ambient` | 8-20 s | Bolhas ou água decorativa em loop lento |

### 18.2 Curvas

- entrada: desaceleração suave;
- saída: aceleração curta;
- mudança de estado: curva simétrica e previsível;
- loops decorativos: movimento contínuo sem saltos.

### 18.3 Feedback háptico

Pode ser considerado para:

- confirmação de ação importante;
- mudança do monitoramento;
- recebimento de alerta em primeiro plano.

O feedback háptico deve respeitar capacidades e preferências do dispositivo. Não deve ser o único sinal de sucesso ou erro.

### 18.4 Redução de movimento

Quando o usuário preferir movimento reduzido:

- desativar bolhas animadas;
- manter ondas estáticas;
- reduzir deslocamentos em transições;
- preservar apenas fades e feedback funcional essencial.

## 19. Conteúdo e microcopy

### 19.1 Tom

- direto;
- calmo;
- responsável;
- sem jargão técnico;
- sem falsa certeza;
- sem humor em situações críticas.

### 19.2 Vocabulário preferido

| Evitar | Preferir |
|---|---|
| Afogamento detectado | Possível situação de risco |
| Tudo seguro | Monitoramento ativo |
| Sistema normal | Sistema operacional |
| Câmera morta | Câmera offline |
| Erro desconhecido | Não foi possível concluir a ação |
| Resolvido | Visualizado ou verificado |
| OK | Entendi, Tentar novamente ou ação específica |

### 19.3 Datas e horários

- listas podem mostrar tempo relativo, como “há 2 min”;
- detalhes devem apresentar data e horário absolutos;
- horários técnicos podem usar `telemetry`;
- o fuso deve ser consistente com a conta ou dispositivo conforme decisão futura;
- nunca depender apenas de “agora” quando a informação pode estar desatualizada.

## 20. Acessibilidade

Requisitos obrigatórios:

- contraste mínimo de 4.5:1 para texto normal;
- contraste mínimo de 3:1 para texto grande e componentes gráficos relevantes;
- área de toque recomendada de pelo menos 44 por 44;
- labels acessíveis em todos os controles;
- ordem de foco coerente;
- suporte a aumento de fonte sem cortar informações essenciais;
- cor acompanhada de texto ou ícone;
- alertas importantes anunciáveis por tecnologias assistivas;
- estados de carregamento comunicados de forma apropriada;
- imagens de evidência com descrição funcional quando possível;
- animações compatíveis com redução de movimento;
- mensagens de erro próximas ao elemento relacionado e compreensíveis fora do contexto visual.

O tema aquático não pode justificar baixo contraste, fontes pequenas ou excesso de transparência.

## 21. Responsividade e dispositivos

O MVP será validado primeiro no Android, mas o layout deve evitar dimensões rígidas específicas de um único aparelho.

Regras:

- respeitar safe areas e recortes;
- suportar larguras compactas de smartphones;
- evitar grids que comprimam texto abaixo do legível;
- cards de métricas podem reduzir de três colunas para outra composição quando necessário;
- Bottom Navigation deve permanecer utilizável com textos ampliados;
- formulários devem conviver corretamente com o teclado;
- rolagem deve permitir acesso a todas as ações;
- orientação principal será retrato no MVP.

Tablet, modo paisagem e layouts amplos não fazem parte dos critérios iniciais, mas a implementação não deve assumir posições absolutas que inviabilizem evolução.

## 22. Regras de implementação para agentes

Um agente de desenvolvimento deve:

1. utilizar os tokens semânticos, evitando cores literais espalhadas pelo código;
2. criar componentes compartilhados para padrões repetidos;
3. não adicionar novas cores sem justificar e atualizar este documento;
4. não utilizar blur em todos os cards;
5. não misturar bibliotecas de ícones sem aprovação;
6. não copiar textos, marca ou conteúdo do Ocean Hero;
7. preservar os estados de loading, erro, vazio, offline e desatualizado;
8. implementar acessibilidade junto com o componente, não como etapa posterior;
9. não usar cor como único indicador;
10. respeitar tema claro, escuro e preferência do sistema;
11. evitar animações contínuas que prejudiquem bateria ou desempenho;
12. não alterar a hierarquia de alertas por preferência estética;
13. solicitar decisão quando um componente exigir comportamento não documentado;
14. manter componentes de domínio separados de primitivas visuais genéricas;
15. registrar mocks e placeholders explicitamente.

## 23. Inventário inicial de componentes

### Primitivas

- `AppText`;
- `AppIcon`;
- `AppButton`;
- `AppInput`;
- `AppCard`;
- `AppBadge`;
- `AppDivider`;
- `AppModal`;
- `AppSkeleton`;
- `AppEmptyState`;
- `AppBanner`.

### Componentes de domínio

- `MonitoringStatusPill`;
- `MetricCard`;
- `DashboardActionCard`;
- `CameraCard`;
- `CameraStatusBadge`;
- `AlertCard`;
- `AlertStatusBadge`;
- `EvidenceFrame`;
- `NotificationPermissionBanner`;
- `StaleDataBanner`;
- `MonitoringControlDialog`;
- `AppBottomNavigation`.

Os nomes são conceituais e podem ser ajustados às convenções do projeto, desde que as responsabilidades permaneçam claras.

## 24. Pendências para a próxima versão

- criação ou aprovação do logotipo PoolSafe;
- identificação do autor e registro da licença exata da referência;
- validação visual completa do tema claro;
- escolha definitiva da biblioteca de ícones;
- protótipos das telas do PoolSafe;
- comportamento exato das animações aquáticas;
- validação de contraste em componentes implementados;
- tokens de sombra específicos para Android e iOS;
- comportamento de responsividade com fontes ampliadas;
- definição de ilustrações para estados vazios;
- testes do blur em dispositivos Android de menor desempenho;
- definição de favicon, ícone do aplicativo e splash screen;
- documentação dos componentes após o primeiro bootstrap.

## 25. Critérios de conformidade visual

Uma tela é considerada compatível com este design system quando:

- utiliza tokens semânticos de cor e espaçamento;
- mantém hierarquia tipográfica consistente;
- respeita safe areas e alvos de toque;
- representa os estados funcionais necessários;
- não depende exclusivamente de cor;
- mantém legibilidade sobre elementos aquáticos;
- usa componentes existentes quando a responsabilidade é equivalente;
- possui comportamento coerente nos temas suportados;
- evita cópia literal da referência externa;
- comunica alertas em linguagem responsável;
- permanece compreensível sem animações decorativas.

## 26. Documentos relacionados

- `POOLSAFE_SOURCE_OF_TRUTH.md` - arquitetura e decisões gerais;
- `docs/app-requirements.md` - escopo funcional e critérios de aceite do MVP;
- `docs/domain-model.md` - estados, regras e modelos de leitura;
- `docs/api-contract.md` - contratos HTTP e schemas;
- futuro `docs/frontend-architecture.md` - estrutura técnica do aplicativo;
- futuro `.agents/rules/project-context.md` - contexto permanente resumido para o Antigravity.
