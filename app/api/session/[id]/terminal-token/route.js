import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "node:crypto";

// Mints a 60s-TTL HMAC token — see dashboard/SKILL.md's Terminal section.
// Never touches DASHBOARD_PASSWORD itself beyond using it as the HMAC key;
// terminal.py verifies statelessly with the same key, no DB round-trip on
// its side. Two modes, both keyed by session id so the client never names
// a tmux session or file path directly:
// - attach (default): names the tmux session, for the interactive
//   terminal. Only meaningful for the standing shell — a dispatch's pty
//   is empty, see logFormat.js's comment and terminal.py's tail_file.
// - log: names the log FILE instead, for the live log viewer. This is
//   the one that actually works for a claude -p dispatch, since its
//   output is redirected straight to that file, never touching a pty.
export const dynamic = "force-dynamic";

function sign(subject) {
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac("sha256", process.env.DASHBOARD_PASSWORD)
    .update(`${subject}.${ts}`).digest("hex");
  return `${ts}.${sig}`;
}

export async function GET(req, { params }) {
  const mode = req.nextUrl.searchParams.get("mode") === "log" ? "log" : "attach";
  const pool = db();

  if (mode === "log") {
    const { rows } = await pool.query("select log_path from sessions where id = $1", [params.id]);
    if (!rows.length || !rows[0].log_path) {
      return NextResponse.json({ error: "no log for this session" }, { status: 404 });
    }
    const path = rows[0].log_path;
    return NextResponse.json({
      wsPath: `/terminal-ws?mode=log&path=${encodeURIComponent(path)}&token=${sign(path)}`,
    });
  }

  const { rows } = await pool.query("select tmux_session from sessions where id = $1", [params.id]);
  if (!rows.length || !rows[0].tmux_session) {
    return NextResponse.json({ error: "no attachable session" }, { status: 404 });
  }
  const session = rows[0].tmux_session;
  return NextResponse.json({
    session,
    wsPath: `/terminal-ws?session=${encodeURIComponent(session)}&token=${sign(session)}`,
  });
}
