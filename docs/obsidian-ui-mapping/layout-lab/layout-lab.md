# Mapping canônico e Layout Probe Lab

O plugin oferece duas abas independentes no workspace do Obsidian:

| Entrada na paleta de comandos | Conteúdo | Export local |
| --- | --- | --- |
| **Open Obsidian UI Mapping** | Specimens e variants canônicos do `component-registry.ts`; captura pública normal | `dev-vault/.obsidian-ui-system/ui-catalog-exports/<timestamp>/` com `manifest.json`, `tokens.json`, `token-evidence.json`, `components.json`, `capture-context.json` |
| **Open Obsidian UI Layout Lab** | Fixtures experimentais dos mesmos componentes reais em hosts e conteúdos controlados; medidas e inferências | `dev-vault/.obsidian-ui-system/layout-lab-exports/<timestamp>/` com `layout.json` e `capture-context.json` |

Cada comando revela sua aba existente se já estiver aberta. O Mapping não monta fixtures nem roda probes ao abrir ou exportar o snapshot oficial. O Lab não produz o snapshot oficial. Ambos os diretórios de exportação são locais e ignorados pelo Git. Host, conteúdo e largura são contextos de medição, não variants do registry. O schema público permanece em `packages/ui-schema`; observações, inferências e `intermediateModel` do Lab permanecem experimentais.

## Executar e conferir

1. No vault `dev-vault`, abra **Open Obsidian UI Layout Lab** pela paleta. A aba apresenta os specimens do suite em hosts de 160, 240 e 480 CSS px. A lista de fixtures tem scroll próprio.
2. Clique **Measure layout probes** para preencher as tabelas de inferências e caixas medidas, sem salvar arquivo. Expanda **Measured root boxes by host and content** para ver cada contexto.
3. Clique **Export layout probes** para recriar fixtures, medir e gravar `layout.json`. Confira `observations`, `inferences`, `probeSuite`, `environment` e `viewport` no arquivo. O `intermediateModel` gerado fica dentro de cada inferência.
4. Para o snapshot canônico, abra **Open Obsidian UI Mapping** e clique **Export snapshot**. Esse caminho é independente do Lab.

O comando `npm run test:layout` testa a inferência sem abrir Obsidian; `npm run check`, `npm run build` e `npm run test:diff` validam TypeScript, plugin e comparador. Uma medição real continua necessária após mudanças em DOM, CSS, suite ou runtime do Obsidian.

O código fica em `layout-lab.ts` (view), `layout-probes.ts` (suite declarativa), `layout-capture.ts` (DOM/CSSOM, medidas e export) e `layout-inference.ts` (regras puras).

O `capture-context.json` associa cada export do Lab ao hash SHA-256 do `main.js` instalado, ao viewport e às versões/mode do manifest em `layout.environment`. Para um par Dark/Light, preserve dois `layout.json`: cada um mantém suas observações visuais brutas. A futura agregação selecionará as inferências de um deles como camada única, identificada pelo mode e horário da captura escolhida. Isso não muda a conclusão já validada de que Light/Dark não requer modelos diferentes de comportamento de layout.

## Adicionar um probe

Edite somente a seleção em [`layout-probes.ts`](../../../apps/obsidian-ui-mapping/src/layout-probes.ts), por exemplo:

```ts
specimens: [
  { id: 'obsidian.dropdown', variants: ['selected'], hosts: [
    { id: 'narrow', widthPx: 160 },
    { id: 'wide', widthPx: 480 },
  ] },
]
```

Sem `variants`, todas as variants canônicas da definição são usadas; sem `hosts`, valem `defaultHosts`. Sem `contents`, valem `defaultContents` apenas quando a factory do registry declara `supportsLayoutContentProbe`. Para um probe de texto, declare `contents: [{ id: 'short', text: 'OK' }]` e forneça `setContentForLayoutProbe` usando uma API pública que preserve o estado da variant. O resolvedor rejeita IDs de variants ausentes, conteúdo sem setter e chaves de probe duplicadas. Não adicione variants artificiais ao registry só para medir layout.

## Limites

O Lab registra evidência e classificações experimentais; `unknown` deve permanecer explícito quando os probes não distinguem regras de sizing. Consulte as [regras de inferência](layout-inference.md) para os critérios e limites atuais. Button e Search são os únicos pilotos Figma autorizados e validados; componentes adicionais exigem um novo milestone.
