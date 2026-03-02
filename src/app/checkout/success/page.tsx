// src/app/checkout/success/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SuccessInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [identityId, setIdentityId] = useState<string>("");
  const [location, setLocation] = useState<string>("");

  const locationFromQuery = useMemo(() => (sp.get("location") || "").trim(), [sp]);

  useEffect(() => {
    try {
      const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
      const lsLocation = (localStorage.getItem("rr_location") || "").trim();

      const targetLocation = (locationFromQuery || lsLocation || "").trim();

      setIdentityId(lsIdentity);
      setLocation(targetLocation);

      // Persist query location if present
      if (locationFromQuery) {
        localStorage.setItem("rr_location", locationFromQuery);
      }

      // Auto-return
      if (targetLocation && lsIdentity) {
        const t = window.setTimeout(() => {
          router.replace(`/request/${targetLocation}`);
        }, 450);
        return () => window.clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, [router, locationFromQuery]);

  return (
    <main style={{ padding: 18, maxWidth: 720, margin: "0 auto" }}>
      <div
        style={{
          borderRadius: 18,
          padding: 18,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(10px)",
        }}
      >
        <h1 style={{ fontSize: 28, margin: 0 }}>✅ Payment successful</h1>

        <p style={{ opacity: 0.9, marginTop: 10 }}>
          Your credits are being applied. We’ll send you back automatically.
        </p>

        {!identityId ? (
          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
            Note: We couldn’t find your saved verification on this device. If you get prompted to verify again,
            just re-verify once to reconnect your credits.
          </p>
        ) : null}

        {!location ? (
          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
            Note: We couldn’t detect your rink location. Use the buttons below to continue.
          </p>
        ) : null}

        <div style={{ marginTop: 14, fontSize: 14, opacity: 0.7, lineHeight: 1.4 }}>
          <div>
            <b>Location:</b> {location || "—"}
          </div>
          <div>
            <b>Identity:</b> {identityId ? `${identityId.slice(0, 10)}…` : "—"}
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              if (location) router.push(`/request/${location}`);
              else router.push("/");
            }}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              cursor: "pointer",
            }}
          >
            Back to requests
          </button>

          <button
            onClick={() => router.push("/")}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "white",
              cursor: "pointer",
              opacity: 0.9,
            }}
          >
            Home
          </button>
        </div>

        <p style={{ marginTop: 14, fontSize: 13, opacity: 0.7 }}>
          If credits don’t appear immediately, the request screen will refresh automatically.
        </p>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: 18, maxWidth: 720, margin: "0 auto" }}>
          <div
            style={{
              borderRadius: 18,
              padding: 18,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(10px)",
            }}
          >
            <h1 style={{ fontSize: 28, margin: 0 }}>✅ Payment successful</h1>
            <p style={{ opacity: 0.9, marginTop: 10 }}>Loading…</p>
          </div>
        </main>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}