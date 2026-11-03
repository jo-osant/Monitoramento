import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { detectar } from './detector';
import { lerPorTimestamp } from './parser';
import { Encontro } from './types';

// Processa UM arquivo: lê grupo por grupo e junta os encontros achados.
async function processarArquivo(caminho: string): Promise<Encontro[]> {
  const encontros: Encontro[] = [];
  for await (const grupo of lerPorTimestamp(caminho)) {
    for (const e of detectar(grupo.timestamp, grupo.registros)) encontros.push(e);
  }
  return encontros;
}

// dataset1.txt -> respostas1.json (mesmo padrão dos exemplos)
function nomeSaida(caminho: string): string {
  const base = basename(caminho, extname(caminho));
  return base.replace(/^dataset/, 'respostas') + '.json';
}

async function main(): Promise<void> {
  // Argumentos: 1º = arquivo ou pasta de entrada, 2º = pasta de saída (padrão: "output")
  const [entrada, pastaSaida = 'output'] = process.argv.slice(2);
  if (!entrada) {
    console.error('Uso: node dist/main.js <arquivo.txt | pasta> [pastaSaida]');
    process.exit(1);
  }

  // Se for pasta, pega todos os .txt dela; se for arquivo, processa só ele.
  const arquivos = statSync(entrada).isDirectory()
    ? readdirSync(entrada).filter((f) => f.endsWith('.txt')).sort().map((f) => join(entrada, f))
    : [entrada];

  mkdirSync(pastaSaida, { recursive: true });

  let tempoTotal = 0;
  for (const arquivo of arquivos) {
    const inicio = performance.now();
    const encontros = await processarArquivo(arquivo);
    const ms = performance.now() - inicio; // tempo só do processamento, sem gravar o JSON
    tempoTotal += ms;

    const destino = join(pastaSaida, nomeSaida(arquivo));
    writeFileSync(destino, JSON.stringify(encontros, null, 2)); // 2 = indentado, como o exemplo
    console.log(`${basename(arquivo)}: ${encontros.length} encontros em ${ms.toFixed(0)} ms -> ${destino}`);
  }
  console.log(`Tempo total: ${tempoTotal.toFixed(0)} ms`);
}

// Se qualquer erro escapar, mostra e encerra com código de falha.
main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});