# Inventário da UI pública do SDK Obsidian

Fonte principal: `node_modules/obsidian/obsidian.d.ts` do pacote **`obsidian@1.13.1`** instalado neste checkout, confirmado por `npm ls obsidian --workspace @obsidian-ui-system/mapping --depth=0` e pelo lockfile. As referências `L...` apontam para linhas desse arquivo. `canvas.d.ts` descreve dados de Canvas e `publish.d.ts` descreve a API de Publish; nenhum dos dois acrescenta um controle de plugin diretamente renderizável ao inventário abaixo. A versão do pacote de tipos não é a versão do aplicativo Obsidian em execução.

**Critério.** “Direta” significa construtor público utilizável sem criar uma subclasse; “via host” significa que a API é obtida por outra API pública. “UI visual” indica se a API cria ou descreve algo visível, mesmo quando depende de um host. `captured` já tem specimen no registry; `limited` foi avaliada mas não tem captura independente segura sob o contrato público; `not-applicable` não é um specimen independente para o Mapping atual. A coluna Mapping se refere a esta etapa do catálogo de componentes para interfaces de plugins.

## Controles e primitives

| API (linha) | Categoria | Direta? | UI visual? | Mapping? | Observações | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `ButtonComponent` (L1325) | Botão | Sim | Sim | Sim | `setDisabled`, `setCta` e `setDestructive`; normal, disabled e CTA já capturados. | captured |
| `SearchComponent` (L5558) | Busca | Sim | Sim | Sim | Recebe `HTMLElement`; empty e filled já capturados. | captured |
| `ToggleComponent` (L7155) | Alternância | Sim | Sim | Sim | `setValue(boolean)`; off e on já capturados. | captured |
| `TextComponent` (L7030) | Texto de uma linha | Sim | Sim | Sim | `inputEl`; empty, filled e disabled capturados. | captured |
| `TextAreaComponent` (L7019) | Texto multilinha | Sim | Sim | Sim | `inputEl` é `textarea`; empty, filled e disabled capturados. | captured |
| `DropdownComponent` (L2299) | Seleção | Sim | Sim | Sim | Duas opções fixas; default, selected e disabled capturados. | captured |
| `SliderComponent` (L6722) | Intervalo numérico | Sim | Sim | Sim | Limites 0–100, passo 1; minimum, middle, maximum e disabled capturados. | captured |
| `ColorComponent` (L1647) | Cor | Sim | Sim | Sim | Valores hex fixos e disabled capturados; possível popover de escolha fica fora desta captura. | captured |
| `ExtraButtonComponent` (L2841) | Botão de ícone | Sim | Sim | Sim | Ícone integrado `settings`, tooltip e disabled capturados. | captured |
| `MomentFormatComponent` (L4568) | Formato de data/hora | Sim, herdado | Sim | Sim | Herda `TextComponent`; input de formato capturado sem `sampleEl` temporal. | captured |
| `ProgressBarComponent` (L5291) | Progresso | Sim | Sim | Sim | Valores 0, 50 e 100 capturados; barra interna reflete a porcentagem. | captured |
| `SecretComponent` (L5613) | Segredo | Sim, com `App` | Sim | Sim | Capturado via `Setting.addComponent`, sem segredo selecionado ou persistido. | captured |
| `DisplayValueComponent` (L2267) | Valor de leitura | Tipos: sim; runtime: via `Setting.addDisplayValue` | Sim | Sim | Introduzido em 1.13.1; o construtor não estava exportado no runtime 1.14.3 observado, mas o factory público de `Setting` funcionou. | captured |
| `AbstractTextComponent` (L344) | Base de input | Sim, com input existente | Não por si | Não, isoladamente | Encapsula um input já criado; Text, Search e TextArea são as formas concretas relevantes. | not-applicable |
| `BaseComponent` / `ValueComponent` (L497/L7297) | Bases de controle | Não, abstratas | Não por si | Não | Contratos de ciclo de vida/valor; capturar subclasses concretas. | not-applicable |

## Componentes compostos e Settings

