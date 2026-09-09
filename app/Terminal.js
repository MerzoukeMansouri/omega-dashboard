"use client";
import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

// Real interactive terminal, bridged to a tmux session on the server —
// see dashboard/SKILL.md's Terminal section for the auth and risk
// tradeoff. Token is fetched fresh (60s TTL) each time this mounts.
// Two callers: a fullscreen attach to one claude -p session's pane
// (tokenUrl = /api/session/<id>/terminal-token), and the standing
// bottom-docked general shell (tokenUrl = /api/terminal/shell-token).
export default function TerminalView({ tokenUrl, title, dock, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    let ws;
    let term;
    let cancelled = false;

    (async () => {
      const res = await fetch(tokenUrl);
      if (!res.ok || cancelled) return;
      const { wsPath } = await res.json();

      term = new XTerm({
        theme: { background: "#111", foreground: "#ddd" },
        fontSize: 13,
        cursorBlink: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(ref.current);
      fit.fit();

      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${proto}//${window.location.host}${wsPath}`);
      ws.binaryType = "arraybuffer";

      ws.onmessage = (ev) => {
        const data = ev.data instanceof ArrayBuffer ? new Uint8Array(ev.data) : ev.data;
        term.write(typeof data === "string" ? data : new TextDecoder().decode(data));
      };
      ws.onopen = () => term.writeln("\x1b[90mattached\x1b[0m");
      ws.onclose = () => term.writeln("\r\n\x1b[90m[disconnected]\x1b[0m");

      term.onData((d) => ws.readyState === WebSocket.OPEN && ws.send(d));
      const resize = () => {
        fit.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`\x00resize:${term.cols},${term.rows}`);
        }
      };
      window.addEventListener("resize", resize);
      resize();

      term._cleanup = () => window.removeEventListener("resize", resize);
    })();

    return () => {
      cancelled = true;
      ws?.close();
      term?._cleanup?.();
      term?.dispose();
    };
  }, [tokenUrl]);

  const containerStyle = dock
    ? { display: "flex", flexDirection: "column", height: "100%" }
    : { position: "fixed", inset: 0, background: "#0a0a0a", zIndex: 50, display: "flex", flexDirection: "column" };

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", borderBottom: "1px solid #222" }}>
        <span style={{ fontSize: 12, color: "#888" }}>{title}</span>
        {onClose && (
          <button onClick={onClose}
            style={{ background: "none", border: 0, color: "#888", cursor: "pointer", fontSize: 13 }}>
            {dock ? "▾" : "close ✕"}
          </button>
        )}
      </div>
      <div ref={ref} style={{ flex: 1, padding: 8, minHeight: 0 }} />
    </div>
  );
}
