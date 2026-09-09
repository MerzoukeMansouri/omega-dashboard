import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Dismisses an intake card from the board. Doesn't touch the underlying
// Telegram thread state — replying to that message on Telegram still
// re-dispatches grilling (see telegram-gate/listener.sh); this only hides
// stale/abandoned entries here. sync.py never resets `dismissed` on its
// upsert, so this sticks until the thread's files are deleted for real.
export async function DELETE(_req, { params }) {
  const pool = db();
  await pool.query("update intake_threads set dismissed = true where anchor = $1", [params.anchor]);
  return NextResponse.json({ ok: true });
}
