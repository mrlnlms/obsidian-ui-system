# Pacote de transferência para Figma

## Gerar Package v1

No vault `dev-vault`, abra a Command Palette (`Cmd/Ctrl+P`) e execute **Export Obsidian UI Figma Package**. Mapping e Layout Lab podem estar fechados. O comando monta temporariamente os specimens canônicos e os probes no documento ativo, usa as mesmas rotinas de captura e inferência dos exports individuais, valida os resultados e salva `dev-vault/obsidian-ui-exports/figma-packages/obsidian-ui-package-<timestamp UTC>.zip`. Uma notificação mostra o caminho final ou a causa da falha. Nenhum botão ou configuração foi adicionado às views.

O fluxo normal termina aí: **Export Obsidian UI Figma Package → ZIP pronto**. Não há comando de limpeza a executar depois.

O ZIP contém, na raiz:

| Arquivo | Conteúdo |
| --- | --- |
| `manifest.json` | Manifest canônico do Mapping: schema, versões do Obsidian runtime e SDK, horário, plataforma e modo |
| `components.json` | Specimens canônicos do Mapping |
| `tokens.json` | Variáveis CSS capturadas pelo Mapping |
| `layout.json` | Suite, observações, inferências e modelo experimental do Layout Lab |
| `package-manifest.json` | Formato de transporte `obsidian-ui-figma-package`, versão `1`, e identificador do modelo de layout |

`manifest.json`, `components.json`, `tokens.json` e `layout.json` preservam seus formatos individuais. O metadado de transporte evita repetir versões e timestamp que já estão no manifest canônico. `layout.environment` contém o mesmo manifest; o builder exige igualdade exata, além de presença de todos os specimens do registry, tokens e inferências com medições correspondentes. Também verifica se o ambiente não mudou entre as etapas. Os JSONs usados pelo pacote ficam em memória. Após as verificações, o builder grava um `.zip.partial` identificado em `.obsidian-ui-system/package-staging/` e o renomeia para a pasta pública de ZIPs. O rename consome o staging em sucesso; em falha tratada, o builder tenta removê-lo. Antes de uma nova execução, remove somente partials órfãos com nomes próprios reconhecidos, inclusive os partials do formato anterior na pasta pública.

Em falha tratada, `.obsidian-ui-system/package-failures/<run-id>.json` guarda um diagnóstico pequeno com etapa, horário e erro. A notificação mostra o caminho. Esses registros permanecem até revisão manual; a limpeza de desenvolvimento não os apaga. Uma falha de escrita do próprio diagnóstico é informada; nesse caso não há como garantir o arquivo de diagnóstico. O Package Builder não grava exports individuais do Mapping ou do Lab durante a geração do ZIP.

## Relação com os exports existentes

**Obsidian UI Mapping** continua responsável pelo catálogo público e pelo export canônico em `dev-vault/.obsidian-ui-system/ui-catalog-exports/`. **Obsidian UI Layout Lab** continua responsável pelos probes e inferências experimentais em `dev-vault/.obsidian-ui-system/layout-lab-exports/`. O Package Builder apenas orquestra ambos numa execução e não altera o schema público nem as heurísticas. Os exports individuais permanecem disponíveis para diagnóstico.

O formato de transporte é `1`; o schema canônico atual é `0.4.0`, e novos exports de layout usam `mapping-layout-probes-2`. O importer Figma também aceita `atlas-layout-probes-2` em pacotes exportados antes da renomeação. Ele verifica esses identificadores e a consistência do pacote antes de habilitar **Generate UI Kit**. Na UI do plugin, selecione apenas o ZIP em **Figma Package**; os JSONs individuais não são entradas separadas do fluxo normal.

## Package v2 multi-mode

