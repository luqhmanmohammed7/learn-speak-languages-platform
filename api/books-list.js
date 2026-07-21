const { publicBookList } = require('../lib/books');

module.exports = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({ books: publicBookList() });
  } catch (err) {
    console.error('books-list error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
};
