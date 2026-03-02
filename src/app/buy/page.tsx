"use client";

import { useEffect, useMemo, useState } from "react";
import { PACKAGES, type PackageKey } from "@/lib/packages";

type ApiResp =
  | { ok: true; checkoutUrl: string; referenceId?: string }
  | { ok: false; error: string; details?: any };

export default function BuyPage() {
  const [identityId, setIdentityId] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [busyKey, setBusyKey] = useState<string>("");

  useEffect(() => {
    // Read from localStorage (set during /auth/verify)
    const id = typeof window !== "undefined" ? localStorage.getItem("rr_identityId") : null;
    const loc = typeof window !== "undefined" ? localStorage.getItem("rr_location") : null;

    if (id) setIdentityId(id);
    if (loc) setLocation(loc);
  }, []);

  const packageEntries = useMemo(() => {
    return Object.entries(PACKAGES) as Array<[PackageKey, { credits: number; priceCents: number; label?: string }]>;
  }, []);

  async function startCheckout(packageKey: PackageKey) {
    setError("");

    if (!location || !identityId) {
      setError("You’re not verified yet. Go back and verify your phone/email first.");
      return;
    }

    setBusyKey(packageKey);

    try {
      const res = await fetch("/api/square/create-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, identityId, packageKey }),
      });

      const data = (await res.json()) as ApiResp;

      if (!data.ok) {
        setError(data.error || "Checkout failed.");
        setBusyKey("");
        return;
      }

      // Redirect to Square hosted checkout
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setError(e?.message || "Checkout failed.");
      setBusyKey("");
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 18 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Buy Credits</h1>

      <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
        <div>Location: <b>{location || "(missing)"}</b></div>
        <div>Identity: <b>{identityId ? `${identityId.slice(0, 8)}…` : "(missing)"}</b></div>
      </div>

      {error ? (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
          <b style={{ color: "#ff4d4d" }}>Error:</b> {error}
        </div>
      ) : null}

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        {packageEntries.map(([key, pkg]) => {
          const dollars = (pkg.priceCents / 100).toFixed(2);
          const busy = busyKey === key;

          return (
            <button
              key={key}
              onClick={() => startCheckout(key)}
              disabled={!!busyKey}
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.15)",
                textAlign: "left",
                cursor: busyKey ? "not-allowed" : "pointer",
                opacity: busyKey && !busy ? 0.6 : 1,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                {pkg.label || `${pkg.credits} credits`}
              </div>
              <div style={{ opacity: 0.85, marginTop: 4 }}>
                ${dollars} {busy ? "— opening checkout…" : ""}
              </div>
              <div style={{ opacity: 0.6, marginTop: 6, fontSize: 12 }}>
                packageKey: {key}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}