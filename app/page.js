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
  const [specFor, setSpecFor] = useState(null); // story id
  const [spec, setSpec] = useState({ content: "", loading: false, saving: false, error: "" });

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

  async function openSpec(storyId) {
    setSpecFor(storyId);
    setSpec({ content: "", loading: true, saving: false, error: "" });
    const res = await fetch(`/api/story/${storyId}`);
    const j = await res.json();
    if (!res.ok) setSpec({ content: "", loading: false, saving: false, error: j.error || "failed to load" });
    else setSpec({ content: j.content || "", loading: false, saving: false, error: "" });
  }

  async function saveSpec() {
    setSpec((s) => ({ ...s, saving: true, error: "" }));
    const res = await fetch(`/api/story/${specFor}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: spec.content }),
    });
    const j = await res.json();
    if (!res.ok) setSpec((s) => ({ ...s, saving: false, error: j.error || "save failed" }));
    else setSpec((s) => ({ ...s, saving: false }));
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
                <Card key={s.id} storyId={s.id} title={s.title} sub={s.id} sessions={s.sessions}
                  onOpenLog={openLog} onOpenSpec={openSpec} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {logFor && (
        <Modal onClose={() => setLogFor(null)}>
          <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{log}</pre>
        </Modal>
      )}

      {specFor && (
        <Modal onClose={() => setSpecFor(null)} wide>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <strong style={{ fontSize: 13 }}>{specFor}</strong>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {spec.error && <span style={{ color: "#f87171", fontSize: 12 }}>{spec.error}</span>}
              <button onClick={saveSpec} disabled={spec.loading || spec.saving}
                style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                {spec.saving ? "saving…" : "save (commits to main)"}
              </button>
            </div>
          </div>
          {spec.loading ? (
            <p style={{ fontSize: 12, color: "#888" }}>loading…</p>
          ) : (
            <textarea value={spec.content} onChange={(e) => setSpec((s) => ({ ...s, content: e.target.value }))}
              style={{ width: "100%", height: "60vh", background: "#111", color: "#ddd", border: "1px solid #333",
                borderRadius: 6, padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 12, resize: "vertical" }} />
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#1a1a1c", padding: 16, borderRadius: 8, maxWidth: wide ? "90vw" : "80vw",
          width: wide ? 800 : "auto", maxHeight: "80vh", overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function Card({ storyId, title, sub, sessions, onOpenLog, onOpenSpec }) {
  return (
    <div style={{ background: "#1a1a1c", border: "1px solid #2a2a2c", borderRadius: 8, padding: 10 }}>
      {storyId ? (
        <button onClick={() => onOpenSpec(storyId)}
          style={{ display: "block", textAlign: "left", background: "none", border: 0, color: "#e5e5e5", padding: 0, cursor: "pointer", fontSize: 13, marginBottom: 4 }}>
          {title}
        </button>
      ) : (
        <div style={{ fontSize: 13, marginBottom: 4 }}>{title}</div>
      )}
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
