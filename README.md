# Detecção de Encontros: Trainee Tech Spacecom 2027

Programa em TypeScript (Node.js) que processa posicionamentos de geolocalização e detecta encontros físicos entre monitorados (tornozeleira) e vítimas (medida protetiva), classificando cada encontro como `generico`, `faccao` ou `protetiva`.

**Autor:** João Victor da Silva dos Santos

## Requisitos
- Node.js 18 ou superior (desenvolvido e testado com Node 22 e 24)
- npm

## Como executar

```bash
npm install          # instala typescript e @types/node
npm run build        # compila src/ para dist/

# processar um dataset
node dist/main.js caminho/para/dataset1.txt output

# processar todos os .txt de uma pasta
node dist/main.js caminho/para/pasta-dos-datasets output
```

Os resultados são gravados em `output/`, um arquivo por dataset (`dataset1.txt` gera `respostas1.json`). O programa também imprime o número de encontros e o tempo de processamento de cada arquivo.

### Conferir com um gabarito (opcional)
```bash
node dist/compare.js output/respostas1.json caminho/para/respostas1.json
```
Mostra corretos, falsos e faltando, e o score (`corretos - falsos`). É uma ferramenta de teste e não faz parte do algoritmo.

## Como funciona

1. **Leitura em streaming** (`parser.ts`): o arquivo é lido em blocos de 16 MB e convertido, linha a linha, em registros tipados. Como os arquivos vêm agrupados por timestamp, o programa entrega um grupo por vez e descarta, usando memória quase constante. Isso é necessário porque os maiores datasets passam de 400 MB.
2. **Agrupar por timestamp**: só se comparam posicionamentos com o mesmo timestamp, como pede o enunciado.
3. **Pares dentro do grupo** (`detector.ts`): cada par é testado uma única vez. Um pré-filtro descarta pares cuja diferença de latitude já ultrapassa 20 m, porque a distância na esfera nunca é menor que essa diferença. Os que sobram passam pelo Haversine (raio 6.371.000 m). É encontro quando a distância é **estritamente menor que 20 m**.
4. **Classificação**: cada par recebe um único tipo, com prioridade `protetiva` > `faccao` > `generico`.

## Como eu resolvi

A ideia central é simples. O enunciado manda comparar só posicionamentos do mesmo horário, então eu leio o arquivo e vou separando por timestamp. Para cada horário, olho todos os pares de pessoas e calculo a distância entre elas com a fórmula de Haversine. Se der menos de 20 metros, é um encontro.

Depois de achar o encontro, preciso dizer de que tipo ele é. Aqui os gabaritos me ajudaram: quando um par é protetivo ou de facção, ele aparece uma vez só com esse tipo, e não de novo como genérico. Então segui essa ordem: protetiva primeiro, depois facção, e genérico por último.

Para ganhar velocidade, antes de calcular o Haversine eu olho só a diferença de latitude. Se ela já passa de 20 metros, o par não tem como ser um encontro, então pulo a conta. Isso não muda o resultado, só evita cálculo desnecessário.

Os arquivos maiores (até 638 MB) não cabem de uma vez na memória, então eu leio em pedaços e processo um horário por vez.

## Decisões que tive que tomar

O enunciado deixa algumas coisas em aberto, e eu resolvi assim:

- **Par que serve para mais de um tipo:** registro uma vez só, com o tipo mais específico. Isso bate com os gabaritos.
- **Facção vazia:** não conta como "mesma facção". Duas pessoas sem facção são só um encontro genérico.
- **Vítima no genérico:** esta foi a dúvida que não consegui fechar com os gabaritos. Entendi que "monitorados" são quem usa tornozeleira, então a vítima só gera encontro do tipo protetiva, com o agressor da lista dela. Deixei isso numa constante (`generico_vitima`, em `src/detector.ts`), para ser fácil mudar. Testei a outra opção e o resultado dos datasets não mudou.
- **Distância no JSON:** gravo o valor completo, sem arredondar, igual ao exemplo do enunciado.

## Por que escolhi essa abordagem

Procurei a solução mais simples que desse o resultado certo. Com no máximo 120 pessoas por horário, comparar todos os pares é menos complexo, e é fácil explicar e conferir que está correto. Pensei em estruturas mais avançadas para busca por proximidade, mas com tão poucos pontos por horário elas dariam mais trabalho do que ganho.

Também considerei acrescentar uma análise com machine learning e uma interface para fazer uma entrega mais notável, mas os dados têm poucos encontros e o enunciado pede o algoritmo, então preferi deixar o projeto enxuto e bem validado.

## Resultados

Encontros detectados em cada dataset:

- dataset1.txt: 4 encontros em 23 ms -> output\respostas1.json
- dataset2.txt: 6 encontros em 51 ms -> output\respostas2.json
- dataset3.txt: 10 encontros em 202 ms -> output\respostas3.json
- dataset4.txt: 15 encontros em 808 ms -> output\respostas4.json
- dataset5.txt: 21 encontros em 2323 ms -> output\respostas5.json
- dataset6.txt: 27 encontros em 15533 ms -> output\respostas6.json
- dataset7.txt: 35 encontros em 22427 ms -> output\respostas7.json
- Tempo total: 41368 ms

Tempos medidos na minha máquina, contando a leitura e a detecção, sem a gravação do JSON.

Nos datasets 1 e 2 o resultado ficou igual aos gabaritos, sem falsos e sem faltando.

## Dificuldades que tive

- **Entender a Lógica.** Me organizar em relação a tudo o que estava sendo pedido, e entender todos os processis que precisariam ser utilizados para chegar no resultado esperado.
- **Entender o Haversine.** Eu queria saber por que usa radianos e por que a longitude entra com o cosseno da latitude. Precisei estudar isso com calma para conseguir explicar (Não consegui entender 100% da lógica aplicada).
- **Decidir o que o enunciado não diz.** A dúvida sobre vítimas no genérico foi a mais chata, porque os gabaritos não mostram nenhum caso desse tipo. Acabei documentando a suposição em vez de fingir que tinha certeza.
- **Arquivos grandes.** Os datasets 6 e 7 são bem maiores que os outros, e ler tudo de uma vez não funciona. Tive que entender como ler em pedaços.

## O que aprendi

Aprendi que conferir o resultado de duas formas diferentes dá muito mais segurança do que confiar no primeiro que funciona. Também aprendi a ler arquivos grandes em partes, e a calcular distância entre dois pontos no mapa global. E que registrar as dúvidas e as suposições no README é tão importante quanto o código.

## O que eu faria em um sistema real

Se isso fosse para um sistema de verdade, eu usaria uma estrutura de busca por proximidade para aguentar muito mais pessoas ao mesmo tempo. Aceitaria uma pequena diferença de tempo entre as posições, já que na prática os aparelhos não reportam no mesmo segundo. E trataria o erro do GPS, só gerando alerta quando as duas pessoas ficassem próximas por vários pontos seguidos, para evitar alarme falso.

## Como usei IA

Utilizei o Claude como auxílio, ele me ajudou a analisar o enunciado e os gabaritos, comparar melhores lógicas a serem utilizadas, me deu explicações das partes que não entendi e a analisar as respostas gerada pelo sistema com os arquivos dos datasets, para validar se as respostas estavam corretas.