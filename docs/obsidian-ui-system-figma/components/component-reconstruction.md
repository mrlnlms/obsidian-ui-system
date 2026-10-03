# Reconstrução de componentes Obsidian no Figma

Esta é a referência de trabalho para os próximos componentes. Consulte-a junto com as skills indicadas em [`AGENTS.md`](../../../AGENTS.md). Atualize apenas regras que se mostrem reutilizáveis; mantenha medidas e resultados específicos de cada investigação nos documentos do respectivo componente.

## Evidência antes da estrutura Figma

1. O Mapping produz `components.json`: identidade `(id, variant)`, conteúdo, anatomia e estilos observados no Obsidian. O Layout Lab produz `layout.json`: probes declarativos em diferentes larguras de host e conteúdos, medições e inferências com evidência e confiança. O comando **Export Obsidian UI Figma Package** executa ambos no mesmo ambiente e entrega um ZIP validado; a Custom UI importa esse ZIP com `FileReader`. O código principal do plugin não lê o filesystem. Os exports individuais continuam disponíveis para diagnóstico.
2. Construa um modelo experimental Figma-ready entre os exports e os nodes. Registre separadamente o campo **observado**, a regra **inferida** e a **tradução Figma**. Preserve `unknown` quando os probes não distinguirem as hipóteses. Não altere o schema público apenas para acomodar a tradução.
3. Valide raiz e descendentes por eixo. `display:flex` sozinho não demonstra Hug, e uma largura medida em um viewport não demonstra Fixed. Use variação de host e de conteúdo para distinguir os casos; não introduza exceções por ID de componente na inferência genérica.
4. Obtenha ícones de SVG, máscara ou geometria observável. Se a origem ou geometria não puder ser reconstruída com confiança, registre a lacuna antes de gerar o componente. Não desenhe um substituto aproximado.

Para um primitive com Dark/Light observados, use modes de uma mesma Variable collection para cor e radius compartilhados. Mantenha estado, contexto, profundidade, conteúdo e instance swap como propriedades do Component. Ao importar SVG com `currentColor`, preserve a geometria observada e vincule apenas paints visíveis que tenham a cor observada do glyph; o import pode conter paints invisíveis para os limites do SVG. Preserve `visible`, `opacity` e `blendMode` ao vincular o paint. Não mantenha a cor de um tema gravada no glyph nem duplique o SVG por mode. Se o Figma não preservar a transparência de um fundo selecionado com fill vinculado, use um underlay com `opacity` no node e cor vinculada no fill. Uma composição já validada pode continuar Dark enquanto apenas os primitives vinculados respondem ao mode aplicado à sua instância ancestral. O teste no Figma deve conferir Dark → Light → Dark no Component e na composição, com propriedades, largura e slots preservados.

No readback de opacidade, compare com tolerância para a precisão numérica do Figma. Para confirmar resize, redimensione uma instância e confira as dimensões do underlay; o valor literal de `constraints` não substitui essa verificação de comportamento.

Ao estender modes a composições já geradas, vincule os paints dos Components de origem e os fundos próprios dos previews. Não escreva overrides nos descendentes de uma Instance: a cor deve chegar por herança do Component principal. Se o Package usado como entrada foi capturado em Light, classifique Button/Search a partir dos valores Light dessa entrada antes de criar o vínculo; os probes internos Dark preservam sua própria base observada. Cores Dark idênticas podem ter papéis distintos, como fill de Button e border de Search; use a propriedade e a anatomia para escolher a Variable. Uma cor que não foi associada a evidência pareada não deve receber conversão automática.

