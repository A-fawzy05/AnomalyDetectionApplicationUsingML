
const config = require('../config/env.config');
const User = require('../models/User');

const FASTAPI = config.FASTAPI_URL.replace(/\/+$/, '');

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

async function relay(res, upstream) {
  const text = await upstream.text();
  if (upstream.status >= 400) {
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.detail || parsed.message || text;
    } catch {  }
    return res.status(upstream.status).json({ success: false, message });
  }
  const contentType = upstream.headers.get('content-type') || 'application/json';
  res.status(upstream.status).type(contentType).send(text);
}

function unavailable(res, err) {
  return res.status(502).json({
    success: false,
    message: 'Anomaly service is unavailable',
    detail: err.message
  });
}

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
      headers, 
      body: form
    });
    return relay(res, upstream);
  } catch (err) {
    return unavailable(res, err);
  }
};

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
