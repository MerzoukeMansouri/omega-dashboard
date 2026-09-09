import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "node:crypto";

// Mints a 60s-TTL HMAC token naming one tmux session — see
// dashboard/SKILL.md's Terminal section. Never touches DASHBOARD_PASSWORD
// itself beyond using it as the HMAC key; terminal.py verifies statelessly
// with the same key, no DB round-trip on its side.
export async function GET(_req, { params }) {
  const pool = db();
  const { rows } = await pool.query("select tmux_session from sessions where id = $1", [params.id]);
  if (!rows.length || !rows[0].tmux_session) {
    return NextResponse.json({ error: "no attachable session" }, { status: 404 });
  }
  const session = rows[0].tmux_session;
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac("sha256", process.env.DASHBOARD_PASSWORD)
    .update(`${session}.${ts}`).digest("hex");
  return NextResponse.json({
    session,
    token: `${ts}.${sig}`,
    wsPath: `/terminal-ws?session=${encodeURIComponent(session)}&token=${ts}.${sig}`,
  });
}