Para um gerador novo, escolha o papel visual na anatomia e crie o paint já vinculado com `boundUiKitPaint(theme, role)`; por exemplo, `textMuted` para o texto padrão observado e `selectedOverlay` para o underlay selecionado. O classificador de `ui-kit-theme.ts` serve à migração dos Components existentes e à entrada importada; igualdade RGB não deve decidir sozinha o papel de um novo paint. Na coleção `Obsidian UI / Appearance`, papéis específicos dos primitives podem permanecer como aliases sem valores próprios quando a origem observada e o par Dark/Light sustentam o mesmo papel global. O ícone e o texto padrão da árvore apontam para `textMuted`; texto selecionado para `textNormal`; disclosure e metadata para `textFaint`; fundo selecionado para `selectedOverlay`. A geometria e os raios dos primitives continuam próprios.

Registre cada SVG observado pelo desenho, separado da ação que o usa. `Obsidian / Glyph / …` mantém um Component por geometria normalizada: a normalização ignora apenas classe e tamanho de exibição do `<svg>` e a sintaxe vazia dos elementos, preservando paths, strokes e transforms. Uma ação como New folder permanece nome/propriedade do Icon Button consumidor; `Icon` continua um instance swap para o glyph. SVGs iguais de fixtures diferentes reutilizam o mesmo glyph; desenhos apenas parecidos permanecem distintos. Não altere os SVGs observados para fazê-los coincidir.

## Sizing, posicionamento e texto

| Regra inferida | Evidência necessária | Tradução Figma |
| --- | --- | --- |
| Hug | A dimensão acompanha mudanças de conteúdo e não simplesmente a largura do host. | Auto Layout e sizing automático no eixo apropriado, com texto medido antes de depender do Hug. |
| Fill | A dimensão acompanha o host nas larguras testadas. | Raiz redimensionável e filhos com constraints que preservam as relações medidas; use Fill de Auto Layout somente quando a anatomia justificar. |
| Fixed | A dimensão permanece estável nos hosts e conteúdos testados. | Dimensão fixa no eixo demonstrado, sem extrapolar para estados, fontes ou conteúdos não ensaiados. |
| Unknown | Dados insuficientes ou conflitantes. | Não afirmar Hug, Fill ou Fixed; ampliar probes antes da geração. |

Modele posicionamento absoluto e sobreposição observados com nodes e constraints apropriados. Não converta todo componente para Auto Layout horizontal por conveniência. Trate a largura do host usada para mostrar o componente no canvas como exemplo de criação, não como regra intrínseca.

Para texto de uma linha, preserve o comportamento de overflow medido. Um viewport com `clipsContent` pode representar corte simples; não acrescente ellipsis sem evidência. O TextNode permanece editável. Diferencie a stack CSS solicitada da fonte Figma utilizada: resolva a família e o estilo disponíveis, carregue a fonte e comprove renderização antes de criar componentes; não faça fallback silencioso.

## Variants e Component Properties

- Use variants para estados que mudam aparência ou anatomia. Exponha conteúdo editável por uma propriedade `TEXT` quando a edição deve aparecer no painel da instance. Alterar texto não muda automaticamente o estado de uma variant.
- Compartilhe uma propriedade `TEXT` entre variants somente quando ela representar o mesmo campo semântico. O Figma preserva overrides na troca de `State`: placeholder e valor de busca precisam de propriedades distintas para que um texto não substitua o outro. A visibilidade de elementos que pertencem ao estado, como o clear do Search, deve vir da variant, sem propriedade manual redundante.
- `addComponentProperty()` retorna uma chave opaca com sufixo `#...`: use a chave inteira em `componentPropertyReferences.characters` e em `instance.componentProperties`. Crie as propriedades no Component Set após `combineAsVariants` e vincule cada TextNode à chave do campo que representa. Não presuma que propriedades homônimas criadas antes em ComponentNodes diferentes compartilharão o mesmo ID após a combinação. Confira os defaults, overrides independentes e trocas de estado em instances temporárias; confirme também o painel no Figma Desktop.
- Ao combinar variants, confira a propriedade `State`, o número de variants e os valores padrão. Posicione as variants dentro do set depois de `combineAsVariants`; o arranjo do set é apenas organização do canvas.
- Light/Dark já são modes de Variables na ação v2 limitada ao Button normal. Não duplique Component Sets por tema.

