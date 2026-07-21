# Learn Languages — Platform

One gated site for all your language ebooks. A buyer signs in once with their
email and sees a bookshelf of exactly the titles they've purchased — no
matter how many languages you add later.

## Note if you already followed the single-book setup

If you already created a `customers` table in Supabase for the Arabic-only
version, that's fine to leave — this version uses a different table called
`purchases` instead. Just run the new SQL below to add it. You can delete
the old `customers` table later if you want (not required).

## How it works

1. Someone buys any book on **Gumroad or Payhip**.
2. A **webhook** pings this app, which figures out *which specific book* was
   bought (by matching Gumroad's `product_permalink` or Payhip's product ID
   against `books.json`) and records `email + book_slug` as a purchase.
3. The buyer visits your site, types their email — no password.
4. They land on **My Bookshelf**: every book they bought, plus other titles
   they can still buy.
5. Each book's actual content lives in `content/<slug>/book-content.html`,
   outside the public folder — never a directly-downloadable file, only
   reachable through the API after both the login check and an
   ownership check pass.

## One-time setup (Supabase)

Run this in Supabase's SQL Editor (same place you ran the last one):

```sql
create table purchases (
  email text not null,
  book_slug text not null,
  source text,
  purchased_at timestamptz default now(),
  primary key (email, book_slug)
);
```

Click "Run and enable RLS" when prompted, same as before.

You already have `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from last time —
same values, nothing new needed there.

## Environment variables (set these in Vercel)

| Name | Value |
|---|---|
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | your Supabase service_role key |
| `TOKEN_SECRET` | any long random string |
| `GUMROAD_SELLER_ID` | *(optional — your Gumroad seller ID, prevents faked pings)* |
| `PAYHIP_WEBHOOK_SECRET` | *(optional — Payhip's webhook signing secret, if provided)* |

## Configuring your books — `books.json`

This is the one file you edit whenever you add a language. Right now it has
one entry for Arabic:

```json
[
  {
    "slug": "speak-arabic",
    "title": "Speak Arabic — Complete Edition",
    "title_native": "تكلم العربية",
    "buy_url": "https://gumroad.com/l/your-arabic-product",
    "gumroad_permalink": "your-arabic-product-permalink",
    "payhip_product_id": "your-payhip-product-id"
  }
]
```

- `slug` — used in URLs and as the folder name under `content/`. Keep it
  short, lowercase, no spaces (e.g. `speak-spanish`).
- `gumroad_permalink` — find this in your Gumroad product's URL
  (`gumroad.com/l/THIS-PART`).
- `payhip_product_id` — only needed if you also sell on Payhip.
- `buy_url` — the actual link to your product page, shown to browsers who
  don't own it yet.

## Adding a new language book later

1. Create `content/<new-slug>/book-content.html` with that book's content
   (same format as the Arabic one — just the inner page content, no
   `<html>`/`<head>` wrapper).
2. Add a new entry to `books.json` for it.
3. Set up its Gumroad/Payhip product, pointing the same webhook URL
   (`https://YOUR-SITE.vercel.app/api/webhook`) at it — one webhook URL
   handles every book.
4. Push the changes — Vercel redeploys automatically.

That's the whole process — no new backend code, no new database table.

## Connecting Gumroad

Product → Settings → Advanced → **Ping URL**:
```
https://YOUR-SITE.vercel.app/api/webhook
```

## Connecting Payhip

Settings → **Webhooks**, add the same URL. If Payhip gives you a signing
secret, set it as `PAYHIP_WEBHOOK_SECRET`.

## Testing before going live

In Supabase's Table Editor, manually add a row to `purchases` with your own
email and `book_slug` set to `speak-arabic`. Then sign in on your deployed
site with that email — you should see the book on your shelf.

## Files

```
books.json           ← catalog of all books (edit this to add languages)
public/
  index.html          ← login page
  library.html         ← bookshelf (owned books + catalog)
  book.html            ← book viewer (reads ?book=slug from the URL)
  style.css, manifest.json, sw.js
api/
  verify.js            ← checks email, issues token listing owned book slugs
  get-book.js           ← returns one book's content, if token shows ownership
  my-books.js           ← returns full catalog + which ones this buyer owns
  webhook.js            ← receives Gumroad/Payhip sales, matches to a book
lib/
  token.js, books.js, purchases.js
content/
  speak-arabic/book-content.html   ← Arabic book content (add more folders here)
```

## Honest limits

- Stops casual file-sharing, not screen-recording — no web app fully
  prevents that.
- Email-only login is fine for ebook pricing; not bank-grade security.
- Right-click is disabled as light friction only, easily bypassed.