| API (linha) | Categoria | Direta? | UI visual? | Mapping? | Observações | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `Setting` (L5695) | Linha de configuração | Sim | Sim | Sim | Standard, heading, disabled e erro capturados; `addText` instancia controle real. | captured |
| `SettingGroup` (L6365) | Grupo de configurações | Sim | Sim | Sim | Grupo com linhas e variante com `addSearch`; introduzido em 1.11.0. | captured |
| `SettingDefinitionItem` / `SettingDefinitionControl` (L6147/L6031) | Settings declarativas | Não, tipos | Sim, via `SettingTab` | Não, isoladamente | Definições renderizadas pelo host de Settings desde 1.13.0; avaliar como superfície de Settings, sem duplicar os controles acima. | not-applicable |
| `SettingToggleControl`, `SettingDropdownControl`, `SettingTextControl`, `SettingTextAreaControl`, `SettingNumberControl` (L6696/L6291/L6679/L6656/L6422) | Configurações declarativas | Não, interfaces | Sim, via host | Não, isoladamente | Tipos de `SettingControl`; descrevem controles, não expõem raiz DOM própria. | not-applicable |
| `SettingFileControl`, `SettingFolderControl`, `SettingSliderControl`, `SettingColorControl` (L6311/L6336/L6514/L5866) | Configurações declarativas | Não, interfaces | Sim, via host | Não, isoladamente | File/folder incluem sugestões dependentes do vault; slider/color têm equivalentes concretos acima. | not-applicable |
| `SettingDefinitionAction`, `SettingDefinitionRender`, `SettingDefinitionGroup`, `SettingDefinitionList`, `SettingDefinitionPage` (L5938/L6265/L6079/L6157/L6202) | Estrutura declarativa | Não, interfaces | Sim, via host | Não, isoladamente | Descrevem ações, renderização e hierarquia de páginas/listas, não componentes instanciáveis. | not-applicable |
| `SettingTab` / `PluginSettingTab` / `SettingPage` (L6549/L5149/L6461) | Host de Settings | Não, abstratas | Sim, após integração | Não, isoladamente | Pontos de extensão para a área de configurações; `getSettingDefinitions()` é o caminho tipado mais novo. | not-applicable |
| `BasesOptions` e `BasesOption*` (L891 e L662–L1084) | Configuração de Bases | Não, tipos | Sim, no menu de Bases | Não | Opções específicas de views de Bases; não são controles genéricos instanciáveis no Mapping. | not-applicable |

## Overlays e interações

| API (linha) | Categoria | Direta? | UI visual? | Mapping? | Observações | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `Modal` (L4477) | Dialog | Sim, com `App` | Sim | Sim | `open()` cria overlay fora da aba; capturado com abertura e fechamento explícitos. | captured |
| `ConfirmationModal` (L1963) | Confirmação | Sim, com `App` | Sim | Sim | Introduzido em 1.13.0; `addButton`, `addCancelButton`, `addCheckbox`. | captured |
| `Menu` (L4245) | Menu contextual | Sim | Sim | Sim | `setUseNativeMenu(false)` permite DOM no desktop; menu nativo não oferece árvore DOM equivalente. | captured |
| `Notice` (L4613) | Notificação | Sim | Sim | Sim | `duration: 0` mantém a notificação visível até dispensá-la. | captured |
| `HoverPopover` (L3476) | Popover | Sim, com `HoverParent`/alvo | Sim | Sim, condicionado | O construtor cria uma superfície posicionada, mas o SDK não expõe fechamento público; `hide()` existe apenas no runtime. Não há fixture exportável com limpeza segura usando apenas o contrato público. | limited |
| `PopoverSuggest<T>` (L5201) | Sugestões em popover | Não, abstrata | Sim, via subclasse | Sim, limitado | Captura a superfície base aberta; não há fornecedor público de itens na classe base. | captured |
| `AbstractInputSuggest<T>` (L294) | Sugestões de input | Não, abstrata | Sim, via subclasse | Sim | Input real e lista fixa; duas consultas determinísticas. | captured |
| `SuggestModal<T>` (L6861) | Busca em modal | Não, abstrata | Sim, via subclasse | Sim | Subclasse com sugestões fixas; captura `modalEl`. | captured |
| `FuzzySuggestModal<T>` (L3294) | Busca fuzzy em modal | Não, abstrata | Sim, via subclasse | Sim | Subclasse com itens fixos; matching/renderização do SDK. | captured |
| `setTooltip` (L6711) | Tooltip no hover | N/A, função | Sim | Sim, limitado | Capturado o alvo com `aria-label` registrado; a superfície visível só aparece em hover real e não integra este snapshot. | captured |
| `displayTooltip` (L2258) | Tooltip imediato | N/A, função | Sim | Sim | Exibe tooltip por chamada pública; captura a superfície aberta, posicionada pelo runtime. | captured |
| `ConfirmationButton` (L1922) | Botão de confirmação | Não, construtor privado | Sim, via modal | Não, isoladamente | Criado por `ConfirmationModal.addButton`; capturar dentro do modal. | not-applicable |
| `MenuItem` / `MenuSeparator` (L4313/L4392) | Partes de menu | Não pelo fluxo suportado | Sim, via `Menu` | Não, isoladamente | `MenuItem` tem construtor privado; `Menu.addItem`/`addSeparator` fornecem as partes. | not-applicable |
| `EditorSuggest<T>` (L2689) | Sugestões no editor | Não, abstrata | Sim, no editor | Não | Depende de contexto/editor Markdown, fora de um specimen independente da aba. | not-applicable |

## Renderização visual e APIs que não são componentes

