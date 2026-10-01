# Probes declarativos e inferência experimental de layout

> Historical capture paths in this document refer to local evidence removed from the development vault during the 2026-10-01 export cleanup. The measured results remain recorded here; current exports use the hidden `.obsidian-ui-system/` area.


Esta fase generaliza o [spike Button/Search](layout-spike.md). O [suite de probes](../apps/obsidian-capture/src/layout-probes.ts) escolhe cinco famílias do registry, hosts de **160, 240 e 480 CSS px** e amostras opcionais de texto curto/longo. Cada variant existente é renderizada pela mesma factory usada pelo catálogo e pelo snapshot público. Button usa `setButtonText`, Search usa `setPlaceholder` no estado vazio ou `setValue` no preenchido, e Setting usa `setName`; Dropdown e Slider recebem somente os três hosts. O campo `supportsLayoutContentProbe` declara a capacidade, sem codificar uma regra de inferência por componente. Host e conteúdo são contextos de medição; **não são variants**.

No [Layout Probe Lab](layout-lab.md), **Measure layout probes** mostra medidas e classificações; **Export layout probes** grava `layout.json` em `dev-vault/.obsidian-ui-system/layout-lab-exports/<timestamp>/` (local e ignorado pelo Git). O arquivo contém `probeSuite`, ambiente, viewport, observações DOM/CSS, inferências com evidência/confiança/probes e `intermediateModel` por `(id, variant)`. O [exemplo versionado do modelo](layout-spike-model.experimental.json) foi gerado da exportação real. Tudo permanece fora do `ui-schema`; `manifest.json`, `tokens.json` e `components.json` continuam iguais.

## Regras atuais

O [inferidor puro](../apps/obsidian-capture/src/layout-inference.ts) compara medições dentro de cada `(id, variant)`:

- **Fill:** largura da raiz muda na mesma proporção que a do host em larguras distintas. Confiança alta se as larguras coincidem; média se há offset estável.
- **Hug:** largura estável entre hosts para cada conteúdo, mas acompanha a mudança da largura do texto direto entre amostras. O caso de excesso além do host eleva a confiança.
- **Fixed horizontal:** largura estável com hosts distintos **e** texto direto de larguras distintas; sem mudança de conteúdo, largura estável é `unknown`, pois também poderia ser intrínseca.
- **Fixed vertical:** altura estável nas larguras medidas; confiança média sem amostra de conteúdo, alta quando também há conteúdos distintos. O rótulo significa invariância **nos contextos medidos**; não prova que a regra CSS original fixa a altura sob outra fonte, altura de host ou quantidade de linhas.
- **Unknown:** evidência ausente, contraditória, caixa não renderizada ou mudança de anatomia. A inferência dos filhos usa o caminho DOM apenas dentro do mesmo specimen: um filho que acompanha o pai pode ser `fill` com confiança média; texto que muda com conteúdo e permanece estável entre hosts pode ser `hug`. Filho de largura constante sem conteúdo manipulável continua `unknown`.

Cada conclusão carrega explicação, confiança e as chaves dos probes usados. O modelo intermediário é produzido automaticamente a partir dessas conclusões e das propriedades de layout observadas; não pretende reproduzir todas as camadas internas de um componente Figma.

## Resultado em runtime

O usuário executou a exportação real `dev-vault/layout-spike-exports/2026-09-30T21-59-03-573Z/layout.json`: **102 observações únicas**, **16 specimens**, **5 famílias**. Obsidian runtime `1.14.3`, SDK `1.13.1`, schema público `0.3.0`, macOS, Dark, tema `null`, viewport `1029 × 1687` CSS px. As observações cobrem 27 medições Button, 18 Search, 9 Dropdown, 12 Slider e 36 Setting. A validação de estado do registry passou em todos os probes.

