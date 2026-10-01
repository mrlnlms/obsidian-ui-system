# Reconstrução de componentes Obsidian no Figma

Esta é a referência de trabalho para os próximos componentes. Consulte-a junto com as skills indicadas em [`AGENTS.md`](../AGENTS.md). Atualize apenas regras que se mostrem reutilizáveis; mantenha medidas e resultados específicos de cada investigação nos documentos do respectivo componente.

## Evidência antes da estrutura Figma

1. O Atlas exporta `components.json`: identidade `(id, variant)`, conteúdo, anatomia e estilos observados no Obsidian. O Layout Lab exporta `layout.json`: probes declarativos em diferentes larguras de host e conteúdos, medições e inferências com evidência e confiança. Esses arquivos locais são importados pela Custom UI; o código principal do plugin não lê o filesystem.
2. Construa um modelo experimental Figma-ready entre os exports e os nodes. Registre separadamente o campo **observado**, a regra **inferida** e a **tradução Figma**. Preserve `unknown` quando os probes não distinguirem as hipóteses. Não altere o schema público apenas para acomodar a tradução.
3. Valide raiz e descendentes por eixo. `display:flex` sozinho não demonstra Hug, e uma largura medida em um viewport não demonstra Fixed. Use variação de host e de conteúdo para distinguir os casos; não introduza exceções por ID de componente na inferência genérica.
4. Obtenha ícones de SVG, máscara ou geometria observável. Se a origem ou geometria não puder ser reconstruída com confiança, registre a lacuna antes de gerar o componente. Não desenhe um substituto aproximado.

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
- Prefira uma propriedade de texto compartilhada quando ela representar o mesmo campo nas variants. Preserve o valor padrão observado de cada estado. Se a API não conseguir reunir a propriedade sem perder os defaults, use propriedades separadas com nomes semânticos.
- `addComponentProperty()` retorna uma chave opaca: use a chave retornada em `componentPropertyReferences.characters`. Para defaults diferentes entre variants, crie a propriedade em cada ComponentNode antes de `combineAsVariants`, confira se o set expõe uma única propriedade e teste a edição em instances temporárias. Só trate a combinação como confirmada após inspecionar o painel no Figma Desktop.
- Ao combinar variants, confira a propriedade `State`, o número de variants e os valores padrão. Posicione as variants dentro do set depois de `combineAsVariants`; o arranjo do set é apenas organização do canvas.
- Light/Dark são contextos futuros de Variables/Modes. Não duplique Component Sets por tema para resolver um piloto local.

## Padrões já demonstrados

| Componente | Evidência e estrutura | Validação |
| --- | --- | --- |
| `Obsidian / Button` | Largura Hug e altura Fixed inferidas pelo Lab; Auto Layout horizontal, sem wrap, padding e estilos dos exports; `State=Normal/Disabled/CTA`; propriedade `Label`. | No Figma Desktop, uma instance passou de `Example button` para `OK` e a largura se ajustou automaticamente. |
| `Obsidian / Search` | Raiz Fill horizontal e altura Fixed; interior com posicionamento relativo/absoluto, superfície e viewport textual que esticam, lupa à esquerda e clear à direita; SVGs das máscaras capturadas; clipping sem ellipsis; `State=Empty/Filled`. | Layout, resize, altura, ícones e corte simples foram validados manualmente. Consulte o documento específico para o estado da validação das Component Properties. |

Os SVGs Search vêm do CSSOM observado. O Button não tem ícones nesse specimen. Consulte [`figma-button-spike.md`](figma-button-spike.md) e [`figma-search-spike.md`](figma-search-spike.md) para provas e limites específicos, sem copiar suas medidas como regras gerais.

## Cuidados da Plugin API

- Use `@figma/plugin-typings` instalado no projeto e as referências de `figma-use` e `figma-generate-library` antes de pesquisar fora. Use `figma-generative-plugins` ao alterar o plugin. Recorra à web apenas se houver lacuna real ou necessidade de verificar uma mudança recente da API.
- Carregue o `FontName` exato antes de modificar `characters`; `listAvailableFontsAsync()` e `loadFontAsync()` não provam, sozinhos, que um TextNode renderiza. Verifique `hasMissingFont` e dimensões positivas. A stack macOS atual exige SF Pro ativada no Figma Desktop; se falhar, pare com instrução de setup humano.
- Verifique que vincular uma Component Property não alterou texto, sizing ou clipping. Faça uma prova temporária da edição na instance quando a API permitir; remova os nodes de prova. Isso complementa, mas não substitui, a inspeção do painel e do canvas pelo usuário.
- Mantenha a fonte do plugin em `apps/figma-plugin/`; o build gera `dist/code.js`. Um novo build não atualiza Component Sets já gerados no arquivo.

## Critério de fechamento de cada componente

1. Os exports reais e o modelo experimental sustentam anatomia, visual, sizing e estados; ausências relevantes são explícitas.
2. TypeScript, build e testes pertinentes passam. O plugin falha antes de deixar um set incompleto quando uma dependência exigida falta.
3. O Figma contém ComponentNodes e Component Set nativos com variants, textos e vetores editáveis; as propriedades aparecem no painel das instances com os defaults esperados.
4. O usuário verifica no Figma Desktop resize horizontal, altura, alinhamento, posicionamento, clipping e edição de texto em cada estado relevante, inclusive um caso estreito e um conteúdo alterado.
5. A documentação distingue validação estática, prova feita pela API durante a geração e validação visual manual. Não declare o componente fechado enquanto a última estiver pendente.
