"use client";
import { useEffect, useState } from "react";

const COLUMNS = [
  "idea", "spec-draft", "spec-validated", "design",
  "design-validated", "planned", "in-review", "merged",
];

export default function Board() {
  const [data, setData] = useState(null);
  const [logFor, setLogFor] = useState(null);
  const [log, setLog] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/board");
      if (res.ok) setData(await res.json());
    }
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  async function openLog(sessionId) {
    setLogFor(sessionId);
    const res = await fetch(`/api/session/${sessionId}/log`);
    const j = await res.json();
    setLog(j.tail || j.error || "");
  }

  if (!data) return <p style={{ padding: 24 }}>loading…</p>;

  const byStatus = Object.fromEntries(COLUMNS.map((c) => [c, []]));
  for (const s of data.stories) (byStatus[s.status] ||= []).push(s);

  return (
    <div style={{ padding: "20px 24px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h1 style={{ fontSize: 16, margin: 0 }}>omega — pipeline board</h1>
        <span style={{ fontSize: 12, color: "#888" }}>
          🟢 {data.runningCount} session{data.runningCount === 1 ? "" : "s"} running
        </span>
      </header>

      {data.intake.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 12, textTransform: "uppercase", color: "#888", margin: "0 0 8px" }}>Intake</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {data.intake.map((t) => (
              <Card key={t.anchor} title={t.last_text.slice(0, 80)} sub={`thread ${t.anchor}`}
                sessions={t.sessions} onOpenLog={openLog} />
            ))}
          </div>
        </section>
      )}

      <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
        {COLUMNS.map((col) => (
          <div key={col} style={{ minWidth: 220, flex: "0 0 220px" }}>
            <h2 style={{ fontSize: 12, textTransform: "uppercase", color: "#888", margin: "0 0 8px" }}>
              {col} <span style={{ color: "#555" }}>({byStatus[col].length})</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {byStatus[col].map((s) => (
                <Card key={s.id} title={s.title} sub={s.id} sessions={s.sessions} onOpenLog={openLog} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {logFor && (
        <div onClick={() => setLogFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <pre onClick={(e) => e.stopPropagation()}
            style={{ background: "#1a1a1c", padding: 16, borderRadius: 8, maxWidth: "80vw", maxHeight: "70vh", overflow: "auto", fontSize: 12, whiteSpace: "pre-wrap" }}>
            {log}
          </pre>
        </div>
      )}
    </div>
  );
}

function Card({ title, sub, sessions, onOpenLog }) {
  return (
    <div style={{ background: "#1a1a1c", border: "1px solid #2a2a2c", borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 13, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: "#777", marginBottom: sessions.length ? 6 : 0 }}>{sub}</div>
      {sessions.map((sess) => (
        <button key={sess.id} onClick={() => onOpenLog(sess.id)}
          style={{ display: "block", width: "100%", textAlign: "left", fontSize: 11, color: "#4ade80", background: "none", border: 0, padding: "2px 0", cursor: "pointer" }}>
          🟢 {sess.kind} · pid {sess.pid}
        </button>
      ))}
    </div>
  );
}
