import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// repo_url is like https://github.com/<owner>/<repo>.git
function ownerRepo(repoUrl) {
  const m = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

export async function GET(_req, { params }) {
  const pool = db();
  const { rows } = await pool.query(
    `select s.content, s.file_path, s.git_sha, p.repo_url
     from stories s join projects p on p.id = s.project_id where s.id = $1`,
    [params.id]
  );
  if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

// Commits the edit straight to main via GitHub's Contents API — see
// dashboard/SKILL.md for why (keeps git as the reviewable history of
// record; no new host-exposed write endpoint).
export async function POST(req, { params }) {
  const pool = db();
  const { rows } = await pool.query(
    `select s.file_path, s.git_sha, p.repo_url
     from stories s join projects p on p.id = s.project_id where s.id = $1`,
    [params.id]
  );
  if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { file_path, git_sha, repo_url } = rows[0];
  const or = ownerRepo(repo_url);
  if (!or) return NextResponse.json({ error: "can't parse repo_url" }, { status: 500 });

  const { content } = await req.json();
  const token = process.env.GITHUB_TOKEN;
  if (!token) return NextResponse.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });

  const res = await fetch(
    `https://api.github.com/repos/${or.owner}/${or.repo}/contents/${file_path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `dashboard: edit ${params.id}`,
        content: Buffer.from(content, "utf8").toString("base64"),
        sha: git_sha,
        branch: "main",
      }),
    }
  );
  const j = await res.json();
  if (!res.ok) return NextResponse.json({ error: j.message || "GitHub commit failed" }, { status: res.status });

  // Reflect the edit immediately; sync.py will overwrite with the same
  // content plus the fresh mtime/status on its next pass anyway.
  await pool.query(
    "update stories set content = $1, git_sha = $2 where id = $3",
    [content, j.content.sha, params.id]
  );
  return NextResponse.json({ ok: true, sha: j.content.sha });
}
