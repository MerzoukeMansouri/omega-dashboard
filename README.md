# omega-dashboard

Kanban view of the omega pipeline: stories as cards (columns = pipeline
status), with any currently-running `claude -p` session attached to its
card. Next.js app, reads a Postgres mirror that a separate syncer
(`omega`'s `.claude/skills/dashboard/sync.py`) keeps up to date — this
app never touches the pipeline's files or processes directly.

Env: `DATABASE_URL`, `DASHBOARD_PASSWORD` (single shared-password login,
see `middleware.js`).

Deployed via Dokploy, project `omega-dashboard`. See
`omega`'s `.claude/skills/dokploy-deploy/SKILL.md` for the API-driven
deploy flow and the firewall notes relevant to its Postgres resource.
