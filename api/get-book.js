const fs = require('fs');
const path = require('path');
const { verify } = require('../lib/token');
const { getBookBySlug } = require('../lib/books');

module.exports = async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const payload = verify(token, process.env.TOKEN_SECRET);

  if (!payload || !payload.email) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const slug = req.query && req.query.book;
  if (!slug || !getBookBySlug(slug)) {
    return res.status(404).json({ error: 'unknown_book' });
  }

  if (!Array.isArray(payload.books) || !payload.books.includes(slug)) {
    return res.status(403).json({ error: 'not_purchased' });
  }

  try {
    // content/<slug>/book-content.html lives OUTSIDE /public — never reachable
    // by direct URL, only through this handler after both checks above pass.
    const filePath = path.join(process.cwd(), 'content', slug, 'book-content.html');
    const html = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ html });
  } catch (err) {
    console.error('get-book error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
};
