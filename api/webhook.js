const crypto = require('crypto');
const { addPurchase } = require('../lib/purchases');
const { findBookByIdentifier, loadBooks } = require('../lib/books');

function verifyPayhipSignature(req) {
  const secret = process.env.PAYHIP_WEBHOOK_SECRET;
  if (!secret) return true; // no secret configured yet — skip verification
  const signature = req.headers['x-payhip-signature'] || req.headers['X-Payhip-Signature'];
  if (!signature) return false;
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return signature === expected;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body = req.body || {};
  let email = null;
  let source = 'unknown';
  let book = null;

  // Gumroad ping (form-urlencoded): `email`, `seller_id`, `product_permalink`.
  if (body.email && body.seller_id) {
    if (process.env.GUMROAD_SELLER_ID && body.seller_id !== process.env.GUMROAD_SELLER_ID) {
      console.warn('Webhook: seller_id mismatch, ignoring ping');
      return res.status(200).json({ received: true, ignored: true });
    }
    email = body.email;
    source = 'gumroad';
    book = findBookByIdentifier(body.product_permalink);
  }

  // Payhip webhook (JSON): shape varies by event type.
  if (!email) {
    if (!verifyPayhipSignature(req)) {
      console.warn('Webhook: Payhip signature mismatch, ignoring');
      return res.status(401).json({ error: 'invalid_signature' });
    }
    email = body.buyer_email || (body.data && body.data.email) || body.email || null;
    if (email) {
      source = 'payhip';
      const productId =
        body.product_id || (body.data && body.data.product_id) || body.product_link || null;
      book = findBookByIdentifier(productId);
    }
  }

  if (!email) {
    console.log('Webhook received with no recognizable email field:', JSON.stringify(body));
    return res.status(200).json({ received: true, note: 'no email field found' });
  }

  // Fallback: if you've only configured one book so far, assume that's the
  // one being sold — remove this once books.json has more than one entry.
  if (!book && loadBooks().length === 1) {
    book = loadBooks()[0];
  }

  if (!book) {
    console.warn('Webhook: could not match sale to a book in books.json', JSON.stringify(body));
    return res.status(200).json({ received: true, note: 'no matching book found' });
  }

  try {
    await addPurchase(email, book.slug, source);
    return res.status(200).json({ received: true, book: book.slug });
  } catch (err) {
    console.error('webhook error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
};
