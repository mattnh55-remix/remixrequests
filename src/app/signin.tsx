"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffLogin() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function login() {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, pin }),
    });

    if (!res.ok) {
      setMsg("Wrong login");
      return;
    }

    router.push("/admin/remixrequest"); // or dynamic
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Staff Login</h2>

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />

      <button onClick={login}>Login</button>

      {msg && <div>{msg}</div>}
    </div>
  );
}