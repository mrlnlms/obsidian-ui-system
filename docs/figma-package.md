# Pacote de transferência para Figma

## Gerar

No vault `dev-vault`, abra a Command Palette (`Cmd/Ctrl+P`) e execute **Export Obsidian UI Figma Package**. Atlas e Layout Lab podem estar fechados. O comando monta temporariamente os specimens canônicos e os probes no documento ativo, usa as mesmas rotinas de captura e inferência dos exports individuais, valida os resultados e salva `dev-vault/obsidian-ui-exports/figma-packages/obsidian-ui-package-<timestamp UTC>.zip`. Uma notificação mostra o caminho final ou a causa da falha. Nenhum botão ou configuração foi adicionado às views.

O ZIP contém, na raiz:

| Arquivo | Conteúdo |
| --- | --- |
| `manifest.json` | Manifest canônico do Atlas: schema, versões do Obsidian runtime e SDK, horário, plataforma e modo |
| `components.json` | Specimens canônicos do Atlas |
| `tokens.json` | Variáveis CSS capturadas pelo Atlas |
| `layout.json` | Suite, observações, inferências e modelo experimental do Layout Lab |
| `package-manifest.json` | Formato de transporte `obsidian-ui-figma-package`, versão `1`, e identificador do modelo de layout |

`manifest.json`, `components.json`, `tokens.json` e `layout.json` preservam seus formatos individuais. O metadado de transporte evita repetir versões e timestamp que já estão no manifest canônico. `layout.environment` contém o mesmo manifest; o builder exige igualdade exata, além de presença de todos os specimens do registry, tokens e inferências com medições correspondentes. Também verifica se o ambiente não mudou entre as etapas. O ZIP só é gravado após todas essas verificações. A gravação usa um arquivo `.partial` e o renomeia ao final.

## Relação com os exports existentes

**Obsidian UI Atlas** continua responsável pelo catálogo público e pelo export canônico em `dev-vault/.obsidian-ui-system/ui-catalog-exports/`. **Obsidian UI Layout Lab** continua responsável pelos probes e inferências experimentais em `dev-vault/.obsidian-ui-system/layout-lab-exports/`. O Package Builder apenas orquestra ambos numa execução e não altera o schema público nem as heurísticas. Os exports individuais permanecem disponíveis para diagnóstico.

O formato de transporte é `1`; o schema canônico atual é `0.4.0`, e o layout usa `atlas-layout-probes-2`. O importer Figma verifica esses três identificadores e a consistência do pacote antes de habilitar **Generate UI Kit**. Na UI do plugin, selecione apenas o ZIP em **Figma Package**; os JSONs individuais não são entradas separadas do fluxo normal.

Os pacotes ficam locais e ignorados por Git. O teste `npm run test:package --workspace @obsidian-ui-system/capture` verifica a estrutura ZIP e rejeições de inconsistência. A captura real depende do Obsidian Desktop e deve ser conferida após o build.

Em 2026-10-01, uma execução real gerou `obsidian-ui-package-2026-10-01T12-12-18-735Z.zip`: ZIP íntegro (CRC válido), cinco JSONs legíveis, 59 specimens, 945 tokens, 102 observações e 16 inferências. `manifest.json` e `layout.environment` coincidiram; Button manteve inferência horizontal `hug/high` e Search `fill/high`.

## Artefatos locais e limpeza

`dev-vault/obsidian-ui-exports/figma-packages/` guarda os ZIPs finais de transferência. O usuário pode mantê-los ou apagá-los quando não forem mais necessários. `dev-vault/.obsidian-ui-system/` guarda apenas os exports técnicos do Atlas (`ui-catalog-exports/`), do Lab (`layout-lab-exports/`) e os relatórios de diff (`snapshot-diffs/`). O prefixo de ponto mantém a área técnica fora da navegação normal do vault. Ambas as áreas são ignoradas pelo Git.

O comando **Clean Obsidian UI Development Exports**, na Command Palette, mostra as contagens por diretório e pede confirmação antes de apagar os arquivos técnicos. Ele não toca em Figma Packages. Não há retenção automática. O ZIP fixture versionado em `apps/figma-plugin/tests/fixtures/` continua no repositório para testes repetíveis.

Os históricos anteriores à migração foram removidos dos locais visíveis após auditoria. As conclusões permanecem nos documentos de investigação; os caminhos timestampados desses documentos são referências históricas, não arquivos que ainda existam no vault. Para uma comparação reproduzível atual, gere dois novos exports individuais e use a CLI de diff.

## Dívida técnica para o próximo componente

O pré-voo do ZIP chama os leitores de Button e Search para recusar evidência incompleta; a geração os chama novamente para construir os modelos. Essa dupla leitura preserva os contratos atuais, mas, ao adicionar outra família, vale considerar passar os modelos já validados adiante. A geração remove os sets parciais se uma etapa falhar. Os pequenos validadores de campos nos dois leitores também se repetem; permanecem locais porque seus contratos e mensagens diferem. Nenhum deles é código morto ou um caminho antigo de importação.
