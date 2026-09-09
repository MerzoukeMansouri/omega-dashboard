"use client";
import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) window.location.href = "/";
    else setError("wrong password");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>omega dashboard</h1>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          style={{ padding: 10, background: "#1a1a1c", border: "1px solid #333", color: "#eee", borderRadius: 6 }}
        />
        <button type="submit" style={{ padding: 10, background: "#2563eb", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer" }}>
          enter
        </button>
        {error && <span style={{ color: "#f87171", fontSize: 13 }}>{error}</span>}
      </form>
    </div>
  );
}
