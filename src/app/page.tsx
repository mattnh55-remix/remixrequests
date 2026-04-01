"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PublicTheme from "../components/ui/public/PublicTheme";
import confetti from "canvas-confetti";

const REMIX_LOGO_URL =
  "https://skateremix.com/wp-content/uploads/2026/03/Remix_Globe_Logo_350px.png";

type BonusChallengeConfig = {
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

function normalizeBonusChallenges(value: unknown): BonusChallengeConfig[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any, index: number) => ({
      key: String(item?.key || `challenge_${index + 1}`),
      title: String(item?.title || ""),
      linkUrl: item?.linkUrl ? String(item.linkUrl) : null,
      pointValue: Number(item?.pointValue ?? 10),
      ctaText: String(item?.ctaText || ""),
      buttonText: String(item?.buttonText || "Learn More"),
      modalMessage: item?.modalMessage ? String(item.modalMessage) : null,
      isActive: Boolean(item?.isActive ?? true),
      sortOrder: Number(item?.sortOrder ?? index + 1),
    }))
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getActiveBonusChallenge(rules: any): BonusChallengeConfig | null {
  if (!rules?.bonusChallengeEnabled) return null;

  const challenges = normalizeBonusChallenges(rules?.bonusChallenges);
  if (!challenges.length) return null;

  const mode = String(rules?.bonusChallengeRotationMode || "weekly");
  const overrideKey = String(rules?.bonusChallengeOverrideKey || "").trim();

  if (mode === "override" && overrideKey) {
    return challenges.find((c) => c.key === overrideKey) || challenges[0];
  }

  const now = new Date();

  if (mode === "daily") {
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const day = Math.floor(diff / 86400000);
    return challenges[day % challenges.length];
  }

  const week = getWeekNumber(now);
  return challenges[week % challenges.length];
}

