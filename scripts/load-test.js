import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics per Spec 16 Fase 4 & Spec 19
const failureRate = new Rate('failed_requests');
const loginDuration = new Trend('login_duration');
const gradesDuration = new Trend('grades_duration');
const notesDuration = new Trend('notes_duration');
const successfulFlows = new Counter('successful_flows');

export const options = {
  scenarios: {
    // 1. Warm-up phase
    warmup: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '30s', target: 50 },
      ],
      gracefulRampDown: '10s',
      exec: 'studentJourney',
    },
    // 2. High concurrency peak load test (target: 200 RPS / 100 concurrent VUs)
    peak_load: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 150,
      stages: [
        { duration: '1m', target: 100 },  // Ramp-up to 100 RPS
        { duration: '2m', target: 200 },  // Target: 200 RPS sustained
        { duration: '30s', target: 0 },   // Cool-down
      ],
      startTime: '1m10s',
      exec: 'studentJourney',
    },
  },
  thresholds: {
    // Quality Gate Thresholds
    'http_req_duration': ['p(95)<500', 'p(99)<1200'], // 95% of requests must complete under 500ms
    'failed_requests': ['rate<0.01'],                  // Error rate strictly < 1%
    'login_duration': ['p(95)<600'],                   // Argon2id login under 600ms
    'grades_duration': ['p(95)<300'],                  // Read cache / indexed query under 300ms
    'notes_duration': ['p(95)<400'],                   // Full search / filter query under 400ms
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';

// Seed users for realistic multi-user distribution
const TEST_USERS = [
  { username: 'studente.20250001', password: 'Password123!#' },
  { username: 'docente.bianchi0', password: 'Password123!#' },
  { username: 'genitore.rossi', password: 'Password123!#' },
  { username: 'admin.davinci', password: 'Password123!#' },
];

export function studentJourney() {
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
  let token = null;

  // STEP 1: Autenticazione e scambio credenziali JWT
  group('01_Auth_Login', () => {
    const loginPayload = JSON.stringify({
      username: user.username,
      password: user.password,
    });

    const headers = { 'Content-Type': 'application/json' };
    const res = http.post(`${BASE_URL}/auth/login`, loginPayload, { headers });

    loginDuration.add(res.timings.duration);
    const success = check(res, {
      'login status 200/201': (r) => r.status === 200 || r.status === 201,
      'access token received': (r) => {
        try {
          const body = JSON.parse(r.body);
          return !!body.accessToken;
        } catch (_) {
          return false;
        }
      },
    });

    if (!success) {
      failureRate.add(1);
      return;
    }

    failureRate.add(0);
    const body = JSON.parse(res.body);
    token = body.accessToken;
  });

  if (!token) return;

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // STEP 2: Consultazione Voti e Medie Ponderate
  group('02_Consultazione_Voti', () => {
    const res = http.get(`${BASE_URL}/grades`, { headers: authHeaders });
    gradesDuration.add(res.timings.duration);

    const success = check(res, {
      'grades status 200': (r) => r.status === 200,
    });

    failureRate.add(success ? 0 : 1);
  });

  sleep(0.5);

  // STEP 3: Esplorazione Bacheca Appunti Condivisi
  group('03_Esplorazione_Appunti', () => {
    const res = http.get(`${BASE_URL}/shared-notes?page=1&limit=20`, {
      headers: authHeaders,
    });
    notesDuration.add(res.timings.duration);

    const success = check(res, {
      'notes status 200': (r) => r.status === 200,
    });

    failureRate.add(success ? 0 : 1);
  });

  sleep(0.5);

  // STEP 4: Consultazione Mazzi Flashcard SM-2
  group('04_Consultazione_Flashcards', () => {
    const res = http.get(`${BASE_URL}/flashcards/decks`, {
      headers: authHeaders,
    });

    const success = check(res, {
      'flashcards decks status 200': (r) => r.status === 200,
    });

    failureRate.add(success ? 0 : 1);
  });

  successfulFlows.add(1);
}
