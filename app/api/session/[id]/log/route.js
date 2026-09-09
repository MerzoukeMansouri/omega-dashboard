import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Log tail is synced into Postgres by the host-side syncer (it has the
// filesystem access this container deliberately doesn't) — see
// dashboard/SKILL.md. A full live-streaming tail is more app than a
// first version needs.
export async function GET(_req, { params }) {
  const pool = db();
  const { rows } = await pool.query("select log_path, log_tail from sessions where id = $1", [params.id]);
  if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ path: rows[0].log_path, tail: rows[0].log_tail || "(no output yet)" });
}
