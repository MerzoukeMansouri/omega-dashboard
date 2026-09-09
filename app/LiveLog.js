"use client";
import { useEffect, useRef, useState } from "react";
import { LogEvents } from "./logFormat";

// ponytail: strips tmux's terminal-control escape codes (CSI/OSC/charset
// sequences) with a regex rather than a real terminal emulator — good
// enough for a log view (content is a plain scrolling JSON stream, only
// the initial attach sends a full-screen redraw), not pixel-perfect.
// Upgrade to a proper ANSI parser if a redraw ever visibly scrambles output.
function stripAnsi(s) {
  return s
    .replace(/\x1b\][^\x07]*(\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
    .replace(/\x1b[()][0-9A-Za-z]/g, "")
    .replace(/\x1b[=>]/g, "");
}

export default function LiveLog({ sessionId, onClose }) {
  const [text, setText] = useState("");
  const [live, setLive] = useState(false);
  const bufferRef = useRef("");
  const bottomRef = useRef(null);

  useEffect(() => {
    let ws;
    let cancelled = false;

    (async () => {
      const res = await fetch(`/api/session/${sessionId}/terminal-token`);
      if (!res.ok || cancelled) return;
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
