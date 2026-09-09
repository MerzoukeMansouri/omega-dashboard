"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TerminalView from "./Terminal";

const COLUMNS = [
  "idea", "spec-draft", "spec-validated", "design",
  "design-validated", "planned", "in-review", "merged",
];

// Frontmatter isn't markdown — strip it for preview only, save/edit still
// use the raw file so the commit never touches it.
function withoutFrontmatter(text) {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  return end === -1 ? text : text.slice(end + 4).replace(/^\s+/, "");
}

export default function Board() {
  const [data, setData] = useState(null);
  const [logFor, setLogFor] = useState(null);
  const [log, setLog] = useState("");
  const [termFor, setTermFor] = useState(null); // session id
  const [specFor, setSpecFor] = useState(null); // story id
  const [spec, setSpec] = useState({ content: "", loading: false, saving: false, error: "", mode: "preview" });

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

  async function dismissIntake(anchor) {
    setData((d) => ({ ...d, intake: d.intake.filter((t) => t.anchor !== anchor) }));
    await fetch(`/api/intake/${anchor}`, { method: "DELETE" });
  }

  async function openSpec(storyId) {
    setSpecFor(storyId);
    setSpec({ content: "", loading: true, saving: false, error: "", mode: "preview" });
    const res = await fetch(`/api/story/${storyId}`);
    const j = await res.json();
    if (!res.ok) setSpec({ content: "", loading: false, saving: false, error: j.error || "failed to load", mode: "preview" });
    else setSpec({ content: j.content || "", loading: false, saving: false, error: "", mode: "preview" });
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

  // Swimlanes: one row per project, columns are pipeline status within it.
  const byProject = {};
  for (const s of data.stories) (byProject[s.project_id] ||= []).push(s);
  const projects = Object.keys(byProject).sort();

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
                sessions={t.sessions} onOpenLog={openLog} onOpenTerminal={setTermFor}
                onDismiss={() => dismissIntake(t.anchor)} />
            ))}
          </div>
        </section>
      )}

      {projects.map((project) => {
        const byStatus = Object.fromEntries(COLUMNS.map((c) => [c, []]));
        for (const s of byProject[project]) (byStatus[s.status] ||= []).push(s);
        return (
          <section key={project} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, margin: "0 0 8px", color: "#e5e5e5" }}>{project}</h2>
            <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
              {COLUMNS.map((col) => (
                <div key={col} style={{ minWidth: 220, flex: "0 0 220px" }}>
                  <h3 style={{ fontSize: 11, textTransform: "uppercase", color: "#888", margin: "0 0 8px", fontWeight: 400 }}>
                    {col} <span style={{ color: "#555" }}>({byStatus[col].length})</span>
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {byStatus[col].map((s) => (
                      <Card key={s.id} storyId={s.id} title={s.title} sub={s.id} sessions={s.sessions}
                        onOpenLog={openLog} onOpenSpec={openSpec} onOpenTerminal={setTermFor} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

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
              <div style={{ display: "flex", background: "#111", borderRadius: 6, border: "1px solid #333" }}>
                {["preview", "edit"].map((m) => (
                  <button key={m} onClick={() => setSpec((s) => ({ ...s, mode: m }))}
                    style={{
                      padding: "5px 12px", fontSize: 12, border: 0, cursor: "pointer",
                      background: spec.mode === m ? "#2a2a2c" : "transparent",
                      color: spec.mode === m ? "#fff" : "#888", borderRadius: 5,
                    }}>
                    {m}
                  </button>
                ))}
              </div>
              <button onClick={saveSpec} disabled={spec.loading || spec.saving}
                style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                {spec.saving ? "saving…" : "save (commits to main)"}
              </button>
            </div>
          </div>
          {spec.loading ? (
            <p style={{ fontSize: 12, color: "#888" }}>loading…</p>
          ) : spec.mode === "preview" ? (
            <div className="md-preview" style={{ height: "60vh", overflow: "auto", background: "#111", border: "1px solid #333", borderRadius: 6, padding: "10px 18px" }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{withoutFrontmatter(spec.content)}</ReactMarkdown>
              <style jsx global>{`
                .md-preview { font-size: 13px; line-height: 1.55; color: #ddd; }
                .md-preview h1, .md-preview h2, .md-preview h3 { color: #fff; margin: 1.2em 0 .4em; }
                .md-preview h1 { font-size: 1.3em; } .md-preview h2 { font-size: 1.15em; } .md-preview h3 { font-size: 1.05em; }
                .md-preview p { margin: .6em 0; }
                .md-preview code { background: #1a1a1c; padding: 1px 5px; border-radius: 4px; font-size: .9em; }
                .md-preview pre { background: #1a1a1c; padding: 10px; border-radius: 6px; overflow: auto; }
                .md-preview pre code { background: none; padding: 0; }
                .md-preview ul, .md-preview ol { padding-left: 1.4em; }
                .md-preview li { margin: .2em 0; }
                .md-preview li input[type="checkbox"] { margin-right: 6px; }
                .md-preview blockquote { border-left: 3px solid #333; margin: .6em 0; padding: 0 .8em; color: #999; }
                .md-preview a { color: #60a5fa; }
                .md-preview hr { border-color: #333; margin: 1.2em 0; }
                .md-preview table { border-collapse: collapse; margin: .6em 0; }
                .md-preview th, .md-preview td { border: 1px solid #333; padding: 4px 8px; font-size: .9em; }
              `}</style>
            </div>
          ) : (
            <textarea value={spec.content} onChange={(e) => setSpec((s) => ({ ...s, content: e.target.value }))}
              style={{ width: "100%", height: "60vh", background: "#111", color: "#ddd", border: "1px solid #333",
                borderRadius: 6, padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 12, resize: "vertical" }} />
          )}
        </Modal>
      )}

      {termFor && <TerminalView sessionId={termFor} onClose={() => setTermFor(null)} />}
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

function Card({ storyId, title, sub, sessions, onOpenLog, onOpenSpec, onOpenTerminal, onDismiss }) {
  return (
    <div style={{ background: "#1a1a1c", border: "1px solid #2a2a2c", borderRadius: 8, padding: 10, position: "relative" }}>
      {onDismiss && (
        <button onClick={onDismiss} title="dismiss"
          style={{ position: "absolute", top: 6, right: 6, background: "none", border: 0, color: "#666", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 2 }}>
          ×
        </button>
      )}
      {storyId ? (
        <button onClick={() => onOpenSpec(storyId)}
          style={{ display: "block", textAlign: "left", background: "none", border: 0, color: "#e5e5e5", padding: 0, cursor: "pointer", fontSize: 13, marginBottom: 4, paddingRight: onDismiss ? 16 : 0 }}>
          {title}
        </button>
      ) : (
        <div style={{ fontSize: 13, marginBottom: 4, paddingRight: onDismiss ? 16 : 0 }}>{title}</div>
      )}
      <div style={{ fontSize: 11, color: "#777", marginBottom: sessions.length ? 6 : 0 }}>{sub}</div>
      {sessions.map((sess) => (
        <div key={sess.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => onOpenLog(sess.id)}
            style={{ flex: 1, textAlign: "left", fontSize: 11, color: "#4ade80", background: "none", border: 0, padding: "2px 0", cursor: "pointer" }}>
            🟢 {sess.kind} · pid {sess.pid}
          </button>
          <button onClick={() => onOpenTerminal(sess.id)} title="attach terminal"
            style={{ fontSize: 11, color: "#888", background: "none", border: 0, cursor: "pointer", padding: "2px 4px" }}>
            🖥
          </button>
        </div>
      ))}
    </div>
  );
}
