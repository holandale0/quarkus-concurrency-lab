import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = 'http://localhost:8080';

const virtualDuration = new Trend('virtual_batch_duration_ms', true);
const platformDuration = new Trend('platform_batch_duration_ms', true);
const virtualThroughput = new Trend('virtual_throughput_rps', true);
const platformThroughput = new Trend('platform_throughput_rps', true);
const errorRate = new Rate('errors');

// Default: medium concurrency with I/O-heavy load.
// Override with --env SCENARIO=high or --env SCENARIO=cpu
export const options = {
  scenarios: {
    low_concurrency: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      env: { TASKS: '20', LATENCY_MS: '200' },
    },
  },
};

const params = { headers: { 'Content-Type': 'application/json' } };

function runBatch(type, tasks, latencyMs) {
  const payload = JSON.stringify({ numberOfTasks: tasks, simulatedLatencyMs: latencyMs });
  const res = http.post(`${BASE_URL}/process/${type}`, payload, params);

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'has totalTimeMs': (r) => {
      try { return JSON.parse(r.body).totalTimeMs > 0; } catch { return false; }
    },
  });

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
  }
}

export default function () {
  const tasks = parseInt(__ENV.TASKS || '20');
  const latencyMs = parseInt(__ENV.LATENCY_MS || '200');

  runBatch('virtual', tasks, latencyMs);
  runBatch('platform', tasks, latencyMs);

  sleep(0.5);
}
