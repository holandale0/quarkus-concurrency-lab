/**
 * Gera um relatório HTML legível a partir dos dados do handleSummary do k6.
 * Uso: import { makeHandleSummary } from '../lib/report.js';
 *      export const handleSummary = makeHandleSummary('caminho/do/relatorio.html');
 */

export function makeHandleSummary(outputPath) {
  return function handleSummary(data) {
    return {
      [outputPath]: buildHtmlReport(data),
    };
  };
}

function v(metrics, name, key, decimals) {
  try {
    const val = metrics[name] && metrics[name].values[key];
    if (val === undefined || val === null) return 'N/A';
    return decimals !== undefined ? Number(val).toFixed(decimals) : Math.round(Number(val)).toString();
  } catch (_) {
    return 'N/A';
  }
}

function pct(metrics, name, key) {
  try {
    const val = metrics[name] && metrics[name].values[key];
    return val !== undefined ? (Number(val) * 100).toFixed(2) : 'N/A';
  } catch (_) {
    return 'N/A';
  }
}

function glossaryItem(code, label, html) {
  return (
    '<div class="gi">' +
    '<button class="gt" onclick="tog(this)">' +
    '<span class="gterm"><span class="tc">' + code + '</span>' + label + '</span>' +
    '<span class="arr">▼</span>' +
    '</button>' +
    '<div class="gb">' + html + '</div>' +
    '</div>'
  );
}

function insight(vAvg, pAvg) {
  const v = parseFloat(vAvg);
  const p = parseFloat(pAvg);
  if (isNaN(v) || isNaN(p)) return '';
  const diff = Math.abs(((p - v) / p) * 100).toFixed(0);
  if (v < p) {
    return (
      '<div class="insight">' +
      '<div class="insight-title">💡 Conclusão do teste</div>' +
      '<p>Neste cenário, as <strong>Virtual Threads foram ' + diff + '% mais rápidas</strong> que as Platform Threads. ' +
      'Isso acontece porque a carga simulada é principalmente de I/O (espera por serviços externos). ' +
      'Virtual Threads não ficam presas esperando — elas liberam o processador enquanto aguardam, ' +
      'permitindo que milhares de tarefas rodem ao mesmo tempo com pouquíssima memória.</p>' +
      '</div>'
    );
  } else if (p < v) {
    return (
      '<div class="insight">' +
      '<div class="insight-title">💡 Conclusão do teste</div>' +
      '<p>Neste cenário, as <strong>Platform Threads foram ' + diff + '% mais rápidas</strong>. ' +
      'Isso pode ocorrer em cargas predominantemente de CPU, onde Virtual Threads não têm vantagem ' +
      'pois o gargalo é o processador, não a espera por I/O.</p>' +
      '</div>'
    );
  }
  return (
    '<div class="insight">' +
    '<div class="insight-title">💡 Conclusão do teste</div>' +
    '<p>Os dois modelos tiveram desempenho semelhante neste cenário. ' +
    'Experimente aumentar a latência simulada ou o número de tarefas para ver a diferença.</p>' +
    '</div>'
  );
}

