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

type PackageKey = "5_10" | "10_25" | "15_35" | "20_50";

type UiPack = {
  id: string;
  title: string;
  subtitle: string;
  creditsLabel: string;
  priceCents?: number;
  packageKey?: PackageKey;
  highlight?: boolean;
  badge?: string;
  cta?: string;
  href?: string;
};

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  fromName: string;
  setFromName: (value: string) => void;
  messageText: string;
  setMessageText: (value: string) => void;
  charsUsed: number;
  charsMax: number;
  selectedProduct: (typeof SHOUTOUT_PRODUCTS)[number];
  busy: boolean;
  canSend: boolean;
  canAfford: boolean;
  onSubmit: () => void;
  onGetPoints: () => void;
};

type BuyDrawerProps = {
  open: boolean;
  onClose: () => void;
  packs: UiPack[];
  buyUrl?: string | null;
  redeemBusy: boolean;
  onRedeem: (code: string) => void;
  onBuy: (packageKey: PackageKey) => void;
};

const BUY_URL_BY_LOCATION: Record<string, string> = {
  // remixrequests: "https://your-square-link"
};

export default function ShoutoutsPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [identityId, setIdentityId] = useState("");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [locationName, setLocationName] = useState("Remix");
  const [logoUrl, setLogoUrl] = useState("");
  const [rulesData, setRulesData] = useState<SessionRes | null>(null);
  const [balance, setBalance] = useState(0);

  const [fromName, setFromName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [productKey, setProductKey] = useState<ShoutoutProductKey>("TEXT_BASIC");

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [pendingComposerAfterBuy, setPendingComposerAfterBuy] = useState(false);
  const [sessionCountdown, setSessionCountdown] = useState("");

  const selectedProduct = useMemo(
    () => SHOUTOUT_PRODUCTS.find((p) => p.key === productKey) || SHOUTOUT_PRODUCTS[0],
    [productKey]
  );

  async function refreshSession() {
    try {
      const res = await fetch(`/api/public/session/${location}`, { cache: "no-store" });
      const data = (await res.json()) as SessionRes;
      setRulesData(data);
      if (data?.location?.name) setLocationName(data.location.name);
      if (data?.rules?.logoUrl) setLogoUrl(data.rules.logoUrl);
    } catch {
      // ignore
    }
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
    } catch {
      // ignore
    }
  }

  function persistPendingShoutoutResume(nextProductKey?: ShoutoutProductKey) {
    try {
      sessionStorage.setItem(
        "rr_shoutout_resume",
        JSON.stringify({
          location,
          productKey: nextProductKey ?? productKey,
          ts: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  }

  function clearPendingShoutoutResume() {
    try {
      sessionStorage.removeItem("rr_shoutout_resume");
    } catch {
      // ignore
    }
  }

  function openBuyForShoutout(nextProductKey?: ShoutoutProductKey) {
    persistPendingShoutoutResume(nextProductKey);
    setPendingComposerAfterBuy(true);
    setShowBuy(true);
  }

  useEffect(() => {
    void refreshSession();
  }, [location]);

  useEffect(() => {
    try {
      const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
      const lsEmail = (localStorage.getItem("rr_email") || "").trim();
      const lsLocation = (localStorage.getItem("rr_location") || "").trim();

      if (lsIdentity) {
        setIdentityId(lsIdentity);
        setVerified(true);
        void refreshBalance(lsIdentity);
      }

      if (lsEmail) setEmail(lsEmail);

      if (location && lsLocation !== location) {
        localStorage.setItem("rr_location", String(location));
      }
    } catch {
      // ignore
    }
  }, [location]);

  useEffect(() => {
    const tick = () => {
      const endsAt = rulesData?.session?.endsAt;
      if (!endsAt) {
        setSessionCountdown("");
        return;
      }
      const endMs = new Date(endsAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, endMs - now);
      if (diff <= 0) {
        setSessionCountdown("Session ended");
        return;
      }
      const totalMin = Math.floor(diff / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      if (h <= 0 && m <= 2) setSessionCountdown("Ending soon");
      else if (h <= 0) setSessionCountdown(`Ends in ${m}m`);
      else setSessionCountdown(`Ends in ${h}h ${m}m`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [rulesData?.session?.endsAt]);

  useEffect(() => {
    async function resumeAfterCheckout() {
      try {
        const raw = sessionStorage.getItem("rr_shoutout_resume");
        if (!raw) return;

        const parsed = JSON.parse(raw) as {
          location?: string;
          productKey?: ShoutoutProductKey;
          ts?: number;
        };

        if (!parsed || parsed.location !== location) return;

        const ageMs = Date.now() - Number(parsed.ts || 0);
        if (!Number.isFinite(ageMs) || ageMs > 1000 * 60 * 30) {
          clearPendingShoutoutResume();
          return;
        }

        if (parsed.productKey) {
          setProductKey(parsed.productKey);
        }

        const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
        if (lsIdentity) {
          await refreshBalance(lsIdentity);
        }

        setPendingComposerAfterBuy(true);
      } catch {
        // ignore
      }
    }

    void resumeAfterCheckout();
  }, [location]);

  useEffect(() => {
    if (!pendingComposerAfterBuy) return;
    if (!selectedProduct?.enabled) return;

    if (balance >= selectedProduct.creditsCost) {
      clearPendingShoutoutResume();
      setPendingComposerAfterBuy(false);
      setShowBuy(false);
      setShowComposer(true);
      setMsg("✅ Points added. Finish your shout-out.");
    }
  }, [pendingComposerAfterBuy, balance, selectedProduct]);

  async function redeem(codeInput?: string) {
    const code = String(codeInput || "").trim();
    if (!code) {
      setMsg("Enter a redemption code.");
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMsg("Enter a valid email first.");
      return;
    }

    if (!verified && !identityId) {
      setMsg("Please verify to redeem a code.");
      setShowVerify(true);
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
      const nextBalance = data?.balance ?? null;
      if (typeof nextBalance === "number") setBalance(nextBalance);
      else await refreshBalance();
    } catch {
      setMsg("Could not redeem code.");
    } finally {
      setRedeemBusy(false);
    }
  }

  async function startCheckout(packageKey: PackageKey) {
    if (!identityId) {
      setMsg("Please verify before buying points.");
      setShowVerify(true);
      return;
    }

    persistPendingShoutoutResume();

    try {
      const res = await fetch("/api/square/create-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location,
          identityId,
          packageKey,
          returnPath: `/shoutouts/${location}`,
        }),
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

  function handleCreateClick() {
    setMsg("");

    if (!verified || !identityId || !email) {
      setMsg("Claim your intro points to send a shout-out.");
      setShowVerify(true);
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

    clearPendingShoutoutResume();
    setShowComposer(true);
  }

  async function submit() {
    setMsg("");

    const cleanFrom = fromName.trim();
    const cleanBody = messageText.trim();

    if (!verified || !identityId || !email) {
      setMsg("Claim your intro points to send a shout-out.");
      setShowVerify(true);
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
  const hudBalance = !verified && !identityId ? 5 : balance;
  const creditsLabel = !verified && !identityId ? "Use Points!" : `Points: ${balance}`;

  const buyUrl = useMemo(() => {
    const fromMap = BUY_URL_BY_LOCATION[location];
    if (fromMap) return fromMap;

    const fromEnv = process.env.NEXT_PUBLIC_REMIXREQUESTS_BUY_URL;
    if (fromEnv) return fromEnv;

    return rulesData?.rules?.buyUrl ?? null;
  }, [location, rulesData]);

  const uiPacks: UiPack[] = useMemo(() => {
    const priceTier1 = Number(rulesData?.rules?.packTier1PriceCents ?? 500);
    const priceTier2 = Number(rulesData?.rules?.packTier2PriceCents ?? 1000);
    const priceTier3 = Number(rulesData?.rules?.packTier3PriceCents ?? 1500);
    const priceTier4 = Number(rulesData?.rules?.packTier4PriceCents ?? 2000);

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
  }, [rulesData, buyUrl]);

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
            <div className="neonSub">
              {locationName} • Send a message to the screen
              {sessionCountdown ? ` • ${sessionCountdown}` : ""}
            </div>
          </div>

          <div className="neonHeaderRight">
            <div className={`rrCornerHud ${verified && balance <= 2 ? "rrCornerHudLow" : ""}`}>
              <div className="rrCornerHudLabel">
                <span className="rrPointsDesktop">POINTS</span>
                <span className="rrPointsMobile">PTS</span>
              </div>
              <div className="rrCornerHudValue">
                <div className="rrCornerHudNumber">{hudBalance}</div>
              </div>
              <button
                className={`neonBtn neonBtnPrimary rrCornerHudBtn ${!verified ? "neonPulse" : ""}`}
                onClick={() => {
                  if (!verified || !identityId) {
                    setShowVerify(true);
                    return;
                  }
                  setShowBuy(true);
                }}
              >
                {!verified ? "USE" : "GET POINTS"}
              </button>
            </div>
          </div>
        </div>

        <div className="neonPanel" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>
            Shared Points Balance: {hudBalance}
          </div>

          {!verified ? (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              Claim your 5 intro points with email + SMS signup, then use them for shout-outs or buy more.
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

          <div className="neonGrid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
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
              : !verified
              ? `USE POINTS FOR ${selectedProduct.title}`
              : canAfford
              ? `Create ${selectedProduct.title}`
              : `GET POINTS FOR ${selectedProduct.title}`}
          </button>

          {msg ? <div style={{ marginTop: 14 }}>{msg}</div> : null}
        </div>

<VerifyModal
  open={showVerify}
  location={location}
  email={email}
  setEmail={setEmail}
  onRedeem={(code: string) => {
    void redeem(code);
  }}
  redeemBusy={redeemBusy}
  onVerified={(payload?: { balance?: number; note?: string; welcomeGranted?: boolean }) => {
    setVerified(true);
    setShowVerify(false);

    try {
      const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
      const lsEmail = (localStorage.getItem("rr_email") || "").trim();

      if (lsIdentity) setIdentityId(lsIdentity);
      if (lsEmail) setEmail(lsEmail);
      else if (email.trim()) localStorage.setItem("rr_email", email.trim());

      if (typeof payload?.balance === "number") {
        setBalance(payload.balance);
      } else if (lsIdentity) {
        void refreshBalance(lsIdentity);
      }
    } catch {
      // ignore
    }

    setMsg(payload?.note || "✅ Verified! Your intro points are ready.");
  }}
  onClose={() => setShowVerify(false)}
/>

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
          onClose={() => {
            setShowBuy(false);
            void refreshBalance();
          }}
          packs={uiPacks}
          buyUrl={buyUrl}
          redeemBusy={redeemBusy}
          onRedeem={(code: string) => {
            void redeem(code);
          }}
          onBuy={(packageKey: PackageKey) => {
            void startCheckout(packageKey);
          }}
        />

        <CreditHud
          verified={verified || !!identityId}
          creditsLabel={creditsLabel}
          sessionCountdown={sessionCountdown}
          onVerify={() => setShowVerify(true)}
          onBuy={() => setShowBuy(true)}
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
}: DrawerProps) {
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

function VerifyModal({ open, location, email, setEmail, onRedeem, redeemBusy, onVerified, onClose }: any) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"collect" | "code">("collect");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [redeemCode, setRedeemCode] = useState("");
  const [showRedeem, setShowRedeem] = useState(false);

  useEffect(() => {
    if (!open) {
      setCode("");
      setMsg("");
      setStep("collect");
    }
  }, [open]);

  if (!open) return null;

  async function sendCode() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/public/auth/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, email, phone, emailOptIn, smsOptIn }),
      });
      const data = await res.json();
      if (data.ok) setStep("code");
      else setMsg(data.error || "Error");
    } catch {
      setMsg("Error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/public/auth/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, email, code, emailOptIn, smsOptIn }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem("rr_identityId", data.identityId);
        if (email.trim()) localStorage.setItem("rr_email", email.trim());
        onVerified?.({
  balance: data.balance,
  note: data.note,
  welcomeGranted: data.welcomeGranted,
});
      } else {
        setMsg(data.error || "Invalid code");
      }
    } catch {
      setMsg("Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.8)" }}>
      <div className="neonPanel" style={{ padding: 20, width: 320 }}>
        <h3 style={{ marginTop: 0, marginBottom: 15 }}>Verify</h3>
        <div style={{ display: "grid", gap: 10 }}>
          <input className="neonInput" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input className="neonInput" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "rgba(255,255,255,0.9)" }}><input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} style={{ marginTop: 3 }} /><span>Yes — email deals & updates <span style={{ color: "var(--muted)" }}>(required for credits)</span></span></label>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "rgba(255,255,255,0.9)" }}><input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} style={{ marginTop: 3 }} /><span>Yes — text deals & updates <span style={{ color: "var(--muted)" }}>(recommended)</span></span></label>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 14 }}>Have a redemption code?</div>
            <div style={{ perspective: 1000 }}>
              <div style={{ position: "relative", height: 48, transformStyle: "preserve-3d", transition: "transform 0.6s cubic-bezier(.2,.8,.2,1)", transform: showRedeem ? "rotateY(180deg)" : "rotateY(0deg)", willChange: "transform" }}>
                <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "translateZ(0.1px)", display: "flex", alignItems: "center", WebkitFontSmoothing: "subpixel-antialiased" }}>
                  <button className="neonBtn" style={{ width: "100%", height: "100%", opacity: 0.8 }} onClick={() => setShowRedeem(true)}>Redeem Code</button>
                </div>
                <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0.1px)", display: "flex", gap: 8, alignItems: "center", WebkitFontSmoothing: "subpixel-antialiased" }}>
                  <input className="neonInput" placeholder="Code" value={redeemCode} onChange={(e) => setRedeemCode(e.target.value)} style={{ flex: 1, height: "100%" }} />
                  <button className="neonBtn neonBtnPrimary" disabled={!!redeemBusy} onClick={() => onRedeem?.(redeemCode)} style={{ height: "100%" }}>{redeemBusy ? "..." : "Apply"}</button>
                </div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", marginTop: 5 }}>We’ll text a one-time code. Standard rates may apply.</div>
          {step === "code" ? <input className="neonInput" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter 6-digit Code" style={{ border: "1px solid cyan", marginTop: 5 }} /> : null}
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <button className="neonBtn neonBtnPrimary" onClick={step === "collect" ? sendCode : confirmCode} style={{ width: "100%", height: 48 }}>{busy ? "..." : "Submit"}</button>
            <button className="neonBtn" onClick={onClose} style={{ width: "100%", opacity: 0.6 }}>Close</button>
          </div>
          {msg ? <p style={{ color: "#ff4444", fontSize: 12, textAlign: "center", margin: 0 }}>{msg}</p> : null}
        </div>
      </div>
    </div>
  );
}

function CreditHud({ verified, creditsLabel, sessionCountdown, onVerify, onBuy }: any) {
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, width: "100%", boxSizing: "border-box", padding: "10px 12px", background: "rgba(0,0,0,0.9)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>{creditsLabel}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{sessionCountdown}</div>
        </div>
        <button className="neonBtn neonBtnPrimary" onClick={!verified ? onVerify : onBuy} style={{ whiteSpace: "nowrap" }}>
          {!verified ? "CLAIM" : "ADD POINTS"}
        </button>
      </div>
    </div>
  );
}

function BuyCreditsDrawer({ open, onClose, packs, buyUrl, onRedeem, redeemBusy, onBuy }: BuyDrawerProps) {
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

        {packs.map((p) => (
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
                if (p.packageKey) {
                  onBuy(p.packageKey);
                  return;
                }
                if (p.href || buyUrl) {
                  window.location.href = p.href || buyUrl || "/";
                }
              }}
            >
              {`BUY • $${((p.priceCents ?? 0) / 100).toFixed(2)}`}
            </button>
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
                  disabled={redeemBusy}
                  onClick={() => {
                    onRedeem(redeemCode);
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
