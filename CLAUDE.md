# Femmeurr

Femmeurr is a jewellery brand. This repo is its one-page product catalog website.

## Stack
- Astro (TypeScript strict, `output: 'server'`) on Cloudflare Workers
- D1 for products, R2 for product images
- Password-protected `/storeroom` for inventory management (mobile-first)
- No online checkout: orders happen via WhatsApp or phone call only
- All prices are in INR
- Products have no names. The auto-generated code (FM-###) is the identifier everywhere. The `name` column still exists (defaults to empty) but nothing reads or writes it.

## Live site
- Live domain: https://femmeurr.com (canonical; the only URL meant for Google)
- https://www.femmeurr.com 301-redirects to https://femmeurr.com (in `src/middleware.ts`)
- https://femmeurr.agency-stringhead.workers.dev still works for checks but sends `X-Robots-Tag: noindex, nofollow`
- After every push to `main`, verify the deploy (HTTP 200, products and `/img/...` images load) before reporting done. Check femmeurr.com first; the workers.dev URL serves the same deploy.

## Workflow rules
- Commit directly to `main`. No feature branches, no PRs.
- Clear, short commit messages, one or more per step.
- No `Co-Authored-By` lines in any commit message.
- Do not build features outside the current step's scope.
- Never commit secrets: `.dev.vars` and `.env*` are gitignored.
