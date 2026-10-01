# Probes declarativos e inferência experimental de layout

O [Layout Probe Lab](layout-lab.md) mede specimens reais do registry em hosts de **160, 240 e 480 CSS px**, com amostras opcionais de texto curto e longo. A suite é declarada em [`layout-probes.ts`](../../apps/obsidian-capture/src/layout-probes.ts). Host, conteúdo e largura são contextos de medição, não variants do catálogo. O Lab exporta `layout.json` com observações DOM/CSSOM, viewport, ambiente, inferências e um `intermediateModel` experimental. Esses dados ficam fora do snapshot público e de `ui-schema`.

## Regras de inferência

O [inferidor puro](../../apps/obsidian-capture/src/layout-inference.ts) compara medições dentro de cada `(id, variant)`:

- **Fill:** a largura da raiz acompanha a largura do host. A confiança aumenta quando ambas coincidem; um offset estável reduz a confiança.
- **Hug:** a largura permanece estável entre hosts para cada conteúdo e acompanha a mudança da largura do texto direto. Ultrapassar um host estreito reforça a evidência.
- **Fixed horizontal:** a largura permanece estável em hosts e conteúdos distintos. Sem mutação de conteúdo, largura estável continua `unknown`, pois pode ser intrínseca.
- **Fixed vertical:** a altura permanece estável nos contextos medidos. Isso não garante uma altura CSS fixa sob outras fontes, conteúdos ou alturas de host.
- **Unknown:** há evidência ausente ou contraditória, caixa não renderizada ou mudança de anatomia. Um filho que acompanha o pai pode ser `fill`; um filho de largura constante sem conteúdo manipulável continua `unknown`.

Cada conclusão carrega explicação, confiança e as chaves dos probes usados. O modelo intermediário é gerado dessas conclusões e das propriedades observadas; não representa automaticamente todas as camadas internas de um componente Figma. A classificação da raiz não é transferida aos filhos.

## Limites

Dropdown ainda precisa de probes com texto de opções e hosts mais estreitos para distinguir largura intrínseca de uma restrição `max-width`. Slider e Setting precisam de mais evidência sobre faixa interna, wrapping e comportamento dos filhos. Altura de host, tipografia, conteúdo multilinha, pseudo-elementos e superfícies nativas exigem medição ou interpretação adicional antes de virar regras de reconstrução.

Os specimens e variants canônicos permanecem intactos. Fixtures exclusivas de probes podem ser refatoradas quando a evidência continuar coberta por testes ou documentação. Não adicione exceções por ID de componente apenas para forçar uma classificação.
