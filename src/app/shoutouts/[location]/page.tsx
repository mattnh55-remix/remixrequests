// src/app/shoutouts/[location]/page.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import PublicTheme from "../../../components/ui/public/PublicTheme";
import { SHOUTOUT_PRODUCTS, type ShoutoutProductKey } from "@/lib/shoutoutProducts";

const REMIX_LOGO_URL =
  "https://skateremix.com/wp-content/uploads/2026/03/Remix_Globe_Logo_350px.png";

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
  photoFile: File | null;
  setPhotoFile: (file: File | null) => void;
  photoPreviewUrl: string;
  setPhotoPreviewUrl: (value: string) => void;
  usageRightsAccepted: boolean;
  setUsageRightsAccepted: (value: boolean) => void;
  photoPreviewUnsupported: boolean;
  setPhotoPreviewUnsupported: (value: boolean) => void;
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

type VerifyDrawerProps = {
  open: boolean;
  location: string;
  email: string;
  setEmail: (value: string) => void;
  onRedeem: (code: string) => void;
  redeemBusy: boolean;
  onVerified?: (payload?: { balance?: number; note?: string; welcomeGranted?: boolean }) => void;
  onClose: () => void;
};

type SubmitRes = {
  ok: boolean;
  error?: string;
  balance?: number;
  credits?: { balance?: number };
  session?: { balance?: number };
  note?: string;
};

type UploadPhotoRes = {
  ok: boolean;
  error?: string;
  balance?: number;
  previewUrl?: string | null;
  note?: string;
};

type RewardFlash = {
  key: number;
  title: string;
  subtitle?: string;
  kicker?: string;
};

const BUY_URL_BY_LOCATION: Record<string, string> = {
  // remixrequests: "https://your-square-link"
};

const PHOTO_ACCEPT = "image/jpeg,image/png,image/heic,image/heif";

function getProductBadge(product: (typeof SHOUTOUT_PRODUCTS)[number]) {
  if (product.creditsCost === 18 && !product.hasImage) return "Best Value";
  if (product.hasImage && product.creditsCost === 18) return "Big Moment";
  if (product.creditsCost === 8 && !product.hasImage) return "Popular";
  if (product.hasImage && product.creditsCost === 6) return "Photo";
  return "";
}

function getProductMinutes(product: (typeof SHOUTOUT_PRODUCTS)[number]) {
  const title = `${product.title} ${product.description}`.toLowerCase();
  if (title.includes("60")) return "60 mins";
  if (title.includes("20")) return "20 mins";
  return "5 mins";
}

function formatMoney(cents?: number) {
  return `$${((Number(cents ?? 0) || 0) / 100).toFixed(2)}`;
}

function BrandLogo({ logoUrl }: { logoUrl?: string | null }) {
  const src = (logoUrl || REMIX_LOGO_URL || "").trim();

  if (src) {
    return (
      <div className="rrBrandLogo">
        <img src={src} alt="Remix logo" />
      </div>
    );
  }

  return <div className="rrBrandBadge">REMIX</div>;
}

