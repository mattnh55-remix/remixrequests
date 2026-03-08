"use client";

import { useEffect, useState } from "react";

type BalanceRes = {
  ok: boolean;
  balance?: number;
  error?: string;
};

type SessionRes = {
  location?: { slug: string; name: string };
  session?: { id: string; endsAt: string };
};

export default function ShoutoutsPage({
  params,
}: {
  params: { location: string };
}) {
  const location = params.location;

  const [identityId, setIdentityId] = useState("");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);

  const [locationName, setLocationName] = useState("Remix");
  const [balance, setBalance] = useState(0);

  const [fromName, setFromName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [tier, setTier] = useState<"BASIC" | "FEATURED">("BASIC");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function refreshSession() {
    try {
      const res = await fetch(`/api/public/session/${location}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as SessionRes;
      if (data?.location?.name) setLocationName(data.location.name);
    } catch {}
  }

  async function refreshBalance(nextIdentityId?: string) {
    const id = (nextIdentityId ?? identityId ?? "").trim();
    if (!id) return;

    try {
      const res = await fetch(
        `/api/public/balance?location=${encodeURIComponent(location)}&identityId=${encodeURIComponent(id)}`,
        { cache: "no-store" }
      );
      const data = (await res.json()) as BalanceRes;
      if (data.ok) setBalance(Number(data.balance ?? 0));
    } catch {}
  }

  useEffect(() => {
    refreshSession();
  }, [location]);

  useEffect(() => {
    try {
      const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
      const lsEmail = (localStorage.getItem("rr_email") || "").trim();
      const lsLocation = (localStorage.getItem("rr_location") || "").trim();

      if (lsIdentity) {
        setIdentityId(lsIdentity);
        setVerified(true);
        refreshBalance(lsIdentity);
      }

      if (lsEmail) setEmail(lsEmail);

      if (location && lsLocation !== location) {
        localStorage.setItem("rr_location", String(location));
      }
    } catch {}
  }, [location]);

  async function submit() {
    setMsg("");

    const cleanFrom = fromName.trim();
    const cleanBody = messageText.trim();

    if (!verified || !identityId || !email) {
      setMsg("Please verify first on the request screen before sending a shout-out.");
      return;
    }

    if (!cleanFrom || !cleanBody) {
      setMsg("Please fill out your name and message.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/public/shoutouts/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location,
          identityId,
          email,
          fromName: cleanFrom,
          messageText: cleanBody,
          tier,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMsg(data.error || "Something went wrong.");
        return;
      }

      setMsg("✅ Shout-out submitted for approval!");
      setMessageText("");
      await refreshBalance();
    } catch {
      setMsg("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const tierCost = tier === "FEATURED" ? 6 : 3;
  const charsUsed = messageText.length;
  const charsMax = 80;

  return (
    <div style={{ padding: 18, maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 28, fontWeight: 900 }}>Remix Shout-Outs</div>
        <div style={{ opacity: 0.8 }}>{locationName}</div>
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 8 }}>
          Shared Points Balance: {balance}
        </div>
        {!verified ? (
          <div style={{ opacity: 0.85 }}>
            Verify on the request screen first to unlock shout-outs and spending.
          </div>
        ) : (
          <div style={{ opacity: 0.85 }}>
            Use the same points wallet from Remix Requests.
          </div>
        )}
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 14 }}>
          Send a Shout-Out
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Tier</div>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as "BASIC" | "FEATURED")}
            style={{ width: "100%", padding: 12, borderRadius: 12 }}
          >
            <option value="BASIC">Basic — 3 points</option>
            <option value="FEATURED">Featured — 6 points</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>From</div>
          <input
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            maxLength={24}
            placeholder="Your name"
            style={{ width: "100%", padding: 12, borderRadius: 12 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Message</div>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            maxLength={charsMax}
            placeholder="Happy birthday Ava! Have the best skate night ever!"
            rows={5}
            style={{ width: "100%", padding: 12, borderRadius: 12, resize: "vertical" }}
          />
          <div style={{ marginTop: 6, opacity: 0.7 }}>
            {charsUsed}/{charsMax} characters
          </div>
        </div>

        <div style={{ marginBottom: 14, opacity: 0.85 }}>
          This message will be reviewed before it appears on screen.
        </div>

        <button
          onClick={submit}
          disabled={busy || balance < tierCost}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 14,
            fontWeight: 900,
            cursor: busy ? "default" : "pointer",
            opacity: busy || balance < tierCost ? 0.65 : 1,
          }}
        >
          {busy
            ? "Submitting..."
            : balance < tierCost
            ? `Not enough points (${tierCost} needed)`
            : `Send ${tier === "FEATURED" ? "Featured" : "Basic"} Shout-Out`}
        </button>

        {msg ? <div style={{ marginTop: 14 }}>{msg}</div> : null}
      </div>
    </div>
  );
}