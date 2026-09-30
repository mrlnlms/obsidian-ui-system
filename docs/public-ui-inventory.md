# Inventário da UI pública do SDK Obsidian

Fonte principal: `node_modules/obsidian/obsidian.d.ts` do pacote **`obsidian@1.13.1`** instalado neste checkout, confirmado por `npm ls obsidian --workspace @obsidian-ui-system/capture --depth=0` e pelo lockfile. As referências `L...` apontam para linhas desse arquivo. `canvas.d.ts` descreve dados de Canvas e `publish.d.ts` descreve a API de Publish; nenhum dos dois acrescenta um controle de plugin diretamente renderizável ao inventário abaixo. A versão do pacote de tipos não é a versão do aplicativo Obsidian em execução.

**Critério.** “Direta” significa construtor público utilizável sem criar uma subclasse; “via host” significa que a API é obtida por outra API pública. “UI visual” indica se a API cria ou descreve algo visível, mesmo quando depende de um host. `captured` já tem specimen no registry; `candidate` parece capturável com uma fixture determinística usando a API pública; `not-applicable` não é um specimen independente para o Atlas atual. Candidatura é leitura das declarações, não validação em runtime. A coluna Atlas se refere a esta etapa do catálogo de componentes para interfaces de plugins.

## Controles e primitives

| API (linha) | Categoria | Direta? | UI visual? | Atlas? | Observações | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `ButtonComponent` (L1325) | Botão | Sim | Sim | Sim | `setDisabled`, `setCta` e `setDestructive`; normal, disabled e CTA já capturados. | captured |
| `SearchComponent` (L5558) | Busca | Sim | Sim | Sim | Recebe `HTMLElement`; empty e filled já capturados. | captured |
| `ToggleComponent` (L7155) | Alternância | Sim | Sim | Sim | `setValue(boolean)`; off e on já capturados. | captured |
| `TextComponent` (L7030) | Texto de uma linha | Sim | Sim | Sim | `inputEl` e `setValue`; estados empty, filled e disabled são possíveis. | candidate |
| `TextAreaComponent` (L7019) | Texto multilinha | Sim | Sim | Sim | Mesma base de texto, com `HTMLTextAreaElement`. | candidate |
| `DropdownComponent` (L2299) | Seleção | Sim | Sim | Sim | `addOption`/`addOptions`; requer opções de exemplo estáveis. | candidate |
| `SliderComponent` (L6722) | Intervalo numérico | Sim | Sim | Sim | `setLimits`, `setValue` e valor exibido ao lado; usar limites fixos. | candidate |
| `ColorComponent` (L1647) | Cor | Sim | Sim | Sim | `setValue` aceita cor hex; possível popover de escolha deve ser tratado separadamente. | candidate |
| `ExtraButtonComponent` (L2841) | Botão de ícone | Sim | Sim | Sim | `setIcon` e `setTooltip`; usar ícone integrado conhecido. | candidate |
| `MomentFormatComponent` (L4568) | Formato de data/hora | Sim, herdado | Sim | Sim | Herda `TextComponent`; pode mostrar amostra em `sampleEl`. | candidate |
| `ProgressBarComponent` (L5291) | Progresso | Sim | Sim | Sim | `setValue` de 0 a 100; estados determinísticos. | candidate |
| `SecretComponent` (L5613) | Segredo | Sim, com `App` | Sim | Sim | Introduzido em 1.11.1; avaliar fixture fictícia sem persistir segredo. | candidate |
| `DisplayValueComponent` (L2267) | Valor de leitura | Sim | Sim | Sim | Introduzido em 1.13.1; mostra texto e status `warning`, típico de `Setting`. | candidate |
| `AbstractTextComponent` (L344) | Base de input | Sim, com input existente | Não por si | Não, isoladamente | Encapsula um input já criado; Text, Search e TextArea são as formas concretas relevantes. | not-applicable |
| `BaseComponent` / `ValueComponent` (L497/L7297) | Bases de controle | Não, abstratas | Não por si | Não | Contratos de ciclo de vida/valor; capturar subclasses concretas. | not-applicable |

