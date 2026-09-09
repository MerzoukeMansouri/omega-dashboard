import { NextResponse } from "next/server";
import crypto from "node:crypto";

// One fixed, standing tmux session for free-form server access — not tied
// to any claude -p dispatch. terminal.py's `tmux new-session -A` creates
// it on first attach and keeps it (and its shell state — cwd, running
// commands) alive across dashboard visits. Same auth as per-session
// attach, see dashboard/SKILL.md's Terminal section.
const SHELL_SESSION = process.env.DASHBOARD_SHELL_SESSION || "omega-shell";

export async function GET() {
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac("sha256", process.env.DASHBOARD_PASSWORD)
    .update(`${SHELL_SESSION}.${ts}`).digest("hex");
  return NextResponse.json({
    session: SHELL_SESSION,
    wsPath: `/terminal-ws?session=${encodeURIComponent(SHELL_SESSION)}&token=${ts}.${sig}`,
  });
}