O builder v2 é uma CLI de desenvolvimento que agrega quatro exports individuais já capturados: Mapping Dark, Layout Lab Dark, Mapping Light e Layout Lab Light. O comando completo e os destinos estão em [Desenvolvimento](../../development.md#figma-package-and-local-artifacts). O comando de Obsidian acima continua gerando v1; o importer Figma atual rejeita v2 antes de tentar gerar componentes.

O ZIP v2 conserva os cinco nomes de arquivo, mas usa `obsidian-ui-figma-package` versão `2` e schema agregado `0.5.0`:

| Arquivo | Contrato v2 |
| --- | --- |
| `package-manifest.json` | Transporte v2, schema agregado e identificadores dos modelos de token, componente e layout |
| `manifest.json` | `modes: ["dark", "light"]`, horário de montagem, quatro `capture-context.json` de origem, contexto técnico verificado e origem da camada de inferências |
| `tokens.json` | Uma identidade por nome CSS; observações opcionais Dark e Light, cada uma completa, com cobertura CSSOM por mode; sem `tokens.values` |
| `components.json` | Arrays completos de snapshots em `dark` e `light` |
| `layout.json` | Uma suite, observações brutas separadas por mode e apenas as inferências da captura de Layout Lab selecionada |

O builder verifica que cada sidecar corresponde ao seu próprio artifact e que os quatro contextos compartilham hash do build, viewport/DPR, versões do Obsidian e SDK, schema individual `0.4.0` e plataforma. Exige exatamente um Dark e um Light, as mesmas identidades de specimens e probes nos dois modes, e uma suite de probes igual. Horários de Mapping e Layout Lab são preservados individualmente, sem exigência de coincidência. Um nome de community theme indisponível permanece `null`. O builder não recalcula CSS, não cria valores ausentes nem refaz as inferências de layout.

Os exports individuais e o ZIP final são locais, ignorados por Git e retidos até remoção manual. O fixture versionado em `apps/obsidian-ui-mapping/tests/fixtures/` contém o par controlado usado pelos testes do builder; os diretórios originais no `dev-vault` continuam sendo a evidência de runtime. O importer de produção ainda não aceita v2; há somente um leitor separado para o piloto de Variables descrito abaixo.

Os pacotes ficam locais e ignorados por Git. O teste `npm run test:package --workspace @obsidian-ui-system/mapping` verifica a estrutura ZIP e rejeições de inconsistência. A captura real depende do Obsidian Desktop e deve ser conferida após o build.

## Projeção experimental de tokens para Figma Variables

A fonte canônica continua sendo `tokens.json` do Package v2. O módulo puro `apps/obsidian-ui-system-figma/src/variable-projection.ts` registra uma decisão para cada identidade sem alterar o package. Um plugin de desenvolvimento separado usa três dessas decisões em um arquivo Figma descartável; o importer v1 e a geração de Button/Search continuam aceitando apenas v1 e não criam Variables.

A análise usou o ZIP local `dev-vault/obsidian-ui-exports/figma-packages/obsidian-ui-package-v2-2026-10-01T21-31-26-285Z.zip` (SHA-256 `718ba4062b001be12d0284263b2de565f05b25b0ff2f5a62651ed1df9d9450a3`). Das 1.181 identidades, 940 resolvem em ambos os modes, 5 somente no Dark, 3 somente no Light e 233 em nenhum. Esses 233 permanecem evidência válida e podem ganhar contexto em capturas futuras.

| Decisão de projeção | Triagem neste par | Regra |
| --- | ---: | --- |
| `direct` | Até 551 candidatos técnicos: 266 cores diretas, 233 escalares `px` e 52 números visuais plausíveis | Criar somente quando a representação for fiel **e** útil ao UI Kit; o total não é meta de cobertura. |
| `needs-evaluation → COLOR` | 65 expressões de cor completas e resolvidas nos dois modes: 38 com `color-mix()` e 27 com HSL/`calc()` | Avaliar em uma propriedade CSS tipada no browser, normalizar para RGBA e conferir contra estilos resolvidos dos specimens antes de criar Variable. |
| `deferred` | 10 durações/curvas de easing neste par | Candidatos futuros de round-trip `ms ↔ segundos` e CSS easing ↔ `MotionEasing`, fora do piloto. |
| `omit` por enquanto | Demais identidades | Preservar no Package v2. Inclui valores sem ambos os modes, strings arbitrárias, keywords, blend modes, sombras, gradientes e listas sem binding claro. |

Os limites da tabela são uma triagem técnica, não uma meta de Variables. **A primeira projeção implementada é intencionalmente mais estreita:** no par controlado, registra 3 `direct`, 65 `needs-evaluation`, 10 `deferred` e 1.103 `omit`. `direct` foi autorizado somente para `--background-primary`, `--modal-background` e `--button-radius`; `deferred` preserva motion como possibilidade futura. Coincidência de valor entre token e specimen não comprova vínculo nem alias. Para alias, exigir declaração atribuída exatamente como `var(--x)`, sem fallback ou expressão adicional, e tipos compatíveis. O alvo pode diferir por mode quando o CSS observado diferir. `var(--x, fallback)` e `calc(var(--x) + ...)` não viram Figma Alias. Valores ausentes, `unresolved`, `no-applicable-declaration` ou `unknown` não recebem fallback de outro mode.

Prova de browser, sem alteração de código: em Chrome 154 headless isolado, as 130 observações dos 65 tokens de expressão foram aceitas como cor CSS. `--interactive-accent` produziu `rgb(138, 92, 245)` no Dark e `rgb(152, 115, 247)` no Light, exatamente os backgrounds de Button CTA em `components.json`. Para `--background-modifier-hover`, o CSS computado saiu em `oklch(...)`; a rasterização sRGB coincidiu com os pixels de um fundo observado de `abstract-input-suggest` em cada mode, sem provar vínculo de origem. Canvas de 8 bits arredonda cor/alfa, e Chrome isolado não prova o comportamento do browser da UI do Figma. A custom property em si continua retornando a expressão; a avaliação ocorre quando aplicada a `color`/`background-color`. Não generalizar esse método para `calc()` de dimensões relativas ou dependentes do elemento.

**Piloto de desenvolvimento:** o manifesto `apps/obsidian-ui-system-figma/manifest.variables-pilot.json` abre um fluxo separado para ler v2. Em um arquivo Figma descartável, ele cria uma collection Dark/Light e somente `--background-primary` (`COLOR`), `--modal-background` (alias `COLOR` em ambos os modes) e `--button-radius` (`FLOAT`, `8px → 8`). O próprio plugin relê valores e aliases por mode com a API do Figma, testa a resolução ao trocar o mode em um frame temporário e remove esse frame. Em falha, remove a collection recém-criada. Uma execução bem-sucedida deixa a collection no arquivo de teste para inspeção. A UI avalia `--interactive-accent` separadamente em uma propriedade CSS tipada e compara com o Button CTA capturado; não cria Variable para esse token. Essa prova precisa ser executada no Figma Desktop para confirmar seu runtime; check/build/testes locais não a substituem. Nenhuma mudança upstream foi demonstrada como necessária.

## Artefatos locais e limpeza

`dev-vault/obsidian-ui-exports/figma-packages/` guarda os ZIPs finais de transferência. O usuário pode mantê-los ou apagá-los quando não forem mais necessários. `dev-vault/.obsidian-ui-system/` guarda os exports técnicos do Mapping (`ui-catalog-exports/`), do Lab (`layout-lab-exports/`), os relatórios de diff (`snapshot-diffs/`), staging do pacote (`package-staging/`) e diagnósticos de falha (`package-failures/`). O prefixo de ponto mantém a área técnica fora da navegação normal do vault. Ambas as áreas são ignoradas pelo Git.

**Developer: Clean Obsidian UI Development Exports** é uma ferramenta opcional de manutenção na Command Palette. Ela mostra contagens e pede confirmação antes de apagar apenas exports individuais do Mapping/Lab e relatórios de diff. Não toca em Figma Packages, staging do Package Builder ou diagnósticos de falha. Não há retenção automática dos exports deliberados de desenvolvimento. O ZIP fixture versionado em `apps/obsidian-ui-system-figma/tests/fixtures/` continua no repositório para testes repetíveis.

Para uma comparação reproduzível atual, gere dois novos exports individuais e use a CLI de diff.

## Limites atuais do importer

O pré-voo do ZIP e a geração chamam os leitores de Button e Search separadamente. Os validadores de campos são locais a cada leitor. A geração remove os sets parciais se uma etapa falhar. O importer não atualiza Component Sets anteriores e ainda não cria Figma Variables a partir de `tokens.json`.
