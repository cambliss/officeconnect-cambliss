# Office Connect Marketplace (Standalone)

Separate Next.js app for a multi-vendor marketplace using Office Connect backend APIs.

## Run locally

1. Install dependencies

```bash
npm install
```

2. Configure backend origin

Create `.env.local`:

```env
BACKEND_ORIGIN=http://localhost:4000
```

3. Start app

```bash
npm run dev
```

## API model

- Marketplace frontend calls `/api/*`
- Next.js rewrite forwards to `BACKEND_ORIGIN/api/*`
- Core sync stays in Office Connect backend (inventory, order, invoice, GST, accounting)
