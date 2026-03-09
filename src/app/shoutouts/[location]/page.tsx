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
  const [showComposer, setShowComposer] = useState(false);

  const selectedProduct = useMemo(
    () => SHOUTOUT_PRODUCTS.find((p) => p.key === productKey) || SHOUTOUT_PRODUCTS[0],
    [productKey]
  );

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

    if (!selectedProduct.enabled) {
      setMsg(
        selectedProduct.hasImage
          ? "Photo shout-outs are coming soon."
          : "That shout-out option is currently unavailable."
      );
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
          productKey,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMsg(data.error || "Something went wrong.");
        return;
      }

      setMsg(`✅ ${selectedProduct.title} submitted for approval!`);
      setMessageText("");
      setFromName("");
      setShowComposer(false);
      await refreshBalance();
    } catch {
      setMsg("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const charsUsed = messageText.length;
  const charsMax = 80;
  const canAfford = balance >= selectedProduct.creditsCost;
  const canSend = selectedProduct.enabled && canAfford && !busy;

  return (
    <div className="neonRoot">
      <div className="rrWall" />

      <div className="neonWrap" style={{ paddingBottom: 110 }}>
        <div className="neonHeader neonHeader3">
          <div className="neonHeaderLeft">
            <div className="neonLogoFallback">REMIX</div>
          </div>

          <div className="neonHeaderCenter">
            <div className="neonTitle">REMIX SHOUT-OUTS</div>
            <div className="neonSub">{locationName} • Send a message to the screen</div>
          </div>

          <div className="neonHeaderRight">
            <div
              className={`rrCornerHud ${
                verified && balance <= 2 ? "rrCornerHudLow" : ""
              }`}
            >
              <div className="rrCornerHudLabel">
                <span className="rrPointsDesktop">POINTS</span>
                <span className="rrPointsMobile">PTS</span>
              </div>
              <div className="rrCornerHudValue">
                <div className="rrCornerHudNumber">{verified ? balance : 0}</div>
              </div>
              <button
                className={`neonBtn neonBtnPrimary rrCornerHudBtn ${
                  !verified ? "neonPulse" : ""
                }`}
                onClick={() => {
                  window.location.href = `/request/${location}`;
                }}
              >
                {!verified ? "VERIFY" : "GET POINTS"}
              </button>
            </div>
          </div>
        </div>

        <div
          className="neonPanel"
          style={{ padding: 14, marginBottom: 12 }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>
            Shared Points Balance: {verified ? balance : 0}
          </div>

          {!verified ? (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              Verify on the request screen first to unlock shout-outs and spending.
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              Use the same shared points wallet from Remix Requests.
            </div>
          )}
        </div>

        <div className="neonPanel" style={{ padding: 12 }}>
          <div style={{ fontWeight: 1000, letterSpacing: 0.4, marginBottom: 12 }}>
            Pick Your Shout-Out
          </div>

          <div
            className="neonGrid"
            style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
          >
            {SHOUTOUT_PRODUCTS.map((product) => {
              const selected = product.key === productKey;

              return (
                <button
                  key={product.key}
                  type="button"
                  onClick={() => setProductKey(product.key)}
                  className="neonTile"
                  style={{
                    textAlign: "left",
                    border: selected
                      ? "1px solid rgba(0,247,255,0.40)"
                      : undefined,
                    boxShadow: selected
                      ? "0 0 18px rgba(0,247,255,0.20), 0 10px 30px rgba(0,0,0,0.40)"
                      : undefined,
                    opacity: product.enabled ? 1 : 0.72,
                  }}
                >
                  <div className="neonTileBody">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <div className="neonTileTitle">{product.title}</div>
                      <span className="neonBadge">{product.creditsCost}pt</span>
                    </div>

                    <div className="neonTileMeta">{product.description}</div>

                    {!product.enabled ? (
                      <div className="neonBadgeRow">
                        <span className="neonBadge">
                          {product.comingSoon ? "COMING SOON" : "UNAVAILABLE"}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ fontWeight: 900 }}>{selectedProduct.title}</div>
            <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
              {selectedProduct.description}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
              Cost: <b>{selectedProduct.creditsCost}</b> points
            </div>
            <div style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>
              All messages are reviewed before appearing on screen.
            </div>
          </div>

          <button
            className="neonBtn neonBtnPrimary"
            style={{ width: "100%", marginTop: 14 }}
            onClick={() => setShowComposer(true)}
            disabled={!selectedProduct.enabled}
          >
            {!selectedProduct.enabled
              ? "Photo shout-outs coming soon"
              : `Create ${selectedProduct.title}`}
          </button>

          {msg ? <div style={{ marginTop: 14 }}>{msg}</div> : null}
        </div>

        <ShoutoutComposerDrawer
          open={showComposer}
          onClose={() => setShowComposer(false)}
          fromName={fromName}
          setFromName={setFromName}
          messageText={messageText}
          setMessageText={setMessageText}
          charsUsed={charsUsed}
          charsMax={charsMax}
          selectedProduct={selectedProduct}
          busy={busy}
          canSend={canSend}
          canAfford={canAfford}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}

function ShoutoutComposerDrawer({
  open,
  onClose,
  fromName,
  setFromName,
  messageText,
  setMessageText,
  charsUsed,
  charsMax,
  selectedProduct,
  busy,
  canSend,
  canAfford,
  onSubmit,
}: any) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        className="neonPanel"
        style={{
          width: "100%",
          padding: 20,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 14 }}>{selectedProduct.title}</h3>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>From</div>
            <input
              className="neonInput"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              maxLength={24}
              placeholder="Your name"
            />
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Message</div>
            <textarea
              className="neonInput"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              maxLength={charsMax}
              placeholder="Happy birthday Ava! Have the best skate night ever!"
              rows={5}
              style={{ resize: "vertical" }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
              {charsUsed}/{charsMax} characters
            </div>
          </div>

          <div
            style={{
              marginTop: 2,
              paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div
              style={{
                padding: 12,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontWeight: 900 }}>{selectedProduct.title}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                {selectedProduct.description}
              </div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                Cost: <b>{selectedProduct.creditsCost}</b> points
              </div>
            </div>
          </div>

          <button
            className="neonBtn neonBtnPrimary"
            style={{ width: "100%", height: 48 }}
            onClick={onSubmit}
            disabled={!canSend}
          >
            {busy
              ? "Submitting..."
              : !selectedProduct.enabled
              ? "Photo shout-outs coming soon"
              : !canAfford
              ? `Not enough points (${selectedProduct.creditsCost} needed)`
              : `Send ${selectedProduct.title}`}
          </button>

          <button
            className="neonBtn"
            onClick={onClose}
            style={{ width: "100%", opacity: 0.5 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}