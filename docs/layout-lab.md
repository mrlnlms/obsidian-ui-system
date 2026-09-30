# Atlas canônico e Layout Probe Lab

O plugin oferece duas abas independentes no workspace do Obsidian:

| Entrada na paleta de comandos | Conteúdo | Export local |
| --- | --- | --- |
| **Open Obsidian UI Atlas** | Specimens e variants canônicos do `component-registry.ts`; captura pública normal | `dev-vault/ui-catalog-exports/<timestamp>/` com `manifest.json`, `tokens.json`, `components.json` |
| **Open Obsidian UI Layout Lab** | Fixtures experimentais dos mesmos componentes reais em hosts e conteúdos controlados; medidas e inferências | `dev-vault/layout-spike-exports/<timestamp>/layout.json` |

Cada comando revela sua aba existente se já estiver aberta. O Atlas não monta fixtures nem roda probes ao abrir ou exportar o snapshot oficial. O Lab não produz o snapshot oficial. Ambos os diretórios de exportação são locais e ignorados pelo Git. Host, conteúdo e largura são contextos de medição, não variants do registry. O schema público permanece em `packages/ui-schema`; observações, inferências e `intermediateModel` do Lab permanecem experimentais.

## Executar e conferir

1. No vault `dev-vault`, abra **Open Obsidian UI Layout Lab** pela paleta. A aba apresenta os specimens do suite em hosts de 160, 240 e 480 CSS px. A lista de fixtures tem scroll próprio.
2. Clique **Measure layout probes** para preencher as tabelas de inferências e caixas medidas, sem salvar arquivo. Expanda **Measured root boxes by host and content** para ver cada contexto.
3. Clique **Export layout probes** para recriar fixtures, medir e gravar `layout.json`. Confira `observations`, `inferences`, `probeSuite`, `environment` e `viewport` no arquivo. O `intermediateModel` gerado fica dentro de cada inferência.
4. Para o snapshot canônico, abra **Open Obsidian UI Atlas** e clique **Export snapshot**. Esse caminho é independente do Lab.

O comando `npm run test:layout` testa a inferência sem abrir Obsidian; `npm run check`, `npm run build` e `npm run test:diff` validam TypeScript, plugin e comparador. Uma medição real continua necessária após mudanças em DOM, CSS, suite ou runtime do Obsidian.

O código fica em `layout-lab.ts` (view), `layout-probes.ts` (suite declarativa), `layout-capture.ts` (DOM/CSSOM, medidas e export) e `layout-inference.ts` (regras puras).

## Adicionar um probe

Edite somente a seleção em [`layout-probes.ts`](../apps/obsidian-capture/src/layout-probes.ts), por exemplo:

```ts
specimens: [
  { id: 'obsidian.dropdown', variants: ['selected'], hosts: [
    { id: 'narrow', widthPx: 160 },
    { id: 'wide', widthPx: 480 },
  ] },
]
```

Sem `variants`, todas as variants canônicas da definição são usadas; sem `hosts`, valem `defaultHosts`. Sem `contents`, valem `defaultContents` apenas quando a factory do registry declara `supportsLayoutContentProbe`. Para um probe de texto, declare `contents: [{ id: 'short', text: 'OK' }]` e forneça `setContentForLayoutProbe` usando uma API pública que preserve o estado da variant. O resolvedor rejeita IDs de variants ausentes, conteúdo sem setter e chaves de probe duplicadas. Não adicione variants artificiais ao registry só para medir layout.

## Ponto de retomada

A [análise de inferência](layout-inference.md) registra a exportação de referência de 102 observações e 16 specimens: Button `hug/high` na horizontal; Search `fill/high`; Dropdown horizontal `unknown`; Slider raiz `fill/high` com faixa interna ainda `unknown`; Setting raiz `fill/high` e altura `unknown`. `fixed` vertical descreve invariância nos contextos medidos, não uma garantia universal. As regras estão em [`layout-inference.ts`](../apps/obsidian-capture/src/layout-inference.ts) e não dependem de IDs específicos.

Os principais `unknown` restantes envolvem menu nativo e sizing do Dropdown, anatomia interna e ícones de Search, faixa interna do Slider e wrapping/filhos de Setting. O próximo uso planejado do Lab é reunir evidência para evoluir o **Figma-ready model** experimental. Isso não autoriza implementar o plugin do Figma nem promover campos para o schema público sem um milestone próprio.

## Validação da separação

No runtime observado, o Lab exportou `dev-vault/layout-spike-exports/2026-09-30T22-27-18-213Z/layout.json`. Comparado ao último export do Atlas com probes (`2026-09-30T21-59-03-573Z`), preservou **102 chaves de observação** e as **16 inferências completas**, inclusive evidências, confiança, `unknowns` e modelo intermediário. Retirando coordenadas absolutas de posição e o nome da classe CSS do host experimental, as observações medidas também coincidem. As 12 diferenças brutas de classe vêm do host do Slider, que é a própria raiz capturada nessa fixture; não representam mudança da API visual do Obsidian.

O Atlas exportou separadamente `dev-vault/ui-catalog-exports/2026-09-30T22-31-49-752Z/`: **59 specimens**, **945 tokens**, mesmo runtime/SDK/schema/mode do baseline `2026-09-30T20-58-40-647Z`. O diff semântico encontrou **0 adicionados, 0 removidos, 39 inalterados e 20 alterados**, com **0 mudanças de tokens**. Todas as alterações de specimens são larguras/medidas ou margem computada; a largura disponível da aba mudou entre capturas. Não houve diferença de anatomia, classes, estados nem valores. O relatório local em `snapshot-diffs/layout-lab-separation/` é ignorado pelo Git; estas conclusões ficam registradas aqui para retomada.
