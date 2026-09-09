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
    group by t.anchor
    order by t.updated_at desc
  `);

  const runningCount = await pool.query(`select count(*)::int as n from sessions where status = 'running'`);

  return NextResponse.json({
    stories: stories.rows,
    intake: intake.rows,
    runningCount: runningCount.rows[0].n,
    generatedAt: new Date().toISOString(),
  });
}
