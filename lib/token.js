// Signed session tokens using only Node's built-in `crypto` module.
// No JWT library needed — this avoids requiring `npm install` at all,
// so the whole project deploys to Vercel with zero build step.
const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload, secret) {
  if (!secret) throw new Error('TOKEN_SECRET is not set');
  const data = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verify(token, secret) {
  if (!secret || !token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig || '', 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { sign, verify };