| API (linha) | Categoria | Direta? | UI visual? | Mapping? | Observações | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `setIcon` (L5689) | Ícone SVG | N/A, função | Sim | Sim | Insere SVG de `settings` em um contêiner; um specimen demonstra a API, não cada ID de ícone. | captured |
| `getIcon` / `getIconIds` / `addIcon` / `removeIcon` (L3351/L3357/L393/L5396) | Acesso/registro de ícones | N/A, funções | `getIcon` retorna SVG; demais não | Não, separadamente | Inventário e registro de ícones; `setIcon` cobre a representação visual reutilizável. | not-applicable |
| `MarkdownRenderer.render` / `renderMarkdown` (L4121) | Conteúdo Markdown | N/A, métodos estáticos | Sim | Não neste Mapping | Renderiza conteúdo de nota; `renderMarkdown` está deprecated. Não é controle de interface de plugin. | not-applicable |
| `MarkdownPreviewRenderer` / `MarkdownRenderChild` (L4036/L4104) | Extensão de preview | Não como controle | Indiretamente | Não | Registro de postprocessadores e ciclo de vida de conteúdo renderizado. | not-applicable |
| `renderMath` / `finishRenderMath` (L5423/L3193) | Conteúdo matemático | N/A, funções | Sim | Não neste Mapping | Renderizam LaTeX e carregam stylesheet; superfície de conteúdo, não controle. | not-applicable |
| `renderMatches` / `renderResults` (L5416/L5428) | Destaque de busca | N/A, funções | Sim | Não neste Mapping | Acrescentam marcação a texto/resultados; helpers de conteúdo. | not-applicable |
| `Value.renderTo` / `HTMLValue` / `IconValue` / `ImageValue` (L7289/L3530/L3539/L3548) | Valores de Bases | Não como controle | Sim, via contexto | Não | Modelos de valores renderizáveis em Bases; não são controls genéricos de plugin. | not-applicable |
| `MarkdownView`, `MarkdownPreviewView`, `MarkdownEditView` (L4188/L4060/L3906) | Views de nota | Apenas com host/leaf | Sim | Não | Dependem de arquivo, editor e workspace; não são controls isolados. | not-applicable |
| `View` / `ItemView` / `BasesView` (L7584/L3590/L1105) | Bases de view | Não, abstratas | Sim, após subclasse | Não | Hosts/extensões de workspace ou Bases; o próprio Mapping já usa `ItemView` como contêiner. | not-applicable |
| `Plugin.addRibbonIcon` / `addStatusBarItem` (L4938/L4947) | Chrome do aplicativo | N/A, métodos | Sim | Não neste Mapping | Inserem UI fora da aba; status bar não existe no mobile. Requerem inventário de app chrome separado. | not-applicable |
| `Plugin.addCommand` / `addSettingTab` / `registerView` (L4955/L4969/L4974) | Registro de integração | N/A, métodos | Indiretamente | Não | Registram ações/hosts; não são espécimes visuais. | not-applicable |
| `Plugin.registerMarkdownPostProcessor` / `registerMarkdownCodeBlockProcessor` / `registerBasesView` / `registerEditorExtension` (L4992/L5001/L5009/L5019) | Extensões de conteúdo | N/A, métodos | Indiretamente | Não | Inserem ou modificam UI no preview, em Bases ou no editor; dependem do host e do conteúdo. | not-applicable |
| `Component`, `Scope`, `WorkspaceLeaf`, `App`, `Vault` (L1835/L5532/L8228/L406/L7321) | Ciclo de vida/infraestrutura | Varia | Não por si | Não | Fornecem contexto, eventos, teclado, workspace ou dados. | not-applicable |
| `canvas.d.ts` / `publish.d.ts` | APIs auxiliares | N/A | Não como controle de plugin | Não | Canvas declara formato de dados; Publish expõe renderização/postprocessamento em outro contexto. | not-applicable |

## Cobertura atual

Há **26 APIs/famílias com specimen no registry** e **1 API limitada sem specimen** (`HoverPopover`). Essa é uma contagem de APIs/famílias, não de variantes nem de ícones individuais. O specimen de `setTooltip` captura apenas o registro no alvo, não o tooltip visível. Itens obtidos somente dentro de outro componente, como `MenuItem` e `ConfirmationButton`, entram na captura do pai e não aumentam a contagem. APIs `not-applicable` continuam documentadas para evitar confundir uma API pública com um componente do catálogo.

- **Inputs:** `TextComponent`, `TextAreaComponent`, `DropdownComponent`, `SliderComponent`.
- **Controles complementares:** `ColorComponent`, `ExtraButtonComponent`, `MomentFormatComponent`, `ProgressBarComponent`.
- **Settings:** `Setting`, `SettingGroup`, `DisplayValueComponent`, `SecretComponent`; somente dados fictícios, sem persistir segredo. O diálogo aberto por `SecretComponent` é uma superfície disparada, não um specimen exportado.
- **Overlays diretos:** `Modal`, `ConfirmationModal`, `Menu`, `Notice`; abertura, captura e fechamento explícitos.
- **Sugestões:** `PopoverSuggest`, `AbstractInputSuggest`, `SuggestModal`, `FuzzySuggestModal`; subclasses mínimas e dados fixos. O `PopoverSuggest` isolado captura somente sua superfície vazia.
- **Elementos contextuais:** `setTooltip`, `displayTooltip`, `setIcon` têm specimens; `HoverPopover` permanece limitado pela ausência de fechamento público.

O catálogo atual contém **59 specimens** de 26 famílias. O `minAppVersion` é `1.13.1`, exigido pelo contrato de `DisplayValueComponent`/`Setting.addDisplayValue`.
