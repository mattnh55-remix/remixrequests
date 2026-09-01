"use client";

import { useMemo, useState } from "react";

export type PointsPack = {
  id?: string;
  title: string;
  creditsLabel: string;
  badge?: string;
  highlight?: boolean;
  cta?: string;
  priceCents?: number;
  packageKey?: string;
  href?: string;
};

type Challenge = {
  key: string;
  title: string;
  linkUrl?: string | null;
  pointValue: number;
  ctaText: string;
  buttonText: string;
  modalMessage?: string | null;
  isActive: boolean;
  sortOrder: number;
};

type ChallengeRules = {
  bonusChallengeEnabled?: boolean;
  bonusChallengeRotationMode?: string | null;
  bonusChallengeOverrideKey?: string | null;
  bonusChallenges?: unknown;
};

function activeChallenge(rules?: ChallengeRules | null): Challenge | null {
  if (!rules?.bonusChallengeEnabled || !Array.isArray(rules.bonusChallenges)) return null;
  const choices = rules.bonusChallenges
    .map((value: any, index: number): Challenge => ({
      key: String(value?.key || `challenge_${index + 1}`),
      title: String(value?.title || ""),
      linkUrl: value?.linkUrl ? String(value.linkUrl) : null,
      pointValue: Number(value?.pointValue ?? 10),
      ctaText: String(value?.ctaText || "Show a team member to receive your point card."),
      buttonText: String(value?.buttonText || "How to earn points"),
      modalMessage: value?.modalMessage ? String(value.modalMessage) : null,
      isActive: Boolean(value?.isActive),
      sortOrder: Number(value?.sortOrder ?? index + 1),
    }))
    .filter((value) => value.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (!choices.length) return null;

  const mode = String(rules.bonusChallengeRotationMode || "weekly");
  const override = String(rules.bonusChallengeOverrideKey || "").trim();
  if (mode === "override" && override) return choices.find((value) => value.key === override) || choices[0];

  const now = new Date();
  if (mode === "random_daily") {
    const seed = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}:${choices.map((value) => value.key).join("|")}`;
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    return choices[hash % choices.length];
  }
  if (mode === "daily") {
    const start = new Date(now.getFullYear(), 0, 0);
    return choices[Math.floor((now.getTime() - start.getTime()) / 86400000) % choices.length];
  }
  const start = new Date(Date.UTC(now.getFullYear(), 0, 1));
  return choices[Math.floor((now.getTime() - start.getTime()) / (7 * 86400000)) % choices.length];
}

export default function PointsPurchaseDrawer({
  open, onClose, packs, challengeRules, busy = false, redeemBusy, redeemCode: controlledCode,
  availablePoints, setRedeemCode, onBuy, onRedeem,
}: {
  open: boolean; onClose: () => void; packs: PointsPack[]; challengeRules?: ChallengeRules | null;
  busy?: boolean; redeemBusy: boolean; redeemCode?: string; availablePoints?: number; setRedeemCode?: (value: string) => void;
  onBuy: (packageKey?: string, href?: string) => void; onRedeem: (code: string) => void;
}) {
  const [showRedeem, setShowRedeem] = useState(false);
  const [localCode, setLocalCode] = useState("");
  const [earnOpen, setEarnOpen] = useState(false);
  const challenge = useMemo(() => activeChallenge(challengeRules), [challengeRules]);
  const code = controlledCode ?? localCode;
  const changeCode = setRedeemCode ?? setLocalCode;
  if (!open) return null;

  const earnCopy = challenge?.modalMessage || challenge?.ctaText || "Show a Remix team member to receive your point card.";
  const balanceCopy = typeof availablePoints === "number"
    ? `You have ${availablePoints} point${availablePoints === 1 ? "" : "s"}. Earn, buy, or redeem points to keep your request moving.`
    : "Earn, buy, or redeem points to keep your request moving.";
  return <div className="rrOverlay" onClick={onClose}>
    <div className="rrDrawer rrDrawer--buy" onClick={(event) => event.stopPropagation()}>
      <div className="rrDrawerHead rrDrawerHead--buy"><div><div className="rrDrawerTitle">REMIX POINTS</div><div className="rrDrawerSub">{balanceCopy}</div></div><button className="rrBtnGhost rrCloseBtn" onClick={onClose}>Close</button></div>
      <div className="rrDrawerBody">
        {challenge ? <div className="rrBuyLead rrBuyLead--earn"><div className="rrBuyEarnIcon" aria-hidden="true">+{challenge.pointValue}</div><div className="rrBuyEarnCopy"><div className="rrBuyLeadTitle">Earn {challenge.pointValue} points free.</div><div className="rrBuyLeadText">{challenge.title}</div></div><button className="rrBtn rrBtn--earn" onClick={() => setEarnOpen((value) => !value)}>{earnOpen ? "Hide details" : `Earn ${challenge.pointValue} Points Free!`}</button>{earnOpen ? <div className="rrBuyEarnDetails">{earnCopy}</div> : null}</div> : null}
        <div className="rrDivider" />
        <div className="rrBuyLead"><div className="rrBuyLeadTitle">Or get points instantly.</div><div className="rrBuyLeadText">Use them for requests, boosts, votes, and shout-outs.</div></div>
        <div className="rrBuyPackGrid">{packs.map((pack) => <div key={pack.packageKey || pack.href || pack.id || pack.title} className={`rrBuyPackCard ${pack.highlight ? "rrBuyPackCard--featured" : ""}`}><div className="rrBuyPackTitleRow"><div className="rrBuyPackTitle">{pack.title}</div>{pack.badge ? <span className="rrMetaPill">{pack.badge}</span> : null}</div><div className="rrBuyPackValueRow rrBuyPackValueRow--compact"><div className="rrBuyPackPoints">{pack.creditsLabel}</div><div className="rrBuyPackPrice rrBuyPackPrice--compact">${(Number(pack.priceCents || 0) / 100).toFixed(2)}</div></div><button className={`rrBtn ${pack.highlight ? "rrBtn--featuredPack" : ""}`} disabled={busy} onClick={() => onBuy(pack.packageKey, pack.href)}>{busy ? "Opening..." : pack.cta || `Get ${pack.creditsLabel}`}</button></div>)}</div>
        <div className="rrDivider" />
        {!showRedeem ? <button className="rrBtnGhost" onClick={() => setShowRedeem(true)}>I have a Remix point card</button> : <div className="rrStack"><div className="rrDrawerTitle rrDrawerTitle--small">Enter point card code</div><div className="rrInlineForm"><input className="rrInput" value={code} onChange={(event) => changeCode(event.target.value)} placeholder="Enter code" /><button className="rrBtnGhost" disabled={redeemBusy} onClick={() => onRedeem(code)}>{redeemBusy ? "Checking..." : "Redeem"}</button></div></div>}
      </div>
    </div>
  </div>;
}
