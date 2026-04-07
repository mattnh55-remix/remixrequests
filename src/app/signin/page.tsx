"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInPage() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function login() {
    setMsg("");
    setBusy(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });

      if (!res.ok) {
        setMsg("Wrong username or PIN.");
        setBusy(false);
        return;
      }

      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/admin/remix");
    } catch {
      setMsg("Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 420 }}>
      <h2>Staff Sign In</h2>

      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="admInput"
          autoFocus
        />

        <input
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="admInput"
          inputMode="numeric"
          type="password"
          onKeyDown={(e) => {
            if (e.key === "Enter") void login();
          }}
        />

        <button
          type="button"
          onClick={() => void login()}
          className="admBtn"
          disabled={busy}
        >
          {busy ? "Signing in..." : "Sign In"}
        </button>

        {msg ? <div>{msg}</div> : null}
      </div>
    </div>
  );
}