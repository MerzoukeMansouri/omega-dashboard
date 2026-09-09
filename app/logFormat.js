// Shared by the static log viewer (page.js) and the live one (LiveLog.js).
// Content is claude -p --output-format stream-json output (one JSON event
// per line — see runtime/events.py / telegram.sh's run_*_in_tmux). Only
// renders the settled events (assistant/user/result); stream_event carries
// the same content again as incremental deltas, would double it up.
const TOOL_SUMMARY = {
  Bash: (i) => i.command,
  Read: (i) => i.file_path,
  Write: (i) => i.file_path,
  Edit: (i) => i.file_path,
  Grep: (i) => i.pattern,
  Glob: (i) => i.pattern,
};

function summarizeInput(name, input) {
  const f = TOOL_SUMMARY[name];
  const s = f ? f(input) : JSON.stringify(input);
  return s && s.length > 140 ? s.slice(0, 140) + "…" : s;
}

function toolResultText(content) {
  const text = typeof content === "string" ? content : JSON.stringify(content);
  return text.length > 600 ? text.slice(0, 600) + "…" : text;
}

export function parseStreamLog(raw) {
  const events = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let d;
    try { d = JSON.parse(t); } catch { events.push({ kind: "raw", text: t }); continue; }

    if (d.type === "assistant") {
      for (const block of d.message?.content || []) {
        if (block.type === "text" && block.text) events.push({ kind: "text", text: block.text });
        else if (block.type === "tool_use") events.push({ kind: "tool", name: block.name, summary: summarizeInput(block.name, block.input) });
      }
    } else if (d.type === "user") {
      for (const block of d.message?.content || []) {
        if (block.type === "tool_result") events.push({ kind: "result", text: toolResultText(block.content), err: !!block.is_error });
      }
    } else if (d.type === "result") {
      events.push({ kind: "done", text: d.result || d.stop_reason || "finished", cost: d.total_cost_usd, ms: d.duration_api_ms });
    }
    // system/status, rate_limit_event, stream_event: not shown — noise or duplicate.
  }
  return events;
}

export function LogEvents({ text }) {
  const events = parseStreamLog(text);
  if (!events.length) return <p style={{ fontSize: 12, color: "#888" }}>(no output yet)</p>;
  const mono = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
  return (
    <div style={{ fontSize: 13, lineHeight: 1.6, fontFamily: mono }}>
      {events.map((e, i) => {
        if (e.kind === "text") return (
          <p key={i} style={{ margin: "10px 0", color: "#e5e5e5", whiteSpace: "pre-wrap" }}>{e.text}</p>
        );
        if (e.kind === "tool") return (
          <div key={i} style={{ margin: "6px 0 0", color: "#e5e5e5" }}>
            <span style={{ color: "#d4a017" }}>⏺</span>{" "}
            <strong>{e.name}</strong>
            {e.summary ? <span style={{ color: "#888" }}>({e.summary})</span> : null}
          </div>
        );
        if (e.kind === "result") {
          const lines = e.text.split("\n");
          const first = lines[0];
          const rest = lines.length - 1;
          return (
            <div key={i} style={{ margin: "0 0 6px", color: e.err ? "#f87171" : "#666", whiteSpace: "pre-wrap" }}>
              {"  "}⎿ {first}
              {rest > 0 && <span style={{ color: "#555" }}> … +{rest} line{rest === 1 ? "" : "s"}</span>}
            </div>
          );
        }
        if (e.kind === "done") return (
          <div key={i} style={{ margin: "14px 0 0", paddingTop: 10, borderTop: "1px solid #222", color: "#4ade80" }}>
            ● {e.text}
            <span style={{ color: "#555" }}>
              {e.ms ? `  ${(e.ms / 1000).toFixed(1)}s` : ""}{e.cost ? `  $${e.cost.toFixed(3)}` : ""}
            </span>
          </div>
        );
        return <div key={i} style={{ color: "#555", whiteSpace: "pre-wrap" }}>{e.text}</div>;
      })}
    </div>
  );
}
