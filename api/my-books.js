const { verify } = require('../lib/token');
const { publicBookList } = require('../lib/books');

module.exports = async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const payload = verify(token, process.env.TOKEN_SECRET);

  if (!payload || !payload.email) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const owned = Array.isArray(payload.books) ? payload.books : [];
  const catalog = publicBookList().map((b) => ({ ...b, owned: owned.includes(b.slug) }));

  return res.status(200).json({ email: payload.email, books: catalog });
};
