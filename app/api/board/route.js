import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const pool = db();

  const stories = await pool.query(`
    select s.id, s.title, s.status, s.epic, s.updated_at, s.project_id, p.repo_url,
      coalesce(json_agg(json_build_object(
        'id', sess.id, 'pid', sess.pid, 'kind', sess.kind, 'status', sess.status,
        'started_at', sess.started_at, 'ended_at', sess.ended_at
      )) filter (where sess.id is not null and sess.status = 'running'), '[]') as sessions
    from stories s
    left join projects p on p.id = s.project_id
    left join sessions sess on sess.story_id = s.id
    group by s.id, p.repo_url
    order by s.updated_at desc
  `);

  const intake = await pool.query(`
    select t.anchor, t.last_text, t.updated_at,
      coalesce(json_agg(json_build_object(
        'id', sess.id, 'pid', sess.pid, 'kind', sess.kind, 'status', sess.status,
        'started_at', sess.started_at
      )) filter (where sess.id is not null and sess.status = 'running'), '[]') as sessions
    from intake_threads t
    left join sessions sess on sess.thread_anchor = t.anchor and sess.status = 'running'
    where not t.dismissed
    group by t.anchor
    order by t.updated_at desc
  `);

  // Authoritative list — every running session, regardless of whether it
  // attaches to a story/intake card. plan/retro dispatches (events.py's
  // steps 5/7/8) never do: their prompt carries multiple candidate
  // stories or a PR, not one story id, so story_id is always null for
  // them. Deriving the header's session list from the cards above missed
  // them entirely (visible in the count, invisible everywhere else) —
  // this is the fix, query sessions directly instead.
  const running = await pool.query(`
    select sess.id, sess.pid, sess.kind, sess.started_at,
      coalesce(s.title, sess.thread_anchor, sess.kind) as label
    from sessions sess
    left join stories s on s.id = sess.story_id
    where sess.status = 'running'
    order by sess.started_at desc
  `);

  return NextResponse.json({
    stories: stories.rows,
    intake: intake.rows,
    runningSessions: running.rows,
    runningCount: running.rows.length,
    generatedAt: new Date().toISOString(),
  });
}
