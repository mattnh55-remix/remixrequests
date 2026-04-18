"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

type FeaturedSong = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string | null;
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

function decorativeStats(song: FeaturedSong) {
  const seed = `${song.id}-${song.title}-${song.artist}`;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const up = (hash % 7) + 1;
  const down = hash % 3;
  const fire = (hash % 5) + 1;

  return { up, down, fire };
}

export default function HomePage() {
  const router = useRouter();
  const params = useParams<{ location: string }>();
  const location = params.location ?? "";

  const [activeChallenge, setActiveChallenge] = useState<BonusChallengeConfig | null>(null);
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [challengeModalText, setChallengeModalText] = useState("");
  const [featuredSongs, setFeaturedSongs] = useState<FeaturedSong[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && location) {
      localStorage.setItem("rr_location", location);
    }
  }, [location]);

  useEffect(() => {
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

    const loadPageData = async () => {
      try {
        if (!location) {
          console.warn("No location param found, skipping loadPageData");
          return;
        }

        const [sessionRes, featuredRes] = await Promise.all([
          fetch(`/api/public/session/${encodeURIComponent(location)}`, {
            cache: "no-store",
          }),
          fetch(`/api/public/featured-songs/${encodeURIComponent(location)}`, {
            cache: "no-store",
          }),
        ]);

        const sessionData = await sessionRes.json();
        const rules = sessionData?.rules || null;
        setActiveChallenge(getActiveBonusChallenge(rules));

        const featuredData = await featuredRes.json();
        setFeaturedSongs(Array.isArray(featuredData?.items) ? featuredData.items : []);
      } catch {
        setActiveChallenge(null);
        setFeaturedSongs([]);
      }
    };

    void loadPageData();

    return () => window.clearTimeout(timer);
  }, [location]);

  const openChallenge = () => {
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
  };

  const featuredRows = useMemo(
    () =>
      featuredSongs.map((song) => ({
        ...song,
        stats: decorativeStats(song),
      })),
    [featuredSongs]
  );

  return (
    <PublicTheme>
      <div className="rrWelcomeRoot">
        <div className="rrClubPulse rrClubPulseA" />
        <div className="rrClubPulse rrClubPulseB" />
        <div className="rrClubPulse rrClubPulseC" />

        <div className="rrLightBeam rrLightBeamLeft" />
        <div className="rrLightBeam rrLightBeamRight" />
        <div className="rrLightBeam rrLightBeamTop" />

        <div className="rrOrb rrOrbA" />
        <div className="rrOrb rrOrbB" />
        <div className="rrOrb rrOrbC" />
        <div className="rrGridGlow" />
        <div className="rrEdgeGlow" />
        <div className="rrVignette" />

        <div className="rrWelcome">
          <div className="rrTopStage">
            <div className="rrTopShine" />

            <div className="rrWelcomeLogo">
              <img src={REMIX_LOGO_URL} alt="Remix" />
            </div>

            <div className="rrWelcomeHero">
              <div className="rrWelcomeTitle">CONTROL THE MUSIC</div>
              <div className="rrWelcomeSub">
                Request songs. Boost favorites. Earn bonus points.
              </div>
            </div>

            <div className="rrHowRow">
              <div className="rrHowCard">
                <div className="rrHowIcon">🎁</div>
                <div className="rrHowTitle">CLAIM</div>
                <div className="rrHowSub">Get points</div>
              </div>

              <div className="rrHowCard">
                <div className="rrHowIcon">🎵</div>
                <div className="rrHowTitle">REQUEST</div>
                <div className="rrHowSub">Pick songs</div>
              </div>

              <div className="rrHowCard">
                <div className="rrHowIcon">🚀</div>
                <div className="rrHowTitle">BOOST</div>
                <div className="rrHowSub">Move them up</div>
              </div>
            </div>

            <button
              className="rrEnterBtn"
              onClick={() => window.location.href = "https://remixrequests.vercel.app/request/remixrequests"}>
              <span className="rrEnterBtnGlow" />
              <span className="rrEnterBtnText">ENTER REMIX SPOT</span>
              <span className="rrEnterBtnArrow">→</span>
            </button>
          </div>

          <button className="rrBonusCard rrBonusClickable" onClick={openChallenge}>
            <div className="rrBonusEmboss" />
            <div className="rrBonusBadge">THIS WEEK&apos;S OFFER</div>

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
              <span className="rrBtn">{activeChallenge?.buttonText || "Leave Review"}</span>
            </div>
          </button>

          <div className="rrFeaturedCard">
            <div className="rrFeaturedBadge">FEATURED REQUESTS</div>

            <div className="rrFeaturedList">
              {featuredRows.length > 0 ? (
                featuredRows.map((song) => (
                  <div
                    key={song.id}
                    className="rrFeaturedRow"
                    onClick={() => window.location.href = "https://remixrequests.vercel.app/request/remixrequests"}>
                    <div className="rrFeaturedArtWrap">
                      <img
                        src={song.artworkUrl || REMIX_LOGO_URL}
                        alt={`${song.title} artwork`}
                        className="rrFeaturedArt"
                      />
                    </div>

                    <div className="rrFeaturedText">
                      <div className="rrFeaturedTitle">{song.title}</div>
                      <div className="rrFeaturedArtist">{song.artist}</div>

                      <div className="rrFeaturedMeta">
                        <span>👍 {song.stats.up}</span>
                        <span>👎 {song.stats.down}</span>
                        <span>🔥 {song.stats.fire}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rrFeaturedEmpty">Featured songs coming soon.</div>
              )}
            </div>

            <button
              className="rrViewMoreBtn"
              onClick={() => window.location.href = "https://remixrequests.vercel.app/request/remixrequests"}
            >
              VIEW MORE
            </button>
          </div>

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
              radial-gradient(circle at 50% 38%, rgba(12, 18, 35, 0.55) 0%, rgba(7, 10, 20, 0.78) 32%, rgba(4, 6, 14, 0.96) 62%, #03040a 100%);
          }

          .rrGridGlow {
            position: absolute;
            inset: 0;
            background:
              linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
            background-size: 34px 34px;
            mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent 95%);
            pointer-events: none;
            opacity: 0.28;
          }

          .rrEdgeGlow {
            position: absolute;
            inset: -8%;
            pointer-events: none;
            background:
              radial-gradient(circle at 0% 20%, rgba(0, 247, 255, 0.16), transparent 22%),
              radial-gradient(circle at 100% 25%, rgba(255, 57, 212, 0.18), transparent 24%),
              radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.14), transparent 20%),
              radial-gradient(circle at 50% 100%, rgba(0, 247, 255, 0.1), transparent 26%);
            filter: blur(26px);
            animation: edgePulse 6s ease-in-out infinite alternate;
          }

          .rrVignette {
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              radial-gradient(circle at center, transparent 28%, rgba(0, 0, 0, 0.16) 58%, rgba(0, 0, 0, 0.38) 100%);
          }

          .rrClubPulse {
            position: absolute;
            border-radius: 999px;
            filter: blur(80px);
            opacity: 0.42;
            pointer-events: none;
            mix-blend-mode: screen;
          }

          .rrClubPulseA {
            width: 260px;
            height: 260px;
            left: -60px;
            top: 14%;
            background: rgba(0, 247, 255, 0.3);
            animation: clubFloatA 7s ease-in-out infinite;
          }

          .rrClubPulseB {
            width: 300px;
            height: 300px;
            right: -90px;
            top: 22%;
            background: rgba(255, 57, 212, 0.3);
            animation: clubFloatB 8.5s ease-in-out infinite;
          }

          .rrClubPulseC {
            width: 280px;
            height: 280px;
            left: 20%;
            bottom: -90px;
            background: rgba(86, 132, 255, 0.24);
            animation: clubFloatC 9s ease-in-out infinite;
          }

          .rrLightBeam {
            position: absolute;
            pointer-events: none;
            opacity: 0.28;
            filter: blur(10px);
            mix-blend-mode: screen;
          }

          .rrLightBeamLeft {
            top: -12%;
            left: -8%;
            width: 220px;
            height: 150%;
            background: linear-gradient(
              180deg,
              transparent 0%,
              rgba(0, 247, 255, 0.18) 20%,
              rgba(0, 247, 255, 0.3) 48%,
              rgba(0, 247, 255, 0.08) 75%,
              transparent 100%
            );
            transform: rotate(20deg);
            animation: beamSweepLeft 6.5s ease-in-out infinite alternate;
          }

          .rrLightBeamRight {
            top: -10%;
            right: -8%;
            width: 240px;
            height: 150%;
            background: linear-gradient(
              180deg,
              transparent 0%,
              rgba(255, 57, 212, 0.16) 20%,
              rgba(255, 57, 212, 0.3) 50%,
              rgba(255, 57, 212, 0.08) 75%,
              transparent 100%
            );
            transform: rotate(-18deg);
            animation: beamSweepRight 7.2s ease-in-out infinite alternate;
          }

          .rrLightBeamTop {
            top: -140px;
            left: 50%;
            width: 320px;
            height: 340px;
            transform: translateX(-50%);
            background: radial-gradient(
              ellipse at center,
              rgba(110, 231, 249, 0.2) 0%,
              rgba(217, 70, 239, 0.14) 36%,
              transparent 72%
            );
            animation: topPulse 5.5s ease-in-out infinite;
          }

          .rrOrb {
            position: absolute;
            border-radius: 999px;
            filter: blur(60px);
            opacity: 0.32;
            pointer-events: none;
          }

          .rrOrbA {
            width: 340px;
            height: 340px;
            background: rgba(0, 247, 255, 0.2);
            top: -80px;
            left: -60px;
          }

          .rrOrbB {
            width: 380px;
            height: 380px;
            background: rgba(255, 57, 212, 0.18);
            right: -100px;
            top: 20vh;
          }

          .rrOrbC {
            width: 300px;
            height: 300px;
            background: rgba(120, 160, 255, 0.18);
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
            max-width: 520px;
            margin: 0 auto;
          }

          .rrTopStage {
            position: relative;
            overflow: hidden;
            padding: 16px 14px 14px;
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background:
              radial-gradient(circle at top center, rgba(110, 231, 249, 0.14), transparent 42%),
              radial-gradient(circle at bottom center, rgba(217, 70, 239, 0.12), transparent 40%),
              linear-gradient(180deg, rgba(18, 25, 40, 0.92), rgba(8, 12, 21, 0.96));
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 16px 40px rgba(0, 0, 0, 0.55),
              0 0 30px rgba(0, 247, 255, 0.08);
            backdrop-filter: blur(10px);
          }

          .rrTopShine {
            position: absolute;
            top: -90px;
            left: -20%;
            width: 140%;
            height: 180px;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.05) 35%,
              rgba(255, 255, 255, 0.13) 50%,
              rgba(255, 255, 255, 0.05) 65%,
              transparent 100%
            );
            transform: rotate(-8deg);
            pointer-events: none;
          }

          .rrWelcomeLogo img {
            width: 112px;
            margin: 8px auto 2px;
            filter:
              drop-shadow(0 0 14px rgba(110, 231, 249, 0.28))
              drop-shadow(0 0 24px rgba(217, 70, 239, 0.18));
          }

          .rrWelcomeHero {
            display: grid;
            gap: 6px;
            margin-top: 4px;
          }

          .rrWelcomeTitle {
            font-size: 28px;
            line-height: 1;
            font-weight: 1000;
            letter-spacing: 0.03em;
            text-shadow:
              0 0 18px rgba(110, 231, 249, 0.18),
              0 0 28px rgba(217, 70, 239, 0.12);
          }

          .rrWelcomeSub {
            font-size: 13px;
            opacity: 0.78;
          }

          .rrHowRow {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 8px;
          }

          .rrHowCard {
            padding: 12px 8px 10px;
            border-radius: 18px;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.08),
              0 8px 18px rgba(0, 0, 0, 0.28);
            backdrop-filter: blur(8px);
          }

          .rrHowIcon {
            font-size: 22px;
            line-height: 1;
            margin-bottom: 8px;
            filter: drop-shadow(0 0 10px rgba(110, 231, 249, 0.16));
          }

          .rrHowTitle {
            font-size: 11px;
            font-weight: 1000;
            letter-spacing: 0.14em;
          }

          .rrHowSub {
            margin-top: 4px;
            font-size: 11px;
            opacity: 0.78;
          }

          .rrEnterBtn {
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: 100%;
            margin-top: 10px;
            padding: 16px 16px;
            border-radius: 18px;
            border: 1px solid rgba(138, 190, 255, 0.5);
            font-weight: 1000;
            color: white;
            background:
              linear-gradient(180deg, #67a6ff 0%, #3b7fe0 55%, #255fba 100%);
            box-shadow:
              inset 0 2px 0 rgba(255, 255, 255, 0.25),
              0 14px 28px rgba(32, 83, 155, 0.38),
              0 0 18px rgba(85, 170, 255, 0.22);
          }

          .rrEnterBtnGlow {
            position: absolute;
            top: 0;
            left: -35%;
            width: 45%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.28),
              transparent
            );
            transform: skewX(-22deg);
            pointer-events: none;
            animation: btnSweep 3.6s linear infinite;
          }

          .rrEnterBtnText,
          .rrEnterBtnArrow {
            position: relative;
            z-index: 1;
          }

          .rrEnterBtnText {
            letter-spacing: 0.06em;
          }

          .rrEnterBtnArrow {
            font-size: 18px;
            opacity: 0.95;
          }

          .rrBonusCard,
          .rrFeaturedCard {
            position: relative;
            overflow: hidden;
            padding: 18px 16px;
            border-radius: 22px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background:
              radial-gradient(circle at top, rgba(110, 231, 249, 0.14), transparent 42%),
              linear-gradient(180deg, rgba(23, 29, 44, 0.95), rgba(10, 14, 22, 0.98));
            box-shadow:
              inset 0 2px 0 rgba(255, 255, 255, 0.08),
              inset 0 -6px 14px rgba(0, 0, 0, 0.22),
              0 22px 44px rgba(0, 0, 0, 0.52),
              0 0 26px rgba(0, 247, 255, 0.12);
            backdrop-filter: blur(10px);
          }

          .rrBonusClickable {
            cursor: pointer;
            width: 100%;
            color: inherit;
            text-align: center;
          }

          .rrBonusClickable:active {
            transform: translateY(1px);
          }

          .rrBonusEmboss {
            position: absolute;
            inset: 0;
            border-radius: inherit;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.14),
              inset 0 -2px 0 rgba(0, 0, 0, 0.24);
            pointer-events: none;
          }

          .rrBonusBadge,
          .rrFeaturedBadge {
            font-size: 10px;
            letter-spacing: 0.22em;
            opacity: 0.74;
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
            text-shadow: 0 0 16px rgba(110, 231, 249, 0.2);
          }

          .rrBonusSub {
            margin-top: 8px;
            font-size: 12px;
            opacity: 0.82;
          }

          .rrBonusActions {
            display: grid;
            gap: 8px;
            margin-top: 14px;
            justify-items: center;
          }

          .rrBtn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 170px;
            padding: 12px 18px;
            border-radius: 14px;
            font-weight: 1000;
            color: white;
            background: linear-gradient(180deg, #4d8fe4, #2f6fc6);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.22),
              0 12px 28px rgba(32, 83, 155, 0.35);
          }

          .rrFeaturedList {
            display: grid;
            gap: 10px;
            margin-top: 14px;
          }

          .rrFeaturedRow {
            display: grid;
            grid-template-columns: 58px minmax(0, 1fr);
            gap: 12px;
            align-items: center;
            padding: 10px 10px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025));
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.05),
              0 8px 18px rgba(0, 0, 0, 0.22);
            cursor: pointer;
            text-align: left;
          }

          .rrFeaturedArtWrap {
            width: 58px;
            height: 58px;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.03);
          }

          .rrFeaturedArt {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .rrFeaturedText {
            min-width: 0;
          }

          .rrFeaturedTitle {
            font-size: 18px;
            font-weight: 900;
            color: #f5f8ff;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .rrFeaturedArtist {
            margin-top: 4px;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.82);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .rrFeaturedMeta {
            display: flex;
            gap: 12px;
            margin-top: 7px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
          }

          .rrFeaturedEmpty {
            padding: 14px 10px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.03);
            font-size: 13px;
            opacity: 0.8;
          }

          .rrViewMoreBtn {
            width: 100%;
            margin-top: 12px;
            padding: 12px 14px;
            border: 1px solid rgba(150, 170, 210, 0.18);
            border-radius: 14px;
            background:
              linear-gradient(180deg, rgba(70, 88, 130, 0.6), rgba(36, 47, 78, 0.72));
            color: rgba(237, 243, 255, 0.95);
            font-weight: 900;
            letter-spacing: 0.08em;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.08),
              0 10px 20px rgba(0, 0, 0, 0.18);
          }

          .rrOverlay {
            position: fixed;
            inset: 0;
            z-index: 60;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(4, 6, 12, 0.7);
            backdrop-filter: blur(6px);
          }

          .rrDrawer {
            width: min(460px, 100%);
            border-radius: 22px;
            padding: 18px;
            background:
              linear-gradient(180deg, rgba(18, 24, 38, 0.98), rgba(10, 14, 22, 0.99));
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
          }

          .rrDrawerHead {
            display: grid;
            gap: 14px;
          }

          .rrDrawerTitle {
            font-size: 20px;
            font-weight: 1000;
          }

          .rrDrawerSub {
            margin-top: 6px;
            font-size: 13px;
            opacity: 0.82;
            line-height: 1.45;
          }

          .rrBtnGhost {
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.06);
            color: white;
            padding: 10px 14px;
            border-radius: 12px;
            font-weight: 800;
          }

          .rrCloseBtn {
            justify-self: end;
          }

          @keyframes clubFloatA {
            0%, 100% {
              transform: translate(0, 0) scale(1);
              opacity: 0.34;
            }
            50% {
              transform: translate(22px, -18px) scale(1.1);
              opacity: 0.52;
            }
          }

          @keyframes clubFloatB {
            0%, 100% {
              transform: translate(0, 0) scale(1);
              opacity: 0.3;
            }
            50% {
              transform: translate(-26px, 20px) scale(1.08);
              opacity: 0.5;
            }
          }

          @keyframes clubFloatC {
            0%, 100% {
              transform: translate(0, 0) scale(1);
              opacity: 0.26;
            }
            50% {
              transform: translate(16px, -24px) scale(1.12);
              opacity: 0.42;
            }
          }

          @keyframes beamSweepLeft {
            0%, 100% {
              transform: rotate(20deg) translateX(0);
              opacity: 0.18;
            }
            50% {
              transform: rotate(28deg) translateX(22px);
              opacity: 0.34;
            }
          }

          @keyframes beamSweepRight {
            0%, 100% {
              transform: rotate(-18deg) translateX(0);
              opacity: 0.18;
            }
            50% {
              transform: rotate(-28deg) translateX(-24px);
              opacity: 0.34;
            }
          }

          @keyframes topPulse {
            0%, 100% {
              opacity: 0.16;
              transform: translateX(-50%) scale(1);
            }
            50% {
              opacity: 0.3;
              transform: translateX(-50%) scale(1.12);
            }
          }

          @keyframes edgePulse {
            0%, 100% {
              opacity: 0.36;
              transform: scale(1);
            }
            50% {
              opacity: 0.54;
              transform: scale(1.03);
            }
          }

          @keyframes btnSweep {
            0% {
              left: -45%;
            }
            100% {
              left: 115%;
            }
          }

          @media (max-width: 420px) {
            .rrWelcome {
              padding: 14px 8px 74px;
            }

            .rrWelcomeTitle {
              font-size: 24px;
            }

            .rrBonusTitle {
              font-size: 18px;
            }

            .rrHowCard {
              padding: 10px 6px 9px;
            }

            .rrHowIcon {
              font-size: 20px;
            }

            .rrEnterBtn {
              padding: 15px 14px;
            }

            .rrLightBeamLeft,
            .rrLightBeamRight {
              width: 170px;
            }

            .rrFeaturedRow {
              grid-template-columns: 52px minmax(0, 1fr);
              gap: 10px;
            }

            .rrFeaturedArtWrap {
              width: 52px;
              height: 52px;
            }

            .rrFeaturedTitle {
              font-size: 16px;
            }
          }
        `}</style>
      </div>
    </PublicTheme>
  );
}