| Família | Raiz horizontal | Raiz vertical | Filhos / limite principal |
| --- | --- | --- | --- |
| Button (3 variants) | `hug/high` nas três, sem regra especial por ID | `fixed/high`, 30 px observados | Texto direto `hug/high`. Rótulo longo mede 253,83 px nos três hosts; nos hosts de 160 e 240 px ultrapassa a largura disponível, sem encolher. |
| Search (2) | `fill/high`: 160 → 240 → 480 px | `fixed/high`, 30 px observados com textos curto/longo | Input acompanha a raiz (`fill/medium`); offsets e máscaras SVG da lupa e do clear estão no CSSOM. Um export posterior capturou também o placeholder. |
| Dropdown (3) | `unknown`: 129,58 px nos três hosts, mas não houve mutação pública de texto das opções | `fixed/medium`, 30 px observados | `<option>` tem caixas DOM `0 × 0`; o menu nativo não está representado por esses filhos. `max-width: 100%` computado sugere possível mudança em host ainda mais estreito, não testada. |
| Slider (4) | Raiz `fill/high`: 160 → 240 → 480 px | `fixed/medium`, 19,5 px observados | O input/track interno permaneceu em 100 px; o mecanismo deixa sua regra em `unknown`. A imagem do Atlas confirma que ampliar a raiz não alonga a faixa visível. |
| Setting (4) | Raiz `fill/high` em todos os estados | `unknown` em todos: altura varia com texto e/ou host | Layout composto e wrapping; em `standard`, 116,56 px nos hosts de 160/240, mas 68,48 px no de 480. Com rótulo longo, chega a 184,13 px nos hosts estreitos. No host de 160, conteúdo horizontal excede o client width (scroll width 196 px). |

Na amostra de Button, o texto passa de 18,45 para 94,48 e 229,83 px; a raiz mantém uma diferença de 24 px, correspondente ao padding horizontal observado de 12 px por lado. Seu `display:inline-flex`, `white-space:nowrap` e `overflow:visible` continuam explicando o comportamento sob restrição. O resultado reproduz automaticamente a conclusão do [probe direcionado anterior](layout-spike.md), agora para as três variants e três hosts.

## O que generaliza e o que falta

Há um padrão recorrente de **raiz Fill com filhos de outra regra**: Search tem input que acompanha a raiz; Slider tem raiz Fill e faixa interna estável de 100 px; Setting tem raiz Fill, mas filhos e altura dependem de conteúdo e largura. Logo, a classificação da raiz não deve ser aplicada automaticamente aos filhos. O mecanismo já reconhece raiz Hug, raiz Fill, mudanças de altura e casos ambíguos sem tabelas de exceção por API. É um começo de engine generalizável, limitado às condições medidas.

Para avançar sem adivinhar, precisamos de:

1. Probes de conteúdo semanticamente válidos para componentes como Dropdown, quando a API permitir variar nomes de opções sem alterar o estado catalogado. Uma largura de host menor que sua largura natural também testaria `max-width:100%`.
2. Probes de altura de host, tipografia e conteúdo multilinha antes de traduzir `fixed vertical` para uma regra Figma definitiva.
3. Identidade/visibilidade estável dos filhos e geometria de pseudo-elementos, ícones e superfícies nativas. CSSOM computado sozinho não prova se uma largura constante veio de `width` explícito, tamanho intrínseco ou regra do sistema operacional.
4. Análise de flexibilidade e wrapping dos filhos de Setting em mais larguras; a estrutura composta precisa de decisões semânticas antes de virar camadas editáveis.

**Intervenção manual ainda será necessária** para mapear a intenção de controles nativos (Dropdown), composição da faixa do Slider e estrutura/responsividade interna de Setting. O [piloto Search](figma-search-spike.md) identificou SVGs e posicionamento dos pseudo-elementos; o novo export do Lab capturou `input::placeholder` e `appearance` e permitiu o modelo experimental. Esta análise precedeu o [spike Figma de Button](figma-button-spike.md).

## Limite de manutenção

Os specimens e variants canônicos do registry público permanecem intactos. Fixtures exclusivas de probes podem ser refatoradas quando a evidência continuar coberta por testes ou documentação. O comando **Open Obsidian UI Layout Lab** abre os probes numa aba própria; o comando do Atlas contém apenas o catálogo canônico.
