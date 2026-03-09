"use client";

import { useEffect, useMemo, useState } from "react";
import { SHOUTOUT_PRODUCTS, type ShoutoutProductKey } from "@/lib/shoutoutProducts";

type BalanceRes = { ok: boolean; balance?: number; error?: string };
type SessionRes = {
  location?: { slug: string; name: string };
  session?: { id: string; endsAt: string };
  rules?: {
    logoUrl?: string | null;
    buyUrl?: string | null;
    packTier1PriceCents?: number | null;
    packTier2PriceCents?: number | null;
    packTier3PriceCents?: number | null;
    packTier4PriceCents?: number | null;
  };
};

type UiPack = {
  id: string;
  title: string;
  subtitle: string;
  creditsLabel: string;
  priceCents?: number;
  packageKey?: "5_10" | "10_25" | "15_35" | "20_50";
  highlight?: boolean;
  badge?: string;
  cta?: string;
  href?: string;
};

const BUY_URL_BY_LOCATION: Record<string, string> = {
  // remixrequests: "https://your-checkout-link",
};

export default function ShoutoutsPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [identityId, setIdentityId] = useState("");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [locationName, setLocationName] = useState("Remix");
  const [logoUrl, setLogoUrl] = useState("");
  const [rules, setRules] = useState<SessionRes | null>(null);
  const [balance, setBalance] = useState(0);

  const [fromName, setFromName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [productKey, setProductKey] = useState<ShoutoutProductKey>("TEXT_BASIC");

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [pendingComposerAfterBuy, setPendingComposerAfterBuy] = useState(false);

  const selectedProduct = useMemo(
    () => SHOUTOUT_PRODUCTS.find((p) => p.key === productKey) || SHOUTOUT_PRODUCTS[0],
    [productKey]
  );

  async function refreshSession() {
    try {
      const res = await fetch(`/api/public/session/${location}`, { cache: "no-store" });
      const data = (await res.json()) as SessionRes;
      setRules(data);
      if (data?.location?.name) setLocationName(data.location.name);
      if (data?.rules?.logoUrl) setLogoUrl(data.rules.logoUrl);
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

  useEffect(() => {
    if (!showBuy && pendingComposerAfterBuy && selectedProduct.enabled && balance >= selectedProduct.creditsCost) {
      setPendingComposerAfterBuy(false);
      setShowComposer(true);
    }
  }, [showBuy, pendingComposerAfterBuy, balance, selectedProduct]);

  async function redeem(codeInput?: string) {
    const code = String(codeInput ?? redeemCode ?? "").trim();
    if (!code) {
      setMsg("Enter a redemption code.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMsg("Enter a valid email first.");
      return;
    }
    if (!verified && !identityId) {
      setMsg("Please verify first on the request screen before redeeming points.");
      return;
    }

    setRedeemBusy(true);
    try {
      const res = await fetch(`/api/public/redeem/${location}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!data.ok) {
        setMsg(data.error || "Could not redeem code.");
        return;
      }

      setMsg(`✅ Redeemed +${data.pointsAdded ?? ""} points!`);
      setRedeemCode("");

      const nextBalance = data?.balance ?? null;
      if (typeof nextBalance === "number") setBalance(nextBalance);
      else await refreshBalance();
    } catch {
      setMsg("Could not redeem code.");
    } finally {
      setRedeemBusy(false);
    }
  }

  async function startCheckout(packageKey: "5_10" | "10_25" | "15_35" | "20_50") {
    if (!identityId) {
      setMsg("Please verify before buying points.");
      window.location.href = `/request/${location}`;
      return;
    }

    try {
      const res = await fetch("/api/square/create-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, identityId, packageKey }),
      });

      const data = await res.json();

      if (!data?.ok || !data?.checkoutUrl) {
        setMsg(data?.error || "Could not start checkout.");
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setMsg("Could not start checkout.");
    }
  }

  function openBuyForShoutout() {
    setPendingComposerAfterBuy(true);
    setShowBuy(true);
  }

  function handleCreateClick() {
    setMsg("");

    if (!verified || !identityId || !email) {
      setMsg("Please verify first on the request screen before sending a shout-out.");
      window.location.href = `/request/${location}`;
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

    if (balance < selectedProduct.creditsCost) {
      setMsg(`You need ${selectedProduct.creditsCost} points for this shout-out.`);
      openBuyForShoutout();
      return;
    }

    setShowComposer(true);
  }

  async function submit() {
    setMsg("");

    const cleanFrom = fromName.trim();
    const cleanBody = messageText.trim();

    if (!verified || !identityId || !email) {
      setMsg("Please verify first on the request screen before sending a shout-out.");
      return;
    }

    if (balance < selectedProduct.creditsCost) {
      setMsg(`You need ${selectedProduct.creditsCost} points for this shout-out.`);
      setShowComposer(false);
      openBuyForShoutout();
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

      const nextBalance = data?.balance ?? data?.credits?.balance ?? data?.session?.balance ?? null;
      if (typeof nextBalance === "number") setBalance(nextBalance);
      else await refreshBalance();
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

  const buyUrl = useMemo(() => {
    const qp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const fromQuery = qp?.get("buy");
    if (fromQuery) return fromQuery;
    const fromMap = BUY_URL_BY_LOCATION[location];
    if (fromMap) return fromMap;
    const fromEnv = process.env.NEXT_PUBLIC_REMIXREQUESTS_BUY_URL;
    if (fromEnv) return fromEnv;
    return rules?.rules?.buyUrl ?? null;
  }, [location, rules]);

  const uiPacks: UiPack[] = useMemo(() => {
    const priceTier1 = Number(rules?.rules?.packTier1PriceCents ?? 500);
    const priceTier2 = Number(rules?.rules?.packTier2PriceCents ?? 1000);
    const priceTier3 = Number(rules?.rules?.packTier3PriceCents ?? 1500);
    const priceTier4 = Number(rules?.rules?.packTier4PriceCents ?? 2000);

    return [
      {
        id: "tier1",
        title: "Quick Boost",
        subtitle: "Perfect for 1–2 songs",
        creditsLabel: "10 credits",
        badge: "Fast",
        cta: "Get Points",
        href: buyUrl ?? undefined,
        priceCents: priceTier1,
        packageKey: "5_10",
      },
      {
        id: "tier2",
        title: "Party Pack",
        subtitle: "Best for groups",
        creditsLabel: "25 credits",
        highlight: true,
        badge: "Most Popular",
        cta: "Get Points",
        href: buyUrl ?? undefined,
        priceCents: priceTier2,
        packageKey: "10_25",
      },
      {
        id: "tier3",
        title: "Bonus Pack",
        subtitle: "More songs, more fun",
        creditsLabel: "35 credits",
        badge: "Hot Deal",
        cta: "Get Points",
        href: buyUrl ?? undefined,
        priceCents: priceTier3,
        packageKey: "15_35",
      },
      {
        id: "tier4",
        title: "All Night",
        subtitle: "Skate like a legend",
        creditsLabel: "50 credits",
        badge: "Best Value",
        cta: "Get Points",
        href: buyUrl ?? undefined,
        priceCents: priceTier4,
        packageKey: "20_50",
      },
    ];
  }, [rules, buyUrl]);

  return (
    <div className="neonRoot">
      <div className="rrWall" />

      <div className="neonWrap" style={{ paddingBottom: 110 }}>
        <div className="neonHeader neonHeader3">
          <div className="neonHeaderLeft">
            {logoUrl ? (
              <img className="neonLogo" src={logoUrl} alt={`${locationName} logo`} />
            ) : (
              <div className="neonLogoFallback">REMIX</div>
            )}
          </div>

          <div className="neonHeaderCenter">
            <div className="neonTitle">REMIX SHOUT-OUTS</div>
            <div className="neonSub">{locationName} • Send a message to the screen</div>
          </div>

          <div className="neonHeaderRight">
            <div className={`rrCornerHud ${verified && balance <= 2 ? "rrCornerHudLow" : ""}`}>
              <div className="rrCornerHudLabel">
                <span className="rrPointsDesktop">POINTS</span>
                <span className="rrPointsMobile">PTS</span>
              </div>
              <div className="rrCornerHudValue">
                <div className="rrCornerHudNumber">{verified ? balance : 0}</div>
              </div>
              <button
                className={`neonBtn neonBtnPrimary rrCornerHudBtn ${!verified ? "neonPulse" : ""}`}
                onClick={() => {
                  if (!verified || !identityId) {
                    window.location.href = `/request/${location}`;
                    return;
                  }
                  setShowBuy(true);
                }}
              >
                {!verified ? "VERIFY" : "GET POINTS"}
              </button>
            </div>
          </div>
        </div>

        <div className="neonPanel" style={{ padding: 14, marginBottom: 12 }}>
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
                    border: selected ? "1px solid rgba(0,247,255,0.40)" : undefined,
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
                      <div className="neonTileTitle" style={{ color: "#ffffff" }}>
                        {product.title}
                      </div>
                      <span className="neonBadge">{product.creditsCost}pt</span>
                    </div>

                    <div className="neonTileMeta">{product.description}</div>

                    <div className="neonBadgeRow" style={{ marginTop: 2, flexWrap: "wrap" }}>
                      {product.creditsCost === 12 ? (
                        <>
                          <span className="neonBadge neonBadgeHot">POPULAR</span>
                          <span className="neonBadge neonBadgeHot">HOT</span>
                        </>
                      ) : null}

                      {product.creditsCost === 25 ? (
                        <span className="neonBadge neonBadgeHot">BEST VALUE</span>
                      ) : null}

                      {!product.enabled ? (
                        <span className="neonBadge">
                          {product.comingSoon ? "COMING SOON" : "UNAVAILABLE"}
                        </span>
                      ) : null}
                    </div>
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
            onClick={handleCreateClick}
            disabled={!selectedProduct.enabled}
          >
            {!selectedProduct.enabled
              ? "Photo shout-outs coming soon"
              : canAfford
              ? `Create ${selectedProduct.title}`
              : `GET POINTS FOR ${selectedProduct.title}`}
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
          onGetPoints={() => {
            setShowComposer(false);
            openBuyForShoutout();
          }}
        />

        <BuyCreditsDrawer
          open={showBuy}
          onClose={async () => {
            setShowBuy(false);
            await refreshBalance();
          }}
          packs={uiPacks}
          buyUrl={buyUrl}
          redeemBusy={redeemBusy}
          onRedeem={(code: string) => redeem(code)}
          onBuy={(packageKey: "5_10" | "10_25" | "15_35" | "20_50") => startCheckout(packageKey)}
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
  onGetPoints,
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

          {canAfford ? (
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
                : `Send ${selectedProduct.title}`}
            </button>
          ) : (
            <button
              className="neonBtn neonBtnPrimary"
              style={{ width: "100%", height: 48 }}
              onClick={onGetPoints}
            >
              GET POINTS
            </button>
          )}

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

function BuyCreditsDrawer({ open, onClose, packs, buyUrl, onRedeem, redeemBusy, onBuy }: any) {
  const [redeemCode, setRedeemCode] = useState("");
  const [showRedeem, setShowRedeem] = useState(false);
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
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
        <h3 style={{ marginTop: 0 }}>Get Points</h3>

        {packs.map((p: any) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "12px 0",
              gap: 12,
            }}
          >
            <div style={{ display: "grid" }}>
              <span style={{ fontWeight: 800 }}>{p.title}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.creditsLabel}</span>
            </div>
            <button
              className="neonBtn neonBtnPrimary"
              onClick={() => {
                if (p.packageKey) return onBuy?.(p.packageKey);
                if (p.href || buyUrl) window.location.href = p.href || buyUrl;
              }}
            >{`BUY • $${((p.priceCents ?? 0) / 100).toFixed(2)}`}</button>
          </div>
        ))}

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ perspective: 1000 }}>
            <div
              style={{
                position: "relative",
                height: 48,
                transformStyle: "preserve-3d",
                transition: "transform 0.4s cubic-bezier(.2,.8,.2,1)",
                transform: showRedeem ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  transform: "translateZ(1px)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <button
                  className="neonBtn neonBtnPrimary"
                  style={{ width: "100%", height: "100%" }}
                  onClick={() => setShowRedeem(true)}
                >
                  Redeem Code
                </button>
              </div>

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg) translateZ(1px)",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <input
                  className="neonInput"
                  placeholder="Code"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  style={{ flex: 1, height: "100%" }}
                />
                <button
                  className="neonBtn neonBtnPrimary"
                  disabled={!!redeemBusy}
                  onClick={() => {
                    onRedeem?.(redeemCode);
                    setRedeemCode("");
                  }}
                  style={{ whiteSpace: "nowrap", height: "100%" }}
                >
                  {redeemBusy ? "..." : "Apply"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          className="neonBtn"
          onClick={onClose}
          style={{ width: "100%", marginTop: 16, opacity: 0.5 }}
        >
          Close
        </button>
      </div>
    </div>
  );
}