## Componentes compostos e Settings

| API (linha) | Categoria | Direta? | UI visual? | Atlas? | Observações | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `Setting` (L5695) | Linha de configuração | Sim | Sim | Sim | Cria nome, descrição e área de controle; `add*` instancia controles reais. Inclui heading, disabled e erro desde versões diferentes. | candidate |
| `SettingGroup` (L6365) | Grupo de configurações | Sim | Sim | Sim | Cria heading/lista e contém `Setting`; introduzido em 1.11.0. | candidate |
| `SettingDefinitionItem` / `SettingDefinitionControl` (L6147/L6031) | Settings declarativas | Não, tipos | Sim, via `SettingTab` | Não, isoladamente | Definições renderizadas pelo host de Settings desde 1.13.0; avaliar como superfície de Settings, sem duplicar os controles acima. | not-applicable |
| `SettingToggleControl`, `SettingDropdownControl`, `SettingTextControl`, `SettingTextAreaControl`, `SettingNumberControl` (L6696/L6291/L6679/L6656/L6422) | Configurações declarativas | Não, interfaces | Sim, via host | Não, isoladamente | Tipos de `SettingControl`; descrevem controles, não expõem raiz DOM própria. | not-applicable |
| `SettingFileControl`, `SettingFolderControl`, `SettingSliderControl`, `SettingColorControl` (L6311/L6336/L6514/L5866) | Configurações declarativas | Não, interfaces | Sim, via host | Não, isoladamente | File/folder incluem sugestões dependentes do vault; slider/color têm equivalentes concretos acima. | not-applicable |
| `SettingDefinitionAction`, `SettingDefinitionRender`, `SettingDefinitionGroup`, `SettingDefinitionList`, `SettingDefinitionPage` (L5938/L6265/L6079/L6157/L6202) | Estrutura declarativa | Não, interfaces | Sim, via host | Não, isoladamente | Descrevem ações, renderização e hierarquia de páginas/listas, não componentes instanciáveis. | not-applicable |
| `SettingTab` / `PluginSettingTab` / `SettingPage` (L6549/L5149/L6461) | Host de Settings | Não, abstratas | Sim, após integração | Não, isoladamente | Pontos de extensão para a área de configurações; `getSettingDefinitions()` é o caminho tipado mais novo. | not-applicable |
| `BasesOptions` e `BasesOption*` (L891 e L662–L1084) | Configuração de Bases | Não, tipos | Sim, no menu de Bases | Não | Opções específicas de views de Bases; não são controles genéricos instanciáveis no Atlas. | not-applicable |

## Overlays e interações

