"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

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

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");

      router.push(next && next.startsWith("/") ? next : "/admin/remixrequests");
    } catch {
      setMsg("Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgGlowTop} />
      <div style={styles.bgGlowBottom} />

      <div style={styles.card}>
        <img
          src="https://skateremix.com/wp-content/uploads/2026/03/Remix_Globe_Logo_350px.png"
          alt="Admin Logo"
          style={styles.logo}
        />

        <h1 style={styles.title}>Admin • remixrequests</h1>
        <p style={styles.sub}>Enter username and PIN to continue.</p>

        <div style={styles.form}>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            autoFocus
            autoComplete="username"
          />

          <input
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={styles.input}
            inputMode="numeric"
            type="password"
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter") void login();
            }}
          />

          <button
            type="button"
            onClick={() => void login()}
            style={{
              ...styles.button,
              opacity: busy ? 0.7 : 1,
              cursor: busy ? "default" : "pointer",
            }}
            disabled={busy}
          >
            {busy ? "Signing In..." : "Login"}
          </button>

          <div style={styles.tip}>
            Tip: use your staff username and PIN.
          </div>

          {msg ? <div style={styles.error}>{msg}</div> : null}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background:
      "radial-gradient(circle at top, rgba(32,48,130,0.22), transparent 28%), #02040b",
    position: "relative",
    overflow: "hidden",
  },
  bgGlowTop: {
    position: "absolute",
    top: "-140px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "900px",
    height: "300px",
    background: "radial-gradient(circle, rgba(49,71,190,0.18), transparent 70%)",
    pointerEvents: "none",
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: "-180px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "1000px",
    height: "320px",
    background: "radial-gradient(circle, rgba(16,39,140,0.12), transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    width: "100%",
    maxWidth: "520px",
    borderRadius: "28px",
    padding: "28px 18px 18px",
    background: "rgba(3, 7, 20, 0.9)",
    border: "1px solid rgba(49, 87, 255, 0.5)",
    boxShadow:
      "0 0 0 1px rgba(20,36,120,0.15) inset, 0 20px 60px rgba(0,0,0,0.45)",
    textAlign: "center",
    position: "relative",
    zIndex: 1,
  },
  logo: {
    width: "92px",
    height: "92px",
    objectFit: "contain",
    display: "block",
    margin: "0 auto 14px",
  },
  title: {
    margin: 0,
    color: "#f4f7ff",
    fontSize: "clamp(34px, 5vw, 48px)",
    lineHeight: 1.05,
    fontWeight: 900,
    letterSpacing: "-0.02em",
  },
  sub: {
    marginTop: "10px",
    marginBottom: "22px",
    color: "rgba(231,236,255,0.82)",
    fontSize: "18px",
  },
  form: {
    display: "grid",
    gap: "12px",
  },
  input: {
    width: "100%",
    height: "56px",
    borderRadius: "14px",
    border: "1px solid rgba(75, 105, 255, 0.65)",
    background: "#0a1025",
    color: "#f3f6ff",
    fontSize: "18px",
    padding: "0 16px",
    outline: "none",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    height: "56px",
    borderRadius: "14px",
    border: "1px solid rgba(112, 136, 255, 0.9)",
    background: "#2a2f73",
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: 800,
    boxSizing: "border-box",
  },
  tip: {
    marginTop: "2px",
    color: "rgba(220,226,255,0.72)",
    fontSize: "14px",
  },
  error: {
    marginTop: "6px",
    color: "#ffb3b3",
    fontSize: "15px",
    fontWeight: 700,
  },
};