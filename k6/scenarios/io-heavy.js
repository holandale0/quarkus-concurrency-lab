/**
 * I/O-heavy scenario: 200ms latency per task, large batch size.
 * This is where virtual threads shine vs a fixed platform thread pool.
 *
 * Run from project root: k6 run k6/scenarios/io-heavy.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { makeHandleSummary } from '../lib/report.js';

const BASE_URL = 'http://localhost:8080';

const virtualDuration    = new Trend('virtual_duration_ms',    true);
const platformDuration   = new Trend('platform_duration_ms',   true);
const virtualThroughput  = new Trend('virtual_throughput_rps', true);
const platformThroughput = new Trend('platform_throughput_rps', true);
const errorRate          = new Rate('errors');

export const options = {
  scenarios: {
    low: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      env: { TASKS: '50', LATENCY_MS: '200' },
      tags: { scenario: 'low' },
    },
    medium: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
      startTime: '35s',
      env: { TASKS: '100', LATENCY_MS: '200' },
      tags: { scenario: 'medium' },
    },
    high: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
      startTime: '70s',
      env: { TASKS: '500', LATENCY_MS: '200' },
      tags: { scenario: 'high' },
    },
  },
  thresholds: {
    'virtual_duration_ms':  ['p(99)<120000'],
    'platform_duration_ms': ['p(99)<120000'],
    'http_req_failed':      ['rate<0.01'],
  },
};

export const handleSummary = makeHandleSummary(
  'src/main/resources/META-INF/resources/k6-report.html'
);

const params = { headers: { 'Content-Type': 'application/json' } };

function runBatch(type) {
  const tasks     = parseInt(__ENV.TASKS);
  const latencyMs = parseInt(__ENV.LATENCY_MS);
  const payload   = JSON.stringify({ numberOfTasks: tasks, simulatedLatencyMs: latencyMs });

  const res = http.post(BASE_URL + '/process/' + type, payload, params);
  const ok  = check(res, { 'status 200': (r) => r.status === 200 });

  errorRate.add(!ok);

  if (ok) {
    const body = JSON.parse(res.body);
    if (type === 'virtual') {
      virtualDuration.add(body.totalTimeMs);
      virtualThroughput.add(body.throughputRps);
    } else {
      platformDuration.add(body.totalTimeMs);
      platformThroughput.add(body.throughputRps);
    }
    console.log(
      '[' + type + '] tasks=' + tasks +
      ' latency=' + latencyMs + 'ms' +
      ' total=' + body.totalTimeMs + 'ms' +
      ' throughput=' + body.throughputRps.toFixed(1) + ' rps'
    );
  }
}

export default function () {
  runBatch('virtual');
  runBatch('platform');
}
