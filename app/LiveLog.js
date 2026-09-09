"use client";
import { useEffect, useRef, useState } from "react";
import { LogEvents } from "./logFormat";

// Streamed from the log FILE directly (terminal.py's tail_file, mode=log)
// — a claude -p dispatch's output is redirected straight to that file and
// never touches a pty at all, so attaching to the tmux pane (the original
// approach here) showed nothing: verified, tmux capture-pane was empty
// while the file had 500KB+. Kept as a defensive no-op for plain text;
// only matters if this component is ever pointed at a real pty stream again.
function stripAnsi(s) {
  return s
    .replace(/\x1b\][^\x07]*(\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-9;:<=>?]*[a-zA-Z]/g, "")
    .replace(/\x1b[()][0-9A-Za-z]/g, "")
    .replace(/\x1b[=>]/g, "");
}

export default function LiveLog({ sessionId, onClose }) {
  const [text, setText] = useState("");
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const bufferRef = useRef("");
  const bottomRef = useRef(null);

  useEffect(() => {
    let ws;
    let cancelled = false;

    (async () => {
      const res = await fetch(`/api/session/${sessionId}/terminal-token?mode=log`);
      if (cancelled) return;
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error || "failed to load log");
        return;
      }
      const { wsPath } = await res.json();

      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${proto}//${window.location.host}${wsPath}`);
      ws.binaryType = "arraybuffer";
      ws.onopen = () => setLive(true);
      ws.onclose = () => setLive(false);
      ws.onmessage = (ev) => {
        const data = ev.data instanceof ArrayBuffer ? new TextDecoder().decode(ev.data) : ev.data;
        bufferRef.current += data;
        setText(stripAnsi(bufferRef.current));
      };
    })();

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [text]);

  if (error) return <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: live ? "#4ade80" : "#666" }}>
          {live ? "🔴 live" : "○ connecting…"}
        </span>
      </div>
      <div style={{ maxHeight: "65vh", overflow: "auto" }}>
        <LogEvents text={text} />
        <div ref={bottomRef} />
      </div>
    </>
  );
}