export function buildHtmlReport(data) {
  const m = data.metrics;
  const s = data.state;

  const testDurSec  = s && s.testRunDurationMs ? (s.testRunDurationMs / 1000).toFixed(0) : '?';
  const totalReqs   = v(m, 'http_reqs', 'count');
  const errorRate   = pct(m, 'http_req_failed', 'rate');
  const maxVUs      = v(m, 'vus', 'max');
  const reqRate     = v(m, 'http_reqs', 'rate', 1);

  const vAvg = v(m, 'virtual_duration_ms', 'avg', 0);
  const vP50 = v(m, 'virtual_duration_ms', 'med', 0);
  const vP90 = v(m, 'virtual_duration_ms', 'p(90)', 0);
  const vP99 = v(m, 'virtual_duration_ms', 'p(99)', 0);
  const vMin = v(m, 'virtual_duration_ms', 'min', 0);
  const vMax = v(m, 'virtual_duration_ms', 'max', 0);

  const pAvg = v(m, 'platform_duration_ms', 'avg', 0);
  const pP50 = v(m, 'platform_duration_ms', 'med', 0);
  const pP90 = v(m, 'platform_duration_ms', 'p(90)', 0);
  const pP99 = v(m, 'platform_duration_ms', 'p(99)', 0);
  const pMin = v(m, 'platform_duration_ms', 'min', 0);
  const pMax = v(m, 'platform_duration_ms', 'max', 0);

  const vThr = v(m, 'virtual_throughput_rps', 'avg', 1);
  const pThr = v(m, 'platform_throughput_rps', 'avg', 1);

  const now = new Date().toLocaleString('pt-BR');
  const errColor = parseFloat(errorRate) > 1 ? '#ef4444' : '#10b981';

  const glossary =
    glossaryItem('VU', '— Virtual User (Usuário Virtual)',
      '<p>No k6, um <strong>VU</strong> simula um usuário real usando o sistema. Se o teste roda com 20 VUs, ' +
      'é como se 20 pessoas estivessem usando a aplicação ao mesmo tempo. Cada VU executa o script em loop ' +
      'durante toda a duração do teste.</p>') +
    glossaryItem('p90 / p99', '— Percentis de Latência',
      '<p>Imagine 100 medições de tempo ordenadas do menor para o maior. ' +
      'O <strong>P90</strong> é o valor na posição 90 — ou seja, 90% das requisições foram mais rápidas que isso. ' +
      'O <strong>P99</strong> é o valor na posição 99. São métricas cruciais porque revelam o pior caso real ' +
      'que a maioria dos usuários experimenta, sem depender de outliers extremos.</p>') +
    glossaryItem('med', '— Mediana (P50)',
      '<p>O valor do meio quando todos os tempos são ordenados. Metade das requisições foi mais rápida, ' +
      'metade foi mais lenta. É mais confiável que a média quando há valores extremos (outliers), ' +
      'pois um único request muito lento pode distorcer a média sem afetar a mediana.</p>') +
    glossaryItem('avg', '— Média',
      '<p>Soma de todos os tempos dividida pela quantidade de medições. Útil para ter uma noção geral, ' +
      'mas pode ser enganosa: se 99 requisições levaram 100ms e 1 levou 10 segundos, ' +
      'a média será ~200ms — muito diferente da experiência real da maioria dos usuários.</p>') +
    glossaryItem('Trend', '— Métrica de Tendência',
      '<p>Tipo de métrica do k6 que coleta múltiplos valores ao longo do tempo e calcula estatísticas ' +
      'como mínimo, máximo, média, mediana e percentis. Usada aqui para medir o tempo de cada batch ' +
      'de tarefas processadas pela API.</p>') +
    glossaryItem('Rate', '— Taxa de Erro',
      '<p>Proporção de requisições que falharam (retornaram erro HTTP ou não satisfizeram as condições do check). ' +
      'Uma taxa de 0% significa que todas as requisições foram bem-sucedidas. ' +
      'Acima de 1% já é preocupante em produção.</p>') +
    glossaryItem('throughput', '— Vazão (Throughput)',
      '<p>Quantidade de tarefas processadas por segundo. Quanto maior, melhor. ' +
      'É a métrica mais direta de capacidade: quantas operações o sistema consegue ' +
      'completar por unidade de tempo sob determinada carga.</p>') +
    glossaryItem('I/O-bound', '— Limitado por Entrada/Saída',
      '<p>Um processamento é <strong>I/O-bound</strong> quando a maior parte do tempo é gasta ' +
      '<em>esperando</em> — por respostas de banco de dados, APIs externas, leitura de disco, etc. ' +
      'Virtual Threads brilham nesse cenário porque são suspensas durante a espera e não ocupam ' +
      'uma thread do sistema operacional enquanto aguardam.</p>') +
    glossaryItem('Virtual Thread', '— Thread Virtual (Project Loom)',
      '<p>Introduzidas no Java 21, as <strong>Virtual Threads</strong> são threads extremamente leves ' +
      'gerenciadas pela JVM (não pelo sistema operacional). Você pode criar centenas de milhares delas ' +
      'sem problema. Quando uma Virtual Thread fica bloqueada esperando I/O, a JVM a suspende ' +
      'automaticamente e usa o processador para outra — sem desperdiçar recursos.</p>') +
    glossaryItem('Platform Thread', '— Thread de Plataforma',
      '<p>As threads "tradicionais" do Java, mapeadas 1:1 com threads do sistema operacional. ' +
      'Cada uma consome de 0,5 MB a 1 MB de memória de pilha (stack). ' +
      'Um pool de 50 threads significa que no máximo 50 tarefas rodam simultaneamente — ' +
      'as demais ficam na fila esperando.</p>') +
    glossaryItem('http_req_duration', '— Duração da Requisição HTTP',
      '<p>Tempo total que o k6 mediu para cada chamada HTTP: desde o envio da requisição ' +
      'até o recebimento completo da resposta. Inclui tempo de rede, processamento no servidor ' +
      'e serialização da resposta.</p>');

  return '<!DOCTYPE html>\n' +
'<html lang="pt-BR">\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>Relatório k6 — Quarkus Concurrency Lab</title>\n' +
'<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>\n' +
'<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">\n' +
'<style>\n' +
':root{--vt:#10b981;--vtl:#d1fae5;--pt:#3b82f6;--ptl:#dbeafe;--err:#ef4444;--bg:#f8fafc;--card:#fff;--txt:#1e293b;--muted:#64748b;--bdr:#e2e8f0;--r:12px}\n' +
'*{box-sizing:border-box;margin:0;padding:0}\n' +
'body{font-family:"Inter",system-ui,sans-serif;background:var(--bg);color:var(--txt);line-height:1.6}\n' +
'.hdr{background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:52px 40px;text-align:center}\n' +
'.hdr h1{font-size:2rem;font-weight:700;margin-bottom:8px}\n' +
'.hdr p{font-size:1.05rem;opacity:.8;margin-bottom:20px}\n' +
'.badges{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}\n' +
'.badge{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:20px;padding:4px 14px;font-size:.82rem}\n' +
'.wrap{max-width:1200px;margin:0 auto;padding:40px 20px}\n' +
'.sec{margin-bottom:52px}\n' +
'.sec-h{font-size:1.25rem;font-weight:700;margin-bottom:4px}\n' +
'.sec-d{font-size:.875rem;color:var(--muted);margin-bottom:20px}\n' +
'.grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px}\n' +
'.card{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);padding:24px}\n' +
'.clabel{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:8px}\n' +
'.cval{font-size:2rem;font-weight:700}\n' +
'.cunit{font-size:1rem;font-weight:400;color:var(--muted)}\n' +
'.cnote{font-size:.78rem;color:var(--muted);margin-top:4px}\n' +
'.cmp{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}\n' +
'.ccard{border-radius:var(--r);padding:24px}\n' +
'.ccard.vt{background:var(--vtl);border:2px solid var(--vt)}\n' +
'.ccard.pt{background:var(--ptl);border:2px solid var(--pt)}\n' +
'.ctitle{font-size:1rem;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px}\n' +
'.dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}\n' +
'.dot.vt{background:var(--vt)}.dot.pt{background:var(--pt)}\n' +
'.mr{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.06);font-size:.88rem}\n' +
'.mr:last-child{border-bottom:none}\n' +
'.mn{color:#475569}.mv{font-weight:600}\n' +
'.charts{display:grid;grid-template-columns:1fr 1fr;gap:16px}\n' +
'.cc{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);padding:24px}\n' +
'.cc-h{font-size:.95rem;font-weight:600;margin-bottom:4px}\n' +
'.cc-d{font-size:.82rem;color:var(--muted);margin-bottom:18px}\n' +
'.insight{background:#fefce8;border:1px solid #fde68a;border-radius:var(--r);padding:20px 24px;margin-top:20px}\n' +
'.insight-title{font-weight:700;color:#92400e;margin-bottom:8px}\n' +
'.insight p{font-size:.88rem;color:#78350f;line-height:1.7}\n' +
'.gi{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);margin-bottom:8px;overflow:hidden}\n' +
'.gt{width:100%;text-align:left;padding:16px 20px;background:none;border:none;cursor:pointer;font-family:inherit;font-size:.92rem;font-weight:600;color:var(--txt);display:flex;justify-content:space-between;align-items:center;gap:12px}\n' +
'.gt:hover{background:var(--bg)}\n' +
'.gterm{display:flex;align-items:center;gap:10px}\n' +
'.tc{background:#f1f5f9;border:1px solid var(--bdr);border-radius:6px;padding:2px 10px;font-family:monospace;font-size:.82rem;color:#7c3aed;flex-shrink:0}\n' +
'.arr{flex-shrink:0;transition:transform .2s}\n' +
'.gb{padding:0 20px 16px;font-size:.88rem;color:#475569;line-height:1.7;display:none}\n' +
'.gb p{margin-bottom:8px}.gb p:last-child{margin-bottom:0}\n' +
'.gb strong{color:var(--txt)}\n' +
'.wg{display:grid;grid-template-columns:1fr 1fr;gap:16px}\n' +
'.wc{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);padding:24px}\n' +
'.wc h3{font-size:.95rem;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px}\n' +
'.wl{list-style:none}\n' +
'.wl li{padding:6px 0;font-size:.88rem;color:#475569;display:flex;align-items:flex-start;gap:8px}\n' +
'.wl li::before{content:"✓";color:var(--vt);font-weight:700;flex-shrink:0}\n' +
'.wl.bad li::before{content:"✗";color:var(--err)}\n' +
'.ftr{text-align:center;padding:32px;color:var(--muted);font-size:.82rem;border-top:1px solid var(--bdr)}\n' +
'@media(max-width:760px){.charts,.cmp,.wg{grid-template-columns:1fr}.hdr{padding:32px 20px}.hdr h1{font-size:1.5rem}}\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'\n' +
'<div class="hdr">\n' +
'  <h1>📊 Relatório de Performance</h1>\n' +
'  <p>Virtual Threads vs Platform Threads — Quarkus Concurrency Lab</p>\n' +
'  <div class="badges">\n' +
'    <span class="badge">🗓 ' + now + '</span>\n' +
'    <span class="badge">⏱ Duração total: ' + testDurSec + 's</span>\n' +
'    <span class="badge">👥 Pico de ' + maxVUs + ' usuários simultâneos</span>\n' +
'    <span class="badge">🔁 ' + reqRate + ' req/s</span>\n' +
'  </div>\n' +
'</div>\n' +
'\n' +
'<div class="wrap">\n' +
'\n' +
'  <section class="sec">\n' +
'    <h2 class="sec-h">Resumo Geral do Teste</h2>\n' +
'    <p class="sec-d">O que aconteceu em números durante a execução do k6</p>\n' +
'    <div class="grid4">\n' +
'      <div class="card">\n' +
'        <div class="clabel">Requisições HTTP</div>\n' +
'        <div class="cval">' + totalReqs + '</div>\n' +
'        <div class="cnote">Total de chamadas enviadas à API</div>\n' +
'      </div>\n' +
'      <div class="card">\n' +
'        <div class="clabel">Taxa de erro</div>\n' +
'        <div class="cval" style="color:' + errColor + '">' + errorRate + '<span class="cunit">%</span></div>\n' +
'        <div class="cnote">' + (parseFloat(errorRate) === 0 ? '✓ Nenhuma falha detectada' : '⚠ Algumas requisições falharam') + '</div>\n' +
'      </div>\n' +
'      <div class="card">\n' +
'        <div class="clabel">Duração do teste</div>\n' +
'        <div class="cval">' + testDurSec + '<span class="cunit">s</span></div>\n' +
'        <div class="cnote">Tempo total de execução do k6</div>\n' +
'      </div>\n' +
'      <div class="card">\n' +
'        <div class="clabel">Usuários simultâneos</div>\n' +
'        <div class="cval">' + maxVUs + '</div>\n' +
'        <div class="cnote">Pico de VUs ativos ao mesmo tempo</div>\n' +
'      </div>\n' +
'    </div>\n' +
'  </section>\n' +
'\n' +
'  <section class="sec">\n' +
'    <h2 class="sec-h">Comparativo: Virtual Threads vs Platform Threads</h2>\n' +
'    <p class="sec-d">Tempo que cada estratégia levou para processar um lote de tarefas (em milissegundos — menor é melhor)</p>\n' +
'\n' +
'    <div class="cmp">\n' +
'      <div class="ccard vt">\n' +
'        <div class="ctitle"><span class="dot vt"></span>Virtual Threads</div>\n' +
'        <div class="mr"><span class="mn">Média</span><span class="mv">' + vAvg + ' ms</span></div>\n' +
'        <div class="mr"><span class="mn">Mediana (P50)</span><span class="mv">' + vP50 + ' ms</span></div>\n' +
'        <div class="mr"><span class="mn">P90</span><span class="mv">' + vP90 + ' ms</span></div>\n' +
'        <div class="mr"><span class="mn">P99</span><span class="mv">' + vP99 + ' ms</span></div>\n' +
'        <div class="mr"><span class="mn">Mínimo</span><span class="mv">' + vMin + ' ms</span></div>\n' +
'        <div class="mr"><span class="mn">Máximo</span><span class="mv">' + vMax + ' ms</span></div>\n' +
'        <div class="mr"><span class="mn">Throughput médio</span><span class="mv">' + vThr + ' tasks/s</span></div>\n' +
'      </div>\n' +
'      <div class="ccard pt">\n' +
'        <div class="ctitle"><span class="dot pt"></span>Platform Threads</div>\n' +
'        <div class="mr"><span class="mn">Média</span><span class="mv">' + pAvg + ' ms</span></div>\n' +
'        <div class="mr"><span class="mn">Mediana (P50)</span><span class="mv">' + pP50 + ' ms</span></div>\n' +
'        <div class="mr"><span class="mn">P90</span><span class="mv">' + pP90 + ' ms</span></div>\n' +
'        <div class="mr"><span class="mn">P99</span><span class="mv">' + pP99 + ' ms</span></div>\n' +
'        <div class="mr"><span class="mn">Mínimo</span><span class="mv">' + pMin + ' ms</span></div>\n' +
'        <div class="mr"><span class="mn">Máximo</span><span class="mv">' + pMax + ' ms</span></div>\n' +
'        <div class="mr"><span class="mn">Throughput médio</span><span class="mv">' + pThr + ' tasks/s</span></div>\n' +
'      </div>\n' +
'    </div>\n' +
'\n' +
'    <div class="charts">\n' +
'      <div class="cc">\n' +
'        <div class="cc-h">Duração do Batch por Percentil</div>\n' +
'        <div class="cc-d">Quanto tempo cada estratégia levou — veja especialmente o P99, que representa o pior caso real</div>\n' +
'        <canvas id="chartDur" height="240"></canvas>\n' +
'      </div>\n' +
'      <div class="cc">\n' +
'        <div class="cc-h">Faixa de Variação (mín / média / máx)</div>\n' +
'        <div class="cc-d">Mostra quão previsível é o desempenho de cada estratégia — barras menores = mais estável</div>\n' +
'        <canvas id="chartRange" height="240"></canvas>\n' +
'      </div>\n' +
'    </div>\n' +
'\n' +
'    ' + insight(vAvg, pAvg) + '\n' +
'  </section>\n' +
'\n' +
'  <section class="sec">\n' +
'    <h2 class="sec-h">📖 Glossário — O Que Cada Termo Significa</h2>\n' +
'    <p class="sec-d">Clique em um termo para ver a explicação. Feito para quem não é da área de tecnologia.</p>\n' +
'    ' + glossary + '\n' +
'  </section>\n' +
'\n' +
'  <section class="sec">\n' +
'    <h2 class="sec-h">Quando Usar Cada Abordagem?</h2>\n' +
'    <p class="sec-d">Guia prático baseado no comportamento observado neste e em outros testes</p>\n' +
'    <div class="wg">\n' +
'      <div class="wc">\n' +
'        <h3><span style="color:#10b981;font-size:1.2em">●</span> Prefira Virtual Threads quando...</h3>\n' +
'        <ul class="wl">\n' +
'          <li>A aplicação faz muitas chamadas a bancos de dados</li>\n' +
'          <li>Há integração com APIs externas ou microsserviços</li>\n' +
'          <li>O tempo de espera (I/O) domina o processamento</li>\n' +
'          <li>Você precisa de alta concorrência com pouca memória RAM</li>\n' +
'          <li>Quer simplificar código assíncrono sem Reactive/Callback</li>\n' +
'          <li>Processamento em lote com muitas tarefas independentes</li>\n' +
'        </ul>\n' +
'      </div>\n' +
'      <div class="wc">\n' +
'        <h3><span style="color:#3b82f6;font-size:1.2em">●</span> Tenha cuidado com Virtual Threads quando...</h3>\n' +
'        <ul class="wl bad">\n' +
'          <li>O processamento é intensivo em CPU (cálculos matemáticos pesados)</li>\n' +
'          <li>O código usa blocos <code>synchronized</code> que bloqueiam o carrier thread</li>\n' +
'          <li>Cada tarefa dura menos de 1ms (overhead pode superar o ganho)</li>\n' +
'          <li>Bibliotecas nativas bloqueiam a thread de forma não-interruptível</li>\n' +
'        </ul>\n' +
'      </div>\n' +
'    </div>\n' +
'  </section>\n' +
'\n' +
'</div>\n' +
'\n' +
'<div class="ftr">Gerado automaticamente pelo k6 via handleSummary • Quarkus Concurrency Lab • Java 21 + Project Loom</div>\n' +
'\n' +
'<script>\n' +
'var COLOR_VT = "#10b981";\n' +
'var COLOR_PT = "#3b82f6";\n' +
'\n' +
'new Chart(document.getElementById("chartDur"), {\n' +
'  type: "bar",\n' +
'  data: {\n' +
'    labels: ["Média", "P50 (Mediana)", "P90", "P99"],\n' +
'    datasets: [\n' +
'      { label: "Virtual Threads",  data: [' + vAvg + ',' + vP50 + ',' + vP90 + ',' + vP99 + '], backgroundColor: COLOR_VT, borderRadius: 6 },\n' +
'      { label: "Platform Threads", data: [' + pAvg + ',' + pP50 + ',' + pP90 + ',' + pP99 + '], backgroundColor: COLOR_PT, borderRadius: 6 }\n' +
'    ]\n' +
'  },\n' +
'  options: {\n' +
'    responsive: true,\n' +
'    plugins: {\n' +
'      legend: { position: "bottom" },\n' +
'      tooltip: { callbacks: { label: function(c){ return c.dataset.label + ": " + c.parsed.y.toLocaleString("pt-BR") + " ms"; } } }\n' +
'    },\n' +
'    scales: { y: { beginAtZero: true, title: { display: true, text: "Milissegundos (ms)" } } }\n' +
'  }\n' +
'});\n' +
'\n' +
'new Chart(document.getElementById("chartRange"), {\n' +
'  type: "bar",\n' +
'  data: {\n' +
'    labels: ["Virtual Threads", "Platform Threads"],\n' +
'    datasets: [\n' +
'      { label: "Mínimo", data: [' + vMin + ',' + pMin + '], backgroundColor: "#a7f3d0", borderRadius: 4 },\n' +
'      { label: "Média",  data: [' + vAvg + ',' + pAvg + '], backgroundColor: "#10b981", borderRadius: 4 },\n' +
'      { label: "Máximo", data: [' + vMax + ',' + pMax + '], backgroundColor: "#065f46", borderRadius: 4 }\n' +
'    ]\n' +
'  },\n' +
'  options: {\n' +
'    responsive: true,\n' +
'    plugins: {\n' +
'      legend: { position: "bottom" },\n' +
'      tooltip: { callbacks: { label: function(c){ return c.dataset.label + ": " + c.parsed.y.toLocaleString("pt-BR") + " ms"; } } }\n' +
'    },\n' +
'    scales: { y: { beginAtZero: true, title: { display: true, text: "Milissegundos (ms)" } } }\n' +
'  }\n' +
'});\n' +
'\n' +
'function tog(btn) {\n' +
'  var body = btn.nextElementSibling;\n' +
'  var open = body.style.display === "block";\n' +
'  body.style.display = open ? "none" : "block";\n' +
'  btn.querySelector(".arr").textContent = open ? "▼" : "▲";\n' +
'}\n' +
'<\/script>\n' +
'\n' +
'</body>\n' +
'</html>';
}