export default function ShoutoutsPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [sessionActive, setSessionActive] = useState(true);
  const [identityId, setIdentityId] = useState("");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [locationName, setLocationName] = useState("Remix");
  const [logoUrl, setLogoUrl] = useState("");
  const [rulesData, setRulesData] = useState<SessionRes | null>(null);
  const [balance, setBalance] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [fromName, setFromName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [productKey, setProductKey] = useState<ShoutoutProductKey>("TEXT_BASIC");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoPreviewUnsupported, setPhotoPreviewUnsupported] = useState(false);
  const [usageRightsAccepted, setUsageRightsAccepted] = useState(false);
  const [rewardFlash, setRewardFlash] = useState<RewardFlash | null>(null);

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [pendingComposerAfterBuy, setPendingComposerAfterBuy] = useState(false);
  const [sessionCountdown, setSessionCountdown] = useState("");
  const [pressedProductKey, setPressedProductKey] = useState<ShoutoutProductKey | null>(null);
  const [holdToast, setHoldToast] = useState(false);

  const openTimerRef = useRef<number | null>(null);
  const rewardFlashTimerRef = useRef<number | null>(null);

  const selectedProduct = useMemo(
    () => SHOUTOUT_PRODUCTS.find((p) => p.key === productKey) || SHOUTOUT_PRODUCTS[0],
    [productKey]
  );

  const canUseSelectedProduct = selectedProduct.enabled || selectedProduct.hasImage;

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
      if (data.ok) {
        const nextBalance = Number(data.balance ?? 0);
        setBalance(nextBalance);

        if (nextBalance <= 0) {
          setSessionActive(false);
          setVerified(false);
          setIdentityId("");
        } else {
          setSessionActive(true);
        }
      }
    } catch {
      // ignore
    }
  }

  function fireConfetti() {
    confetti({
      particleCount: 70,
      spread: 72,
      startVelocity: 30,
      origin: { y: 0.58 },
      colors: ["#00e5ff", "#ff3d9a", "#ffffff"],
      scalar: 0.9,
    });

    window.setTimeout(() => {
      confetti({
        particleCount: 34,
        spread: 58,
        startVelocity: 22,
        origin: { y: 0.62 },
        colors: ["#00e5ff", "#ff3d9a"],
        scalar: 0.8,
      });
    }, 120);
  }

  function showRewardFlash(title: string, subtitle?: string, kicker = "NICE") {
    setRewardFlash({
      key: Date.now(),
      title,
      subtitle,
      kicker,
    });

    if (rewardFlashTimerRef.current != null) {
      window.clearTimeout(rewardFlashTimerRef.current);
    }

    rewardFlashTimerRef.current = window.setTimeout(() => {
      setRewardFlash(null);
    }, 1800);
  }

  function celebratePointsAward(points?: number | null, subtitle?: string) {
    const value = Number(points ?? 0);
    fireConfetti();
    showRewardFlash(
      value > 0 ? `+${value} POINTS` : "POINTS ADDED",
      subtitle || "Ready to make it big on screen",
      "JACKPOT"
    );
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

  function resetComposerMedia() {
    setPhotoFile(null);
    setPhotoPreviewUrl("");
    setPhotoPreviewUnsupported(false);
    setUsageRightsAccepted(false);
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
    return () => {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
      if (rewardFlashTimerRef.current) window.clearTimeout(rewardFlashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
      const lsEmail = (localStorage.getItem("rr_email") || "").trim();
      const lsLocation = (localStorage.getItem("rr_location") || "").trim();

      if (lsIdentity) {
        setIdentityId(lsIdentity);
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
        const beforeBalance = balance;

        if (lsIdentity) {
          await refreshBalance(lsIdentity);
        }

        setPendingComposerAfterBuy(true);

        if (lsIdentity) {
          const res = await fetch(
            `/api/public/balance?location=${encodeURIComponent(location)}&identityId=${encodeURIComponent(lsIdentity)}`,
            { cache: "no-store" }
          );
          const data = (await res.json()) as BalanceRes;
          if (data.ok) {
            const nextBalance = Number(data.balance ?? 0);
            setBalance(nextBalance);
            if (nextBalance > beforeBalance) {
              setShowBuy(false);
              celebratePointsAward(nextBalance - beforeBalance, "Points loaded for your shout-out");
              setMsg("Points added. Finish your shout-out.");
            }
          }
        }
      } catch {
        // ignore
      }
    }

    void resumeAfterCheckout();
    // intentionally on mount/location
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  useEffect(() => {
    if (!msg) {
      setToastVisible(false);
      return;
    }

    setToastVisible(true);

    if (holdToast) return;

    const id = window.setTimeout(() => setToastVisible(false), 3200);
    return () => window.clearTimeout(id);
  }, [msg, holdToast]);

  useEffect(() => {
    if (!pendingComposerAfterBuy) return;
    if (!canUseSelectedProduct) return;

    if (balance >= selectedProduct.creditsCost) {
      clearPendingShoutoutResume();
      setPendingComposerAfterBuy(false);
      setShowBuy(false);
      setShowComposer(true);
      setMsg("Points added. Finish your shout-out.");
    }
  }, [pendingComposerAfterBuy, balance, selectedProduct, canUseSelectedProduct]);

  useEffect(() => {
    if (!selectedProduct.hasImage) {
      resetComposerMedia();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct.hasImage]);

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

      const pointsAdded = Number(data.pointsAdded ?? 0);

      setShowVerify(false);
      setShowBuy(false);
      celebratePointsAward(pointsAdded, "Code redeemed successfully");
      setMsg(pointsAdded > 0 ? `Redeemed +${pointsAdded} points!` : "Code redeemed successfully.");

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

  function handleProductClick(nextProductKey: ShoutoutProductKey) {
    const nextProduct =
      SHOUTOUT_PRODUCTS.find((p) => p.key === nextProductKey) || SHOUTOUT_PRODUCTS[0];

    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
    }

    setPressedProductKey(nextProductKey);
    setProductKey(nextProductKey);
    setMsg("");

    openTimerRef.current = window.setTimeout(() => {
      setPressedProductKey(null);

      if (!sessionActive || !verified || !identityId || !email) {
        setMsg("Claim your intro points to send a shout-out.");
        setShowVerify(true);
        return;
      }

      if (!nextProduct.enabled && !nextProduct.hasImage) {
        setMsg("That shout-out option is currently unavailable.");
        return;
      }

      if (balance < nextProduct.creditsCost) {
        setMsg(`You need ${nextProduct.creditsCost} points for this shout-out.`);
        openBuyForShoutout(nextProductKey);
        return;
      }

      clearPendingShoutoutResume();
      setShowComposer(true);
    }, 120);
  }

  async function submit() {
    setMsg("");

    const cleanFrom = fromName.trim();
    const cleanBody = messageText.trim();

    if (!sessionActive || !verified || !identityId || !email) {
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

    if (!canUseSelectedProduct) {
      setMsg("That shout-out option is currently unavailable.");
      return;
    }

    setBusy(true);
    try {
      if (selectedProduct.hasImage) {
        if (!photoFile) {
          setMsg("Please choose a photo.");
          return;
        }

        if (!usageRightsAccepted) {
          setMsg("Please confirm you have permission to upload this photo.");
          return;
        }

        const form = new FormData();
        form.append("location", location);
        form.append("identityId", identityId);
        form.append("email", email);
        form.append("fromName", cleanFrom);
        form.append("messageText", cleanBody);
        form.append("productKey", productKey);
        form.append("usageRightsAccepted", usageRightsAccepted ? "true" : "false");
        form.append("file", photoFile);

        const res = await fetch("/api/public/shoutouts/upload-photo", {
          method: "POST",
          body: form,
        });

        const data = (await res.json()) as UploadPhotoRes;
        if (!data.ok) {
          setMsg(data.error || "Photo upload failed.");
          return;
        }

        setMsg(data.note || `✅ ${selectedProduct.title} submitted for approval!`);
        setMessageText("");
        setFromName("");
        resetComposerMedia();
        setShowComposer(false);

        if (typeof data.balance === "number") setBalance(data.balance);
        else await refreshBalance();

        return;
      }

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

      const data = (await res.json()) as SubmitRes;
      if (!data.ok) {
        setMsg(
          data.error || "This message can’t be submitted as written. Please revise and try again."
        );
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
      setMsg(
        selectedProduct.hasImage
          ? "Photo upload failed."
          : "This message can’t be submitted as written. Please revise and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  const charsUsed = messageText.length;
  const charsMax = 80;
  const canAfford = balance >= selectedProduct.creditsCost;
  const canSend =
    canUseSelectedProduct &&
    canAfford &&
    !busy &&
    (!selectedProduct.hasImage || (!!photoFile && usageRightsAccepted));
  const heroBalance = !sessionActive ? 5 : !verified && !identityId ? 5 : balance;

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
        subtitle: "Perfect for 1–2 shout-outs",
        creditsLabel: "10 points",
        badge: "Fast",
        cta: "Get Points",
        href: buyUrl ?? undefined,
        priceCents: priceTier1,
        packageKey: "5_10",
      },
      {
        id: "tier2",
        title: "Party Pack",
        subtitle: "The sweet spot for groups",
        creditsLabel: "25 points",
        highlight: true,
        badge: "Featured",
        cta: "Lock In",
        href: buyUrl ?? undefined,
        priceCents: priceTier2,
        packageKey: "10_25",
      },
      {
        id: "tier3",
        title: "Bonus Pack",
        subtitle: "More messages. More moments.",
        creditsLabel: "35 points",
        badge: "Hot Deal",
        cta: "Level Up",
        href: buyUrl ?? undefined,
        priceCents: priceTier3,
        packageKey: "15_35",
      },
      {
        id: "tier4",
        title: "All Night",
        subtitle: "Best value for a busy session",
        creditsLabel: "50 points",
        badge: "Best Value",
        cta: "Go Big",
        href: buyUrl ?? undefined,
        priceCents: priceTier4,
        packageKey: "20_50",
      },
    ];
  }, [rulesData, buyUrl]);

  return (
    <PublicTheme>
      <div className="rrHeroGrid">
        <div className="rrLogoCard">
          <BrandLogo logoUrl={logoUrl} />
        </div>

        <div className="rrHeroCard">
          <h1 className="rrTitle">Shout-Outs</h1>
          <div className="rrTitleSub">Get your message up on the big screen!</div>
        </div>

        <div className="rrPointsCard">
          <div className="rrPointsStack">
            <div className="rrHudLabel">Points</div>
            <div className="rrHudValue">{heroBalance}</div>
            <div className="rrPointsActions">
              <button
                className="rrBtn"
                style={{ width: "100%" }}
                onClick={() => {
                  if (!sessionActive || !verified || !identityId) {
                    setShowVerify(true);
                    return;
                  }
                  setShowBuy(true);
                }}
              >
                {sessionActive && verified && identityId ? "Add Points" : "Claim Points"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rrPanel">
        <div className="rrPanelHead rrPanelHead--centered">
          <div>
            <div className="rrPanelTitle">Pick Your Shout-Out</div>
            <div className="rrPanelSub">Choose a format, then add your message!</div>
          </div>
        </div>

        <div className="rrPanelBody">
          <div className="rrProductGrid">
            {SHOUTOUT_PRODUCTS.map((product) => {
              const selected = product.key === productKey;
              const pressed = product.key === pressedProductKey;
              const canUseProduct = product.enabled || product.hasImage;
              const badge = getProductBadge(product);
              const minutes = getProductMinutes(product);
              const badgeClass =
                badge === "Best Value"
                  ? "rrShoutCardBadge--value"
                  : badge === "Popular"
                    ? "rrShoutCardBadge--popular"
                    : badge === "Photo" || product.hasImage
                      ? "rrShoutCardBadge--photo"
                      : "";

              return (
                <button
                  key={product.key}
                  type="button"
                  onClick={() => handleProductClick(product.key)}
                  className={[
                    "rrShoutCard",
                    selected ? "rrShoutCard--selected" : "",
                    pressed ? "rrShoutCard--pressed" : "",
                    !canUseProduct ? "rrShoutCard--disabled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="rrShoutCardTop">
                    {badge ? (
                      <span
                        className={[
                          "rrShoutCardBadge",
                          badgeClass,
                          selected ? "rrShoutCardBadge--featured" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {badge}
                      </span>
                    ) : (
                      <span className="rrShoutCardBadge">Shout-Out</span>
                    )}

                    {product.hasImage ? (
                      <span className="rrShoutPhotoChip">
                        <span className="rrShoutPhotoIcon">+</span>
                        Photo
                      </span>
                    ) : null}
                  </div>

                  <div className="rrShoutCardCopy">
                    <div className="rrShoutCardTitle">{product.title}</div>
                    <div className="rrShoutCardDesc">{product.description}</div>
                  </div>

                  <div className="rrShoutCardMeta">
                    <span className="rrMetaPill">{minutes}</span>
                    <span className="rrMetaPill rrMetaPill--points">{product.creditsCost}pts</span>
                    {!canUseProduct ? (
                      <span className="rrStatusPill rrStatusPill--warn">
                        {product.comingSoon ? "Coming Soon" : "Unavailable"}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rrPanel">
        <div className="rrPanelHead rrPanelHead--centered">
          <div>
            <div className="rrPanelTitle">How It Works</div>
            <div className="rrPanelSub">
              Choose your shout out, submit details and send to the booth for approval!
            </div>
          </div>
        </div>
      </div>

      <div className="rrFooterBar">
        <div className="rrFooterInner">
          <button
            className="rrBtn rrFooterCta"
            onClick={() => {
              if (!sessionActive || !verified || !identityId) {
                setShowVerify(true);
                return;
              }
              setShowComposer(true);
            }}
          >
            {!verified || !identityId ? "Claim Points to Send" : `Use ${selectedProduct.creditsCost}pts for ${selectedProduct.title}`}
          </button>

          <button
            className="rrBtnGhost"
            onClick={() => {
              if (!sessionActive || !verified || !identityId) {
                setShowVerify(true);
                return;
              }
              setShowBuy(true);
            }}
          >
            Add Points
          </button>
        </div>
      </div>

      {toastVisible && msg ? (
        <div
          className="rrToast"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 140,
            display: "grid",
            placeItems: "center",
            padding: "16px",
            background: "rgba(2, 5, 10, 0.38)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="rrToastInner"
            style={{
              width: "min(460px, calc(100vw - 24px))",
              gridTemplateColumns: "1fr",
              justifyItems: "center",
              textAlign: "center",
              padding: "14px 14px 12px",
              gap: "10px",
              borderRadius: "16px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.48)",
            }}
          >
            <div className="rrToastText" style={{ fontSize: "14px", lineHeight: 1.4 }}>
              {msg}
            </div>

            <button
              className="rrBtnGhost"
              onClick={() => {
                setMsg("");
                setToastVisible(false);
                setHoldToast(false);
              }}
              style={{ minWidth: "110px" }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {rewardFlash ? (
        <div
          key={rewardFlash.key}
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 160,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              minWidth: 260,
              maxWidth: "min(92vw, 380px)",
              borderRadius: 26,
              padding: "22px 24px",
              textAlign: "center",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              background:
                "radial-gradient(circle at top, rgba(21,146,162,0.30), rgba(13,18,28,0.97) 54%), linear-gradient(135deg, rgba(52,62,84,0.96), rgba(16,21,31,0.98))",
              boxShadow:
                "0 22px 70px rgba(0,0,0,0.52), 0 0 38px rgba(21,146,162,0.16), inset 0 1px 0 rgba(255,255,255,0.08)",
              animation: "rrRewardPop 1800ms ease forwards",
            }}
          >
            <div style={{ fontSize: 13, letterSpacing: "0.24em", opacity: 0.7, fontWeight: 900 }}>
              {rewardFlash.kicker || "NICE"}
            </div>
            <div style={{ fontSize: 34, fontWeight: 1000, lineHeight: 1, marginTop: 8 }}>
              {rewardFlash.title}
            </div>
            {rewardFlash.subtitle ? (
              <div style={{ marginTop: 10, fontSize: 14, opacity: 0.88 }}>
                {rewardFlash.subtitle}
              </div>
            ) : null}
            <div
              style={{
                width: 110,
                height: 3,
                margin: "14px auto 0",
                borderRadius: 999,
                background: "linear-gradient(90deg, rgba(255,61,154,0.15), rgba(255,255,255,0.85), rgba(0,229,255,0.18))",
              }}
            />
          </div>

          <style jsx>{`
            @keyframes rrRewardPop {
              0% {
                transform: scale(0.82) translateY(14px);
                opacity: 0;
              }
              12% {
                transform: scale(1.04) translateY(0);
                opacity: 1;
              }
              82% {
                transform: scale(1) translateY(0);
                opacity: 1;
              }
              100% {
                transform: scale(0.96) translateY(-10px);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      ) : null}

      <VerifyDrawer
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

          if (payload?.welcomeGranted || Number(payload?.balance ?? 0) > 0) {
            celebratePointsAward(payload?.balance ?? 5, payload?.note || "Your intro points are ready");
          }

          setMsg(payload?.note || "✅ Verified! Your intro points are ready.");
        }}
        onClose={() => setShowVerify(false)}
      />

      <ShoutoutComposerDrawer
        open={showComposer}
        onClose={() => {
          setShowComposer(false);
          if (!selectedProduct.hasImage) return;
          resetComposerMedia();
        }}
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
        photoFile={photoFile}
        setPhotoFile={setPhotoFile}
        photoPreviewUrl={photoPreviewUrl}
        setPhotoPreviewUrl={setPhotoPreviewUrl}
        photoPreviewUnsupported={photoPreviewUnsupported}
        setPhotoPreviewUnsupported={setPhotoPreviewUnsupported}
        usageRightsAccepted={usageRightsAccepted}
        setUsageRightsAccepted={setUsageRightsAccepted}
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
    </PublicTheme>
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
  photoFile,
  setPhotoFile,
  photoPreviewUrl,
  setPhotoPreviewUrl,
  usageRightsAccepted,
  setUsageRightsAccepted,
  photoPreviewUnsupported,
  setPhotoPreviewUnsupported,
}: DrawerProps) {
  if (!open) return null;

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] || null;
    setPhotoFile(nextFile);

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl("");
    }

    setPhotoPreviewUnsupported(false);

    if (!nextFile) return;

    const lowerName = String(nextFile.name || "").toLowerCase();
    const lowerType = String(nextFile.type || "").toLowerCase();

    const isHeicLike =
      lowerType.includes("heic") ||
      lowerType.includes("heif") ||
      lowerName.endsWith(".heic") ||
      lowerName.endsWith(".heif");

    if (isHeicLike) {
      setPhotoPreviewUnsupported(true);
      return;
    }

    setPhotoPreviewUrl(URL.createObjectURL(nextFile));
  }

  return (
    <div className="rrOverlay">
      <div className="rrDrawer">
        <div className="rrDrawerHead">
          <div>
            <div className="rrDrawerTitle">{selectedProduct.title}</div>
            <div className="rrDrawerSub">Add your message, then send it in for approval.</div>
          </div>
          <button className="rrBtnGhost rrCloseBtn" onClick={onClose}>Close</button>
        </div>

        <div className="rrDrawerBody" style={{ maxHeight: "78vh", overflowY: "auto" }}>
          <div className="rrStack">
            <div className="rrField">
              <div className="rrFieldLabel">From</div>
              <input
                className="rrInput"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                maxLength={24}
                placeholder="Your name"
              />
            </div>

            <div className="rrField">
              <div className="rrFieldMetaRow">
                <div className="rrFieldLabel">Message</div>
                <div className="rrFieldMetaText">{charsUsed}/{charsMax}</div>
              </div>
              <textarea
                className="rrTextarea"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                maxLength={charsMax}
                placeholder="Happy birthday Ava! Have the best skate night ever!"
                rows={4}
              />
            </div>

            {selectedProduct.hasImage ? (
              <div className="rrField">
                <div className="rrFieldLabel">Photo</div>

                <label className="rrUploadBox">
                  <input type="file" accept={PHOTO_ACCEPT} onChange={handlePhotoChange} />
                  <div className="rrHelper">Upload JPG, PNG, HEIC, or HEIF.</div>
                </label>

                {photoPreviewUrl ? (
                  <div className="rrUploadPreview">
                    <img src={photoPreviewUrl} alt="Selected upload preview" />
                    <div className="rrHelper">
                      Preview only — your full photo will be reviewed before it appears on screen.
                    </div>
                  </div>
                ) : photoPreviewUnsupported && photoFile ? (
                  <div className="rrMessage">
                    Selected file: <strong>{photoFile.name}</strong>
                    <div className="rrHelper" style={{ marginTop: 4 }}>
                      Preview is not available for this image type on this device, but the upload can still succeed.
                    </div>
                  </div>
                ) : null}

                <label className="rrCheckRow">
                  <input
                    type="checkbox"
                    checked={usageRightsAccepted}
                    onChange={(e) => setUsageRightsAccepted(e.target.checked)}
                  />
                  <span>I have permission to upload and display this photo on the screen.</span>
                </label>
              </div>
            ) : null}

            <div className="rrShoutComposerSummary">
              <div className="rrPackTitle">{selectedProduct.title}</div>
              <div className="rrHelper">{selectedProduct.description}</div>
              <div className="rrShoutCardMeta">
                <span className="rrMetaPill">{selectedProduct.creditsCost}pts</span>
                <span className="rrMetaPill">{getProductMinutes(selectedProduct)}</span>
              </div>
            </div>

            <div className="rrActionStack">
              {canAfford ? (
                <button className="rrBtn rrBtn--full" onClick={onSubmit} disabled={!canSend}>
                  {busy ? "Submitting..." : "Send Shout-Out"}
                </button>
              ) : (
                <button className="rrBtn rrBtn--full" onClick={onGetPoints}>
                  Get {selectedProduct.creditsCost} Points
                </button>
              )}

              <button className="rrBtnGhost rrBtn--full" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyDrawer({
  open,
  location,
  email,
  setEmail,
  onRedeem,
  redeemBusy,
  onVerified,
  onClose,
}: VerifyDrawerProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"collect" | "code">("collect");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [redeemCode, setRedeemCode] = useState("");

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
    <div className="rrOverlay" style={{ alignItems: "center" }}>
      <div className="rrDrawer" style={{ borderRadius: 16, width: "min(560px, calc(100vw - 12px))" }}>
        <div className="rrDrawerHead">
          <div>
            <div className="rrDrawerTitle">Claim Intro Points</div>
            <div className="rrDrawerSub">Verify once to unlock points, redemptions, and faster sending.</div>
          </div>
          <button className="rrBtnGhost rrCloseBtn" onClick={onClose}>Close</button>
        </div>

        <div className="rrDrawerBody">
          <div className="rrStack">
            <input className="rrInput" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input className="rrInput" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />

            <label className="rrCheckRow">
              <input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} />
              <span>Yes — email deals & updates <span className="rrHelper">(required for points)</span></span>
            </label>

            <label className="rrCheckRow">
              <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} />
              <span>Yes — text deals & updates <span className="rrHelper">(recommended)</span></span>
            </label>

            <div className="rrDivider" />

            <div className="rrStack">
              <div className="rrFieldLabel">Have a redemption code?</div>
              <div className="rrInlineForm">
                <input
                  className="rrInput"
                  placeholder="Code"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                />
                <button
                  className="rrBtn"
                  disabled={redeemBusy}
                  onClick={() => onRedeem?.(redeemCode)}
                >
                  {redeemBusy ? "..." : "Apply"}
                </button>
              </div>
            </div>

            <div className="rrHelper">We’ll text a one-time code. Standard messaging rates may apply.</div>

            {step === "code" ? (
              <input
                className="rrInput"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
              />
            ) : null}

            <div className="rrActionStack">
              <button className="rrBtn rrBtn--full" onClick={step === "collect" ? sendCode : confirmCode}>
                {busy ? "Working..." : step === "collect" ? "Send Code" : "Verify & Claim"}
              </button>
              <button className="rrBtnGhost rrBtn--full" onClick={onClose}>Close</button>
            </div>

            {msg ? <div className="rrMessage">{msg}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function BuyCreditsDrawer({ open, onClose, packs, buyUrl, onRedeem, redeemBusy, onBuy }: BuyDrawerProps) {
  const [redeemCode, setRedeemCode] = useState("");

  if (!open) return null;

  return (
    <div className="rrOverlay">
      <div className="rrDrawer rrDrawer--buy">
        <div className="rrDrawerHead rrDrawerHead--buy">
          <div>
            <div className="rrDrawerTitle">Get More Points</div>
            <div className="rrDrawerSub">More points means more control, more speed, and more attention on screen.</div>
          </div>
          <button className="rrBtnGhost rrCloseBtn" onClick={onClose}>Close</button>
        </div>

        <div className="rrDrawerBody">
          <div className="rrBuyLead">
            <div className="rrBuyLeadTitle">Make your message stand out</div>
            <div className="rrBuyLeadText">
              Load up once, then use points for shout-outs without stopping to check out every time.
            </div>
          </div>

          <div className="rrBuyPackGrid">
            {packs.map((p) => (
              <div key={p.id} className={`rrBuyPackCard ${p.highlight ? "rrBuyPackCard--featured" : ""}`}>
                <div className="rrBuyPackTop">
                  <div className="rrBuyPackTitleRow">
                    <div className="rrBuyPackTitle">{p.title}</div>
                    {p.badge ? (
                      <span className={`rrStatusPill ${p.highlight ? "rrBuyPackBadge--featured" : ""}`}>{p.badge}</span>
                    ) : null}
                  </div>
                  <div className="rrBuyPackSubtitle">{p.subtitle}</div>
                </div>

                <div className="rrBuyPackValueRow">
                  <div>
                    <div className="rrBuyPackPoints">{p.creditsLabel}</div>
                    <div className="rrBuyPackUsage">Use them for shout-outs, requests, and boosts.</div>
                  </div>
                  <div className="rrBuyPackPrice">{formatMoney(p.priceCents)}</div>
                </div>

                <button
                  className={`rrBtn rrBtn--full ${p.highlight ? "rrBtn--featuredPack" : ""}`}
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
                  {p.cta || "Get Points"}
                </button>
              </div>
            ))}
          </div>

          <div className="rrDivider" />

          <div className="rrStack">
            <div className="rrFieldLabel">Redeem a code</div>
            <div className="rrInlineForm">
              <input
                className="rrInput"
                placeholder="Code"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
              />
              <button
                className="rrBtn"
                disabled={redeemBusy}
                onClick={() => {
                  onRedeem(redeemCode);
                  setRedeemCode("");
                }}
              >
                {redeemBusy ? "..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
