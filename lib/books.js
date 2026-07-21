const fs = require('fs');
const path = require('path');

let cache = null;

function loadBooks() {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), 'books.json');
  cache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return cache;
}

function getBookBySlug(slug) {
  return loadBooks().find((b) => b.slug === slug) || null;
}

// Gumroad pings include `product_permalink`; Payhip webhooks include a
// product id (field name varies by event, so we check a couple of spots
// from the webhook handler and pass in whatever candidate string it found).
function findBookByIdentifier(identifier) {
  if (!identifier) return null;
  const books = loadBooks();
  return (
    books.find(
      (b) => b.gumroad_permalink === identifier || b.payhip_product_id === identifier
    ) || null
  );
}

// Fields safe to expose to the public library page (no internal IDs).
function publicBookList() {
  return loadBooks().map((b) => ({
    slug: b.slug,
    title: b.title,
    title_native: b.title_native || '',
    buy_url: b.buy_url
  }));
}

module.exports = { loadBooks, getBookBySlug, findBookByIdentifier, publicBookList };