## Padrões já demonstrados

| Componente | Evidência e estrutura | Validação |
| --- | --- | --- |
| `Obsidian / Button` | Largura Hug e altura Fixed inferidas pelo Lab; Auto Layout horizontal, sem wrap, padding e estilos dos exports; `State=Normal/Disabled/CTA`; propriedade `Label`. | No Figma Desktop, uma instance passou de `Example button` para `OK` e a largura se ajustou automaticamente. |
| `Obsidian / Search` | Raiz Fill horizontal e altura Fixed; interior com posicionamento relativo/absoluto, superfície e viewport textual que esticam, lupa à esquerda e clear à direita; SVGs das máscaras capturadas; clipping sem ellipsis; `State=Empty/Filled`; `Placeholder` e `Value` separados. | Layout, resize, altura, ícones, corte simples e edição de texto por estado foram validados manualmente. |

Os SVGs Search vêm do CSSOM observado. O Button não tem ícones nesse specimen. Medidas de um componente específico não devem ser copiadas como regras gerais.

A ação v2 cria um ComponentNode de Button normal com `cornerRadius`, background e fill do Label vinculados a três Variables. O pré-check consulta a identidade causal do diagnóstico e a projeção dos tokens; a comparação de estilos resolvidos entre capturas não define o vínculo. O texto usa o alias de escopo `--text-color → --text-normal`, confirmado por dois estímulos transitórios no Button real em Dark e Light. O operador confirmou os três bindings e a aparência legível nos dois modes no Figma Desktop. Consulte o [contrato do Package](../../integration/figma-package/figma-package.md#button-normal-real-com-bindings) para o relatório e o escopo.

## Cuidados da Plugin API

- Use `@figma/plugin-typings` instalado no projeto e as referências de `figma-use` e `figma-generate-library` antes de pesquisar fora. Use `figma-generative-plugins` ao alterar o plugin. Recorra à web apenas se houver lacuna real ou necessidade de verificar uma mudança recente da API.
- Carregue o `FontName` exato antes de modificar `characters`; `listAvailableFontsAsync()` e `loadFontAsync()` não provam, sozinhos, que um TextNode renderiza. Verifique `hasMissingFont` e dimensões positivas. A stack macOS atual exige SF Pro ativada no Figma Desktop; se falhar, pare com instrução de setup humano.
- Verifique que vincular uma Component Property não alterou texto, sizing ou clipping. Faça uma prova temporária da edição na instance quando a API permitir; remova os nodes de prova. Isso complementa, mas não substitui, a inspeção do painel e do canvas pelo usuário.
- Defina `isExposedInstance` somente depois de anexar a instance a um Component ou Component Set (inclusive por um Frame descendente). A API rejeita a exposição de uma instance ainda solta na página.
- Mantenha a fonte do plugin em `apps/obsidian-ui-system-figma/`; o build gera `dist/code.js`. Um novo build não atualiza Component Sets já gerados no arquivo.

## Critério de fechamento de cada componente

1. Os exports reais e o modelo experimental sustentam anatomia, visual, sizing e estados; ausências relevantes são explícitas.
2. TypeScript, build e testes pertinentes passam. O plugin falha antes de deixar um set incompleto quando uma dependência exigida falta.
3. O Figma contém ComponentNodes e Component Set nativos com variants, textos e vetores editáveis; as propriedades aparecem no painel das instances com os defaults esperados.
4. O usuário verifica no Figma Desktop resize horizontal, altura, alinhamento, posicionamento, clipping e edição de texto em cada estado relevante, inclusive um caso estreito e um conteúdo alterado.
5. A documentação distingue validação estática, prova feita pela API durante a geração e validação visual manual. Não declare o componente fechado enquanto a última estiver pendente.
