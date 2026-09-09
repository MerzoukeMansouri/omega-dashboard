import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Relays a dashboard comment into the same gate-reply dispatch Telegram
// uses — see dashboard/SKILL.md's "Gate validate/comment from the board".
// GATE_RELAY_URL points at the host's gate-server.py over the internal
// docker_gwbridge address (same shape as DATABASE_URL vs
// OMEGA_DASHBOARD_DB_INTERNAL_URL — public domain isn't involved here).
export async function POST(req, { params }) {
  const { text } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "empty comment" }, { status: 400 });
  }

  const pool = db();
  const { rows } = await pool.query("select project_id from stories where id = $1", [params.id]);
  if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });

  const relayUrl = process.env.GATE_RELAY_URL;
  if (!relayUrl) return NextResponse.json({ error: "GATE_RELAY_URL not configured" }, { status: 500 });

  const res = await fetch(relayUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DASHBOARD_PASSWORD}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ project: rows[0].project_id, story: params.id, text }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: j.error || "dispatch failed" }, { status: res.status });
  return NextResponse.json({ ok: true });
}
