# Femmeurr

Femmeurr is a jewellery brand. This repo is its one-page product catalog website.

## Stack
- Astro (TypeScript strict, `output: 'server'`) on Cloudflare Workers
- D1 for products, R2 for product images
- Password-protected `/storeroom` for inventory management (mobile-first)
- No online checkout: orders happen via WhatsApp or phone call only
- All prices are in INR

## Live site
- Production URL: https://femmeurr.agency-stringhead.workers.dev
- After every push to `main`, verify the deploy against this URL (HTTP 200, products and `/img/...` images load) before reporting done.

## Workflow rules
- Commit directly to `main`. No feature branches, no PRs.
- Clear, short commit messages, one or more per step.
- No `Co-Authored-By` lines in any commit message.
- Do not build features outside the current step's scope.
- Never commit secrets: `.dev.vars` and `.env*` are gitignored.