| API (linha) | Categoria | Direta? | UI visual? | Atlas? | Observações | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `Modal` (L4477) | Dialog | Sim, com `App` | Sim | Sim | `open()` cria overlay fora da aba; captura futura precisa localizar e fechar o modal. | candidate |
| `ConfirmationModal` (L1963) | Confirmação | Sim, com `App` | Sim | Sim | Introduzido em 1.13.0; `addButton`, `addCancelButton`, `addCheckbox`. | candidate |
| `Menu` (L4245) | Menu contextual | Sim | Sim | Sim | `setUseNativeMenu(false)` permite DOM no desktop; menu nativo não oferece árvore DOM equivalente. | candidate |
| `Notice` (L4613) | Notificação | Sim | Sim | Sim | `duration: 0` mantém a notificação visível até dispensá-la. | candidate |
| `HoverPopover` (L3476) | Popover | Sim, com `HoverParent`/alvo | Sim | Sim, condicionado | Depende de contexto e posicionamento; validar fixture estável antes da captura. | candidate |
| `PopoverSuggest<T>` (L5201) | Sugestões em popover | Não, abstrata | Sim, via subclasse | Sim, condicionado | Exige `renderSuggestion` e `selectSuggestion`; pode abrir como popup. | candidate |
| `AbstractInputSuggest<T>` (L294) | Sugestões de input | Não, abstrata | Sim, via subclasse | Sim, condicionado | Usa input ou `contentEditable`; precisa lista de sugestões fixa. | candidate |
| `SuggestModal<T>` (L6861) | Busca em modal | Não, abstrata | Sim, via subclasse | Sim, condicionado | Exige implementar sugestões e seleção; overlay fora da aba. | candidate |
| `FuzzySuggestModal<T>` (L3294) | Busca fuzzy em modal | Não, abstrata | Sim, via subclasse | Sim, condicionado | Implementa busca fuzzy; exige itens e callback em subclasse. | candidate |
| `setTooltip` (L6711) | Tooltip no hover | N/A, função | Sim | Sim, condicionado | Registra tooltip em elemento; depende de interação real para aparecer. | candidate |
| `displayTooltip` (L2258) | Tooltip imediato | N/A, função | Sim | Sim, condicionado | Exibe tooltip manualmente; mais adequado a specimen determinístico que hover sintético. | candidate |
| `ConfirmationButton` (L1922) | Botão de confirmação | Não, construtor privado | Sim, via modal | Não, isoladamente | Criado por `ConfirmationModal.addButton`; capturar dentro do modal. | not-applicable |
| `MenuItem` / `MenuSeparator` (L4313/L4392) | Partes de menu | Não pelo fluxo suportado | Sim, via `Menu` | Não, isoladamente | `MenuItem` tem construtor privado; `Menu.addItem`/`addSeparator` fornecem as partes. | not-applicable |
| `EditorSuggest<T>` (L2689) | Sugestões no editor | Não, abstrata | Sim, no editor | Não | Depende de contexto/editor Markdown, fora de um specimen independente da aba. | not-applicable |

## Renderização visual e APIs que não são componentes

| API (linha) | Categoria | Direta? | UI visual? | Atlas? | Observações | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `setIcon` (L5689) | Ícone SVG | N/A, função | Sim | Sim | Insere SVG de ícone integrado em um contêiner; um specimen de ícone basta, não um por ID. | candidate |
| `getIcon` / `getIconIds` / `addIcon` / `removeIcon` (L3351/L3357/L393/L5396) | Acesso/registro de ícones | N/A, funções | `getIcon` retorna SVG; demais não | Não, separadamente | Inventário e registro de ícones; `setIcon` cobre a representação visual reutilizável. | not-applicable |
| `MarkdownRenderer.render` / `renderMarkdown` (L4121) | Conteúdo Markdown | N/A, métodos estáticos | Sim | Não neste Atlas | Renderiza conteúdo de nota; `renderMarkdown` está deprecated. Não é controle de interface de plugin. | not-applicable |
| `MarkdownPreviewRenderer` / `MarkdownRenderChild` (L4036/L4104) | Extensão de preview | Não como controle | Indiretamente | Não | Registro de postprocessadores e ciclo de vida de conteúdo renderizado. | not-applicable |
| `renderMath` / `finishRenderMath` (L5423/L3193) | Conteúdo matemático | N/A, funções | Sim | Não neste Atlas | Renderizam LaTeX e carregam stylesheet; superfície de conteúdo, não controle. | not-applicable |
| `renderMatches` / `renderResults` (L5416/L5428) | Destaque de busca | N/A, funções | Sim | Não neste Atlas | Acrescentam marcação a texto/resultados; helpers de conteúdo. | not-applicable |
| `Value.renderTo` / `HTMLValue` / `IconValue` / `ImageValue` (L7289/L3530/L3539/L3548) | Valores de Bases | Não como controle | Sim, via contexto | Não | Modelos de valores renderizáveis em Bases; não são controls genéricos de plugin. | not-applicable |
| `MarkdownView`, `MarkdownPreviewView`, `MarkdownEditView` (L4188/L4060/L3906) | Views de nota | Apenas com host/leaf | Sim | Não | Dependem de arquivo, editor e workspace; não são controls isolados. | not-applicable |
| `View` / `ItemView` / `BasesView` (L7584/L3590/L1105) | Bases de view | Não, abstratas | Sim, após subclasse | Não | Hosts/extensões de workspace ou Bases; o próprio Atlas já usa `ItemView` como contêiner. | not-applicable |
| `Plugin.addRibbonIcon` / `addStatusBarItem` (L4938/L4947) | Chrome do aplicativo | N/A, métodos | Sim | Não neste Atlas | Inserem UI fora da aba; status bar não existe no mobile. Requerem inventário de app chrome separado. | not-applicable |
| `Plugin.addCommand` / `addSettingTab` / `registerView` (L4955/L4969/L4974) | Registro de integração | N/A, métodos | Indiretamente | Não | Registram ações/hosts; não são espécimes visuais. | not-applicable |
| `Plugin.registerMarkdownPostProcessor` / `registerMarkdownCodeBlockProcessor` / `registerBasesView` / `registerEditorExtension` (L4992/L5001/L5009/L5019) | Extensões de conteúdo | N/A, métodos | Indiretamente | Não | Inserem ou modificam UI no preview, em Bases ou no editor; dependem do host e do conteúdo. | not-applicable |
| `Component`, `Scope`, `WorkspaceLeaf`, `App`, `Vault` (L1835/L5532/L8228/L406/L7321) | Ciclo de vida/infraestrutura | Varia | Não por si | Não | Fornecem contexto, eventos, teclado, workspace ou dados. | not-applicable |
| `canvas.d.ts` / `publish.d.ts` | APIs auxiliares | N/A | Não como controle de plugin | Não | Canvas declara formato de dados; Publish expõe renderização/postprocessamento em outro contexto. | not-applicable |

