/**
 * Anomaly controller — the gateway's bridge to the FastAPI anomaly service.
 *
 * The gateway authenticates the end user (JWT, via the `authenticate`
 * middleware) and then *proxies* the request to the FastAPI service. It does
 * NOT make the authorization decision itself: instead it forwards the caller's
 * identity — role and team membership (looked up in MongoDB) — as signed
 * headers, and lets the anomaly service enforce the policy. This keeps a single
 * source of truth for authorization (the anomaly service) while membership data
 * stays in the gateway's database.
 *
 * Forwarded headers:
 *   X-User-Id        the Mongo user id
 *   X-User-Role      admin | analyst | viewer
 *   X-User-Member    "true" if the user belongs to >=1 team, else "false"
 *   X-Gateway-Secret shared secret proving the request came from the gateway
 *
 * Uses Node's built-in fetch / FormData / Blob (Node >= 18) — no extra HTTP
 * client dependency.
 */
const config = require('../config/env.config');
const User = require('../models/User');

const FASTAPI = config.FASTAPI_URL.replace(/\/+$/, '');

/**
 * Build the identity headers the anomaly service expects. Team membership is
 * read fresh from MongoDB so a user who left every team immediately loses
 * access. "Member" means belonging to at least one team.
 */
async function buildIdentityHeaders(req) {
  const user = await User.findById(req.user.userId).select('teams role');
  const isMember = !!(user && Array.isArray(user.teams) && user.teams.length > 0);
  return {
    'X-User-Id': String(req.user.userId),
    'X-User-Role': req.user.role,
    'X-User-Member': isMember ? 'true' : 'false',
    'X-Gateway-Secret': config.GATEWAY_SHARED_SECRET
  };
}

/**
 * Relay a FastAPI fetch Response back to the Express client.
 *
 * Success bodies (2xx) are passed through verbatim. Error bodies are
 * NORMALIZED to the gateway's standard envelope `{ success:false, message }`
 * so the whole API speaks one error shape — FastAPI raises `{ detail: ... }`,
 * the gateway raises `{ success:false, message: ... }`, and without this a
 * client would have to handle both. The original detail is preserved.
 */
async function relay(res, upstream) {
  const text = await upstream.text();
  if (upstream.status >= 400) {
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.detail || parsed.message || text;
    } catch { /* non-JSON error body — keep as text */ }
    return res.status(upstream.status).json({ success: false, message });
  }
  const contentType = upstream.headers.get('content-type') || 'application/json';
  res.status(upstream.status).type(contentType).send(text);
}

/** Map a failed fetch (FastAPI unreachable) to a 502. */
function unavailable(res, err) {
  return res.status(502).json({
    success: false,
    message: 'Anomaly service is unavailable',
    detail: err.message
  });
}

/**
 * POST /api/anomaly/analyze
 * Upload an event log; the gateway streams it to FastAPI POST /api/v1/analyze.
 * Authorization (member + admin/analyst) is enforced by FastAPI.
 */
exports.analyze = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'A file is required (field "file").' });
  }
  try {
    const headers = await buildIdentityHeaders(req);
    const form = new FormData();
    form.append('file', new Blob([req.file.buffer]), req.file.originalname);
    if (req.body && req.body.file_type) form.append('file_type', req.body.file_type);

    const upstream = await fetch(`${FASTAPI}/api/v1/analyze`, {
      method: 'POST',
      headers, // fetch sets the multipart boundary Content-Type from the FormData body
      body: form
    });
    return relay(res, upstream);
  } catch (err) {
    return unavailable(res, err);
  }
};

/**
 * POST /api/anomaly/runs/:runId/report
 * Generate an AI report for a completed run. FastAPI refuses non-members
 * (e.g. an admin who is not on any team) with 403.
 */
exports.generateReport = async (req, res) => {
  try {
    const headers = await buildIdentityHeaders(req);
    const upstream = await fetch(`${FASTAPI}/api/v1/runs/${req.params.runId}/report`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    return relay(res, upstream);
  } catch (err) {
    return unavailable(res, err);
  }
};

/** GET /api/anomaly/runs — list runs (any team member). */
exports.listRuns = async (req, res) => {
  try {
    const headers = await buildIdentityHeaders(req);
    const qs = new URLSearchParams(req.query).toString();
    const upstream = await fetch(`${FASTAPI}/api/v1/runs${qs ? `?${qs}` : ''}`, { headers });
    return relay(res, upstream);
  } catch (err) {
    return unavailable(res, err);
  }
};

/** GET /api/anomaly/cases — list cases for a run (any team member). */
exports.listCases = async (req, res) => {
  try {
    const headers = await buildIdentityHeaders(req);
    const qs = new URLSearchParams(req.query).toString();
    const upstream = await fetch(`${FASTAPI}/api/v1/cases${qs ? `?${qs}` : ''}`, { headers });
    return relay(res, upstream);
  } catch (err) {
    return unavailable(res, err);
  }
};
