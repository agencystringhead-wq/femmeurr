# Femmeurr

Femmeurr is a jewellery brand. This repo is its one-page product catalog website.

## Stack
- Astro (TypeScript strict, `output: 'server'`) on Cloudflare Workers
- D1 for products, R2 for product images
- Password-protected `/storeroom` for inventory management (mobile-first)
- No online checkout: orders happen via WhatsApp or phone call only
- All prices are in INR

## Workflow rules
- Never commit directly to `main`.
- One feature branch per step (e.g. `feat/homepage-design`); push it and open a PR into `main`.
- No `Co-Authored-By` lines in any commit message.
- Do not build features outside the current step's scope.
- Never commit secrets: `.dev.vars` and `.env*` are gitignored.
