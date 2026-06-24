<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Architecture Rules

- Keep route handlers and route pages orchestration-only. Business logic belongs in services.
- Keep repositories focused on persistence. Do not add cross-domain business rules in repositories.
- Do not call Mongoose models directly from services when a repository exists for that model.
- Keep shared DTO shaping in serializers and reuse those serializers across pages and APIs.
- Keep shared feature code under `src/features`:
  - `src/features/beats`
  - `src/features/payments`
  - `src/features/studio`
- Keep generic primitives under `src/components/ui` and app shell code under `src/components/layout`.
