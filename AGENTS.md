# Operational Commands

- npm install; npm run dev; npm test; npm run typecheck; npm run build.
- Use npm and commit package-lock.json. Use Node 22 LTS or newer.

# Golden Rules

- Never expose TourAPI or Supabase secret keys to client components.
- Keep demo data explicitly labelled and isolated from production storage.
- Store no visitor coordinates. Distances are straight-line, never travel times.
- Enable RLS on exposed tables; public access is SELECT only.
- Preserve existing data on upstream failures. Do not infer cancellation from missing pages.
- Use Asia/Seoul calendar dates and inclusive event overlap.
- Search narrowly, modify minimally, verify progressively, preserve user changes.

# Project Context

A mobile-first festival map for planning a date. Next.js, TypeScript, Supabase, Kakao Maps, Vercel.

# Standards & References

- Before any UI change, read root `DESIGN.md` first and use it as the design source of truth for colors, typography, components, spacing, and responsive behavior. Preserve functionality, accessibility, and image copyright constraints. Do not add unrelated marketplace features from the reference.
- README.md describes setup and limitations.
- Use feature branches and conventional commits; never commit credentials.
- Propose updates when these rules diverge from the code.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
