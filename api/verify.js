const { getPurchasedSlugs } = require('../lib/purchases');
const { sign } = require('../lib/token');

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const email = req.body && req.body.email;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'valid_email_required' });
  }

  try {
    const slugs = await getPurchasedSlugs(email);
    if (slugs.length === 0) {
      return res.status(403).json({ error: 'no_access' });
    }
    const token = sign(
      { email: email.toLowerCase(), books: slugs, exp: Date.now() + THIRTY_DAYS_MS },
      process.env.TOKEN_SECRET
    );
    return res.status(200).json({ token, books: slugs });
  } catch (err) {
    console.error('verify error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
};