## Contagem e lotes sugeridos

Há **3 APIs capturadas** e **24 candidatas adicionais** nas tabelas: 10 controles, 2 compostos, 11 overlays/interações e 1 helper visual (`setIcon`). Essa é uma contagem de APIs/famílias, não de variantes nem de ícones individuais. Itens obtidos somente dentro de outro componente, como `MenuItem` e `ConfirmationButton`, entram na captura do pai e não aumentam a contagem. Candidatos condicionados precisam de uma prova de runtime antes de entrarem no registry. APIs `not-applicable` continuam documentadas para evitar confundir uma API pública com um componente do catálogo.

Lotes pequenos possíveis, em ordem de menor dependência de contexto:

1. **Inputs básicos:** `TextComponent`, `TextAreaComponent`, `DropdownComponent`, `SliderComponent`.
2. **Controles complementares:** `ColorComponent`, `ExtraButtonComponent`, `MomentFormatComponent`, `ProgressBarComponent`.
3. **Settings:** `Setting`, `SettingGroup`, `DisplayValueComponent`, `SecretComponent`; usar somente dados fictícios e verificar a versão mínima exigida.
4. **Overlays diretos:** `Modal`, `ConfirmationModal`, `Menu`, `Notice`; definir ciclo de abertura, captura e fechamento sem deixar UI residual.
5. **Sugestões:** `PopoverSuggest`, `AbstractInputSuggest`, `SuggestModal`, `FuzzySuggestModal`; testar subclasses mínimas e dados fixos antes de definir variantes.
6. **Elementos contextuais:** `HoverPopover`, `setTooltip`, `displayTooltip`, `setIcon`; validar alvo/posicionamento e evitar hover artificial frágil.

O próximo passo recomendado é **somente o lote 1**, com revisão do resultado e do contrato de captura antes de avançar. O `minAppVersion` do plugin deve ser reavaliado ao usar APIs marcadas como introduzidas após o piso atual; este inventário não altera esse piso.
