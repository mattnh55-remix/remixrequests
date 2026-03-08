
"use client";

import { useEffect, useMemo, useState } from "react";
import { SHOUTOUT_PRODUCTS, type ShoutoutProductKey } from "@/lib/shoutoutProducts";

type BalanceRes = { ok: boolean; balance?: number; error?: string };
type SessionRes = { location?: { slug: string; name: string }; session?: { id: string; endsAt: string } };

export default function ShoutoutsPage({ params }: { params: { location: string } }) {
  const location = params.location;
  const [identityId, setIdentityId] = useState("");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [locationName, setLocationName] = useState("Remix");
  const [balance, setBalance] = useState(0);
  const [fromName, setFromName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [productKey, setProductKey] = useState<ShoutoutProductKey>("TEXT_BASIC");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedProduct = useMemo(() => SHOUTOUT_PRODUCTS.find((p) => p.key === productKey) || SHOUTOUT_PRODUCTS[0], [productKey]);

  async function refreshSession() {
    try {
      const res = await fetch(`/api/public/session/${location}`, { cache: "no-store" });
      const data = (await res.json()) as SessionRes;
      if (data?.location?.name) setLocationName(data.location.name);
    } catch {}
  }

  async function refreshBalance(nextIdentityId?: string) {
    const id = (nextIdentityId ?? identityId ?? "").trim();
    if (!id) return;
    try {
      const res = await fetch(`/api/public/balance?location=${encodeURIComponent(location)}&identityId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = (await res.json()) as BalanceRes;
      if (data.ok) setBalance(Number(data.balance ?? 0));
    } catch {}
  }

  useEffect(() => { refreshSession(); }, [location]);
  useEffect(() => {
    try {
      const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
      const lsEmail = (localStorage.getItem("rr_email") || "").trim();
      const lsLocation = (localStorage.getItem("rr_location") || "").trim();
      if (lsIdentity) { setIdentityId(lsIdentity); setVerified(true); refreshBalance(lsIdentity); }
      if (lsEmail) setEmail(lsEmail);
      if (location && lsLocation !== location) localStorage.setItem("rr_location", String(location));
    } catch {}
  }, [location]);

  async function submit() {
    setMsg("");
    const cleanFrom = fromName.trim();
    const cleanBody = messageText.trim();
    if (!verified || !identityId || !email) return setMsg("Please verify first on the request screen before sending a shout-out.");
    if (!cleanFrom || !cleanBody) return setMsg("Please fill out your name and message.");
    if (!selectedProduct.enabled) return setMsg(selectedProduct.hasImage ? "Photo shout-outs are coming soon." : "That shout-out option is currently unavailable.");

    setBusy(true)

    try {
      const res = await fetch("/api/public/shoutouts/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, identityId, email, fromName: cleanFrom, messageText: cleanBody, productKey }),
      });
      const data = await res.json();
      if (!data.ok) return setMsg(data.error || "Something went wrong.");
      setMsg(`✅ ${selectedProduct.title} submitted for approval!`);
      setMessageText("");
      await refreshBalance();
    } catch {
      setMsg("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const charsUsed = messageText.length;
  const charsMax = 80;

  return (
    <div style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 28, fontWeight: 900 }}>Remix Shout-Outs</div>
        <div style={{ opacity: 0.8 }}>{locationName}</div>
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,0.16)", borderRadius: 16, padding: 16, marginBottom: 18 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Shared Points Balance: {balance}</div>
        {!verified ? (
          <div style={{ opacity: 0.85 }}>Verify on the request screen first to unlock shout-outs and spending.</div>
        ) : (
          <div style={{ opacity: 0.85 }}>Use the same points wallet from Remix Requests.</div>
        )}
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,0.16)", borderRadius: 16, padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 14 }}>Pick Your Shout-Out</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 18 }}>
          {SHOUTOUT_PRODUCTS.map((product) => {
            const selected = product.key === productKey;
            return (
              <button
                key={product.key}
                type="button"
                onClick={() => setProductKey(product.key)}
                style={{
                  textAlign: "left",
                  padding: 14,
                  borderRadius: 14,
                  border: selected ? "1px solid rgba(116,130,255,0.9)" : "1px solid rgba(255,255,255,0.12)",
                  background: selected ? "rgba(30,34,72,0.9)" : "rgba(255,255,255,0.03)",
                  opacity: product.enabled ? 1 : 0.72,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontWeight: 900, lineHeight: 1.2 }}>{product.title}</div>
                  <div style={{ fontWeight: 900 }}>{product.creditsCost}</div>
                </div>
                <div style={{ fontSize: 13, opacity: 0.82, marginTop: 6 }}>{product.description}</div>
                {!product.enabled ? <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, opacity: 0.9 }}>{product.comingSoon ? "COMING SOON" : "CURRENTLY UNAVAILABLE"}</div> : null}
              </button>
            );
          })}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>From</div>
          <input value={fromName} onChange={(e) => setFromName(e.target.value)} maxLength={24} placeholder="Your name" style={{ width: "100%", padding: 12, borderRadius: 12 }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Message</div>
          <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={charsMax} placeholder="Happy birthday Ava! Have the best skate night ever!" rows={5} style={{ width: "100%", padding: 12, borderRadius: 12, resize: "vertical" }} />
          <div style={{ marginTop: 6, opacity: 0.7 }}>{charsUsed}/{charsMax} characters</div>
        </div>

        <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}>
          <div style={{ fontWeight: 900 }}>{selectedProduct.title}</div>
          <div style={{ opacity: 0.85, marginTop: 4 }}>{selectedProduct.description}</div>
          <div style={{ opacity: 0.75, marginTop: 8 }}>Cost: <b>{selectedProduct.creditsCost}</b> points</div>
        </div>

        <div style={{ marginBottom: 14, opacity: 0.85 }}>This message will be reviewed before it appears on screen.</div>

        <button onClick={submit} disabled={busy || !selectedProduct.enabled || balance < selectedProduct.creditsCost} style={{ width: "100%", padding: 14, borderRadius: 14, fontWeight: 900, cursor: busy ? "default" : "pointer", opacity: busy || !selectedProduct.enabled || balance < selectedProduct.creditsCost ? 0.65 : 1 }}>
          {busy ? "Submitting..." : !selectedProduct.enabled ? "Photo shout-outs coming soon" : balance < selectedProduct.creditsCost ? `Not enough points (${selectedProduct.creditsCost} needed)` : `Send ${selectedProduct.title}`}
        </button>

        {msg ? <div style={{ marginTop: 14 }}>{msg}</div> : null}
      </div>
    </div>
  );
}