export default function HomePage() {
  const router = useRouter();

  const [activeChallenge, setActiveChallenge] = useState<BonusChallengeConfig | null>(null);
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [challengeModalText, setChallengeModalText] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("rr_location")) {
      localStorage.setItem("rr_location", "remix");
    }

    confetti({
      particleCount: 80,
      spread: 70,
      startVelocity: 35,
      gravity: 0.9,
      origin: { x: 0.5, y: 0.4 },
      colors: ["#6ee7f9", "#d946ef", "#ffffff"],
    });

    const timer = window.setTimeout(() => {
      confetti({ particleCount: 40, spread: 50, origin: { x: 0.3, y: 0.5 } });
      confetti({ particleCount: 40, spread: 50, origin: { x: 0.7, y: 0.5 } });
    }, 120);

    const loadChallenge = async () => {
      try {
        const nextLocation =
          typeof window !== "undefined"
            ? localStorage.getItem("rr_location") || "remix"
            : "remix";

        const res = await fetch(`/api/public/rules/${encodeURIComponent(nextLocation)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        const rules = data?.rules || data || null;
        setActiveChallenge(getActiveBonusChallenge(rules));
      } catch {
        setActiveChallenge(null);
      }
    };

    void loadChallenge();

    return () => window.clearTimeout(timer);
  }, []);

  const location =
    typeof window !== "undefined"
      ? localStorage.getItem("rr_location") || "remix"
      : "remix";

  return (
    <PublicTheme>
      <div className="rrWelcomeRoot">
        <div className="rrOrb rrOrbA" />
        <div className="rrOrb rrOrbB" />
        <div className="rrOrb rrOrbC" />

        <div className="rrWelcome">
          <div className="rrWelcomeLogo">
            <img src={REMIX_LOGO_URL} alt="Remix" />
          </div>

          <div className="rrWelcomeHero">
            <div className="rrWelcomeTitle">CONTROL THE MUSIC</div>
            <div className="rrWelcomeSub">
              Request songs. Boost favorites. Earn bonus points.
            </div>
          </div>

          <div className="rrBonusCard">
            <div className="rrBonusBadge">THIS WEEK</div>

            <div className="rrBonusTitle">
              {activeChallenge?.title || "Leave a Google Review!"}
            </div>

            <div className="rrBonusPoints">
              +{activeChallenge?.pointValue ?? 10} POINTS
            </div>

            <div className="rrBonusSub">
              {activeChallenge?.ctaText ||
                "Show a staff member to receive your bonus card"}
            </div>

            <div className="rrBonusActions">
              <button
                className="rrBtn"
                onClick={() => {
                  if (activeChallenge?.linkUrl) {
                    window.open(activeChallenge.linkUrl, "_blank");
                    return;
                  }

                  const fallback =
                    activeChallenge?.modalMessage ||
                    activeChallenge?.ctaText ||
                    "Show a staff member to receive your bonus card.";

                  setChallengeModalText(fallback);
                  setChallengeModalOpen(true);
                }}
              >
                {activeChallenge?.buttonText || "Leave Review"}
              </button>
            </div>
          </div>

          <div className="rrHowRow">
            <div className="rrHowCard">
              <div className="rrHowTitle">CLAIM</div>
              <div className="rrHowSub">Get points</div>
            </div>

            <div className="rrHowCard">
              <div className="rrHowTitle">REQUEST</div>
              <div className="rrHowSub">Pick songs</div>
            </div>

            <div className="rrHowCard">
              <div className="rrHowTitle">BOOST</div>
              <div className="rrHowSub">Move them up</div>
            </div>
          </div>

          <button
            className="rrEnterBtn"
            onClick={() => router.push(`/request/${encodeURIComponent(location)}`)}
          >
            ENTER REMIX
          </button>

          {challengeModalOpen ? (
            <div className="rrOverlay" onClick={() => setChallengeModalOpen(false)}>
              <div className="rrDrawer" onClick={(e) => e.stopPropagation()}>
                <div className="rrDrawerHead">
                  <div>
                    <div className="rrDrawerTitle">Bonus Challenge</div>
                    <div className="rrDrawerSub">{challengeModalText}</div>
                  </div>
                  <button
                    className="rrBtnGhost rrCloseBtn"
                    onClick={() => setChallengeModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <style jsx>{`
          .rrWelcomeRoot {
            min-height: 100vh;
            position: relative;
            overflow: hidden;
            background:
              radial-gradient(circle at top left, rgba(0,247,255,0.18), transparent 28%),
              radial-gradient(circle at bottom right, rgba(255,57,212,0.18), transparent 32%),
              linear-gradient(180deg, #050816 0%, #060b18 50%, #05060c 100%);
          }

          .rrOrb {
            position: absolute;
            border-radius: 999px;
            filter: blur(60px);
            opacity: 0.45;
            pointer-events: none;
          }

          .rrOrbA {
            width: 340px;
            height: 340px;
            background: rgba(0,247,255,0.25);
            top: -80px;
            left: -60px;
          }

          .rrOrbB {
            width: 380px;
            height: 380px;
            background: rgba(255,57,212,0.22);
            right: -100px;
            top: 20vh;
          }

          .rrOrbC {
            width: 300px;
            height: 300px;
            background: rgba(120,160,255,0.22);
            left: 30%;
            bottom: -80px;
          }

          .rrWelcome {
            position: relative;
            z-index: 1;
            display: grid;
            gap: 16px;
            padding: 18px 10px 80px;
            text-align: center;
          }

          .rrWelcomeLogo img {
            width: 110px;
            margin: 10px auto;
            filter: drop-shadow(0 0 14px rgba(110,231,249,0.25));
          }

          .rrWelcomeTitle {
            font-size: 26px;
            font-weight: 1000;
          }

          .rrWelcomeSub {
            font-size: 13px;
            opacity: 0.7;
          }

          .rrBonusCard {
            padding: 16px;
            border-radius: 18px;
            border: 1px solid rgba(255,255,255,0.1);
            background:
              radial-gradient(circle at top, rgba(110,231,249,0.15), transparent 40%),
              linear-gradient(180deg, rgba(20,26,40,0.95), rgba(10,14,22,0.98));
            box-shadow:
              0 18px 40px rgba(0,0,0,0.6),
              0 0 25px rgba(0,247,255,0.18);
          }

          .rrBonusBadge {
            font-size: 10px;
            letter-spacing: 0.2em;
            opacity: 0.7;
          }

          .rrBonusTitle {
            font-size: 20px;
            font-weight: 900;
            margin-top: 8px;
          }

          .rrBonusPoints {
            color: #6ee7f9;
            font-weight: 1000;
            margin-top: 6px;
          }

          .rrBonusSub {
            margin-top: 8px;
            font-size: 12px;
            opacity: 0.8;
          }

          .rrBonusActions {
            display: grid;
            gap: 8px;
            margin-top: 12px;
          }

          .rrHowRow {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }

          .rrHowCard {
            padding: 10px;
            border-radius: 12px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
          }

          .rrHowTitle {
            font-size: 11px;
            font-weight: 1000;
            letter-spacing: 0.1em;
          }

          .rrHowSub {
            margin-top: 4px;
            font-size: 11px;
            opacity: 0.75;
          }

          .rrEnterBtn {
            padding: 14px;
            border-radius: 14px;
            font-weight: 1000;
            background: linear-gradient(180deg, #4d8fe4, #2f6fc6);
            border: none;
            color: white;
            box-shadow: 0 12px 28px rgba(32,83,155,0.35);
          }
        `}</style>
      </div>
    </PublicTheme>
  );
}