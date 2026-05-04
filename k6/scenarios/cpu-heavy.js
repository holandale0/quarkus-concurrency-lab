/**
 * CPU-heavy scenario: minimal I/O latency, many tasks.
 * Shows that virtual threads don't improve CPU-bound workloads
 * because the bottleneck is the carrier thread, not blocking.
 *
 * Run: k6 run k6/scenarios/cpu-heavy.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = 'http://localhost:8080';

const virtualDuration = new Trend('virtual_duration_ms', true);
const platformDuration = new Trend('platform_duration_ms', true);

export const options = {
  scenarios: {
    cpu_low: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      env: { TASKS: '100', LATENCY_MS: '5' },
      tags: { scenario: 'cpu_low' },
    },
    cpu_high: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
      startTime: '35s',
      env: { TASKS: '500', LATENCY_MS: '5' },
      tags: { scenario: 'cpu_high' },
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
  },
};

const params = { headers: { 'Content-Type': 'application/json' } };

export default function () {
  const tasks = parseInt(__ENV.TASKS);
  const latencyMs = parseInt(__ENV.LATENCY_MS);
  const payload = JSON.stringify({ numberOfTasks: tasks, simulatedLatencyMs: latencyMs });

  ['virtual', 'platform'].forEach((type) => {
    const res = http.post(`${BASE_URL}/process/${type}`, payload, params);
    const ok = check(res, { 'status 200': (r) => r.status === 200 });
    if (ok) {
      const body = JSON.parse(res.body);
      (type === 'virtual' ? virtualDuration : platformDuration).add(body.totalTimeMs);
    }
  });
}
