"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PublicView = "request" | "queue" | "shoutouts";
type PointsMode = "auto" | "claim" | "add";

type NavTarget = {
  label: string;
  href: string;
  icon: string;
  direction: "left" | "right";
};

type HeaderCopy = {
  title: string;
  subtitle: string;
};

type PublicBottomCommandBarProps = {
  location: string;
  activeView: PublicView;
  points?: number | null;
  pointsMode?: PointsMode;
  onPointsClick?: () => void;
  className?: string;
  hidden?: boolean;
};

function getHeaderCopy(activeView: PublicView): HeaderCopy {
  switch (activeView) {
    case "request":
      return {
        title: "REQUEST A SONG",
        subtitle: "Browse songs, boost favorites, and watch the queue move.",
      };
    case "queue":
      return {
        title: "LIVE QUEUE",
        subtitle: "Track what is coming up and vote your favorites higher.",
      };
    case "shoutouts":
      return {
        title: "BIG SCREEN SHOUT-OUTS",
        subtitle: "Send a message to the rink display and keep the energy up.",
      };
    default:
      return {
        title: "REMIX REQUESTS",
        subtitle: "Jump between songs, queue, and shout-outs.",
      };
  }
}

function getSideTargets(location: string, activeView: PublicView): NavTarget[] {
  const requestHref = `/request/${location}`;
  const queueHref = `/queue/${location}`;
  const shoutoutsHref = `/shoutouts/${location}`;

  switch (activeView) {
    case "request":
      return [
        { label: "QUEUE", href: queueHref, icon: "♫", direction: "left" },
        { label: "SHOUTOUTS", href: shoutoutsHref, icon: "📣", direction: "right" },
      ];
    case "queue":
      return [
        { label: "REQUEST", href: requestHref, icon: "🎵", direction: "left" },
        { label: "SHOUTOUTS", href: shoutoutsHref, icon: "📣", direction: "right" },
      ];
    case "shoutouts":
      return [
        { label: "REQUEST", href: requestHref, icon: "🎵", direction: "left" },
        { label: "QUEUE", href: queueHref, icon: "♫", direction: "right" },
      ];
    default:
      return [
        { label: "REQUEST", href: requestHref, icon: "🎵", direction: "left" },
        { label: "QUEUE", href: queueHref, icon: "♫", direction: "right" },
      ];
  }
}

function SideNavButton({ target }: { target: NavTarget }) {
  return (
    <button
      type="button"
      className={`rrCmdNavButton rrCmdNavButton--${target.direction}`}
      aria-label={target.label}
      onClick={() => {
        window.location.href = target.href;
      }}
    >
      <span className="rrCmdNavSweep" aria-hidden="true" />
      <span className="rrCmdNavArrow" aria-hidden="true">
        {target.direction === "left" ? "‹‹" : "››"}
      </span>
      <span className="rrCmdNavLabel">{target.label}</span>
      <span className="rrCmdNavIcon" aria-hidden="true">
        {target.icon}
      </span>
    </button>
  );
}

export default function PublicBottomCommandBar({
  location,
  activeView,
  points,
  pointsMode = "auto",
  onPointsClick,
  className,
  hidden,
}: PublicBottomCommandBarProps) {
  const headerCopy = useMemo(() => getHeaderCopy(activeView), [activeView]);
  const targets = useMemo(() => getSideTargets(location, activeView), [location, activeView]);

  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [pointsPulse, setPointsPulse] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const lastPointsRef = useRef<number>(0);
  const hasAnimatedInitialRef = useRef(false);

  const safePoints = Math.max(0, Number(points ?? 0) || 0);
  const isClaimMode = pointsMode === "claim" || (pointsMode === "auto" && safePoints <= 0);
  const pointsCta = isClaimMode ? "CLAIM POINTS" : "ADD MORE";

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined" || !window.matchMedia) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();

    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const viewport = window.visualViewport;
    const syncKeyboard = () => {
      const heightDelta = window.innerHeight - viewport.height;
      setKeyboardOpen(heightDelta > 140);
    };

    syncKeyboard();
    viewport.addEventListener("resize", syncKeyboard);
    viewport.addEventListener("scroll", syncKeyboard);
    window.addEventListener("orientationchange", syncKeyboard);

    return () => {
      viewport.removeEventListener("resize", syncKeyboard);
      viewport.removeEventListener("scroll", syncKeyboard);
      window.removeEventListener("orientationchange", syncKeyboard);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current != null) cancelAnimationFrame(animationFrameRef.current);
      if (pulseTimerRef.current != null) window.clearTimeout(pulseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const from = lastPointsRef.current;
    const to = safePoints;

    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const shouldJackpot =
      !reducedMotion && (!hasAnimatedInitialRef.current || Math.abs(to - from) >= 3);

    if (!shouldJackpot) {
      setDisplayPoints(to);
      lastPointsRef.current = to;
      hasAnimatedInitialRef.current = true;
      return;
    }

    const start = performance.now();
    const duration = hasAnimatedInitialRef.current ? 650 : 1050;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (to - from) * eased);

      setDisplayPoints(next);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      setDisplayPoints(to);
      lastPointsRef.current = to;
      hasAnimatedInitialRef.current = true;
      setPointsPulse(true);

      if (pulseTimerRef.current != null) window.clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = window.setTimeout(() => setPointsPulse(false), 540);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [safePoints, reducedMotion]);

  return (
    <>
      <div className="rrCmdBarSpacer" />

      <div
        className={[
          "rrCmdBarWrap",
          className ?? "",
          mounted && reducedMotion ? "reducedMotion" : "",
          keyboardOpen ? "keyboardOpen" : "",
          hidden ? "isHidden" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="rrCmdShell">
          <div className="rrCmdHeader">
            <div className="rrCmdHeaderTitle">{headerCopy.title}</div>
            <div className="rrCmdHeaderSubtitle">{headerCopy.subtitle}</div>
          </div>

          <div className="rrCmdControlZone">
            <div className="rrCmdNavBar">
              <SideNavButton target={targets[0]} />
              <SideNavButton target={targets[1]} />
            </div>

            <button
              type="button"
              className={[
                "rrCmdPointsButton",
                onPointsClick ? "isClickable" : "",
                pointsPulse ? "isPulsePop" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={
                isClaimMode
                  ? "Claim points"
                  : `You have ${safePoints} points. Add more.`
              }
              onClick={onPointsClick}
              onKeyDown={(e) => {
                if (!onPointsClick) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPointsClick();
                }
              }}
              disabled={!onPointsClick}
            >
              <span className="rrCmdPointsButtonSheen" aria-hidden="true" />
              <span className="rrCmdPointsTop">POINTS</span>
              <span className="rrCmdPointsValue">{displayPoints}</span>
              <span className="rrCmdPointsBottom">{pointsCta}</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .rrCmdBarSpacer {
          height: 194px;
        }

        .rrCmdBarWrap {
          position: fixed;
          left: 0;
          right: 0;
          bottom: env(safe-area-inset-bottom);
          z-index: 80;
          pointer-events: none;
          padding: 0 14px calc(14px + env(safe-area-inset-bottom));
          transition: transform 180ms ease, opacity 180ms ease;
        }

        .rrCmdBarWrap.keyboardOpen,
        .rrCmdBarWrap.isHidden {
          transform: translateY(120%);
          opacity: 0;
          pointer-events: none;
        }

        .rrCmdShell {
          position: relative;
          pointer-events: auto;
          max-width: 1120px;
          margin: 0 auto;
          border-radius: 30px 30px 0 0;
          overflow: hidden;
          border: 1px solid rgba(118, 174, 255, 0.14);
          border-bottom: 0;
          background:
            linear-gradient(90deg, rgba(4, 24, 58, 0.98) 0%, rgba(18, 8, 58, 0.98) 100%);
          box-shadow:
            0 22px 50px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 0 0 1px rgba(51, 97, 182, 0.1);
          backdrop-filter: blur(14px) saturate(125%);
          -webkit-backdrop-filter: blur(14px) saturate(125%);
        }

        .rrCmdHeader {
          padding: 14px 20px 106px;
          text-align: center;
          background:
            radial-gradient(circle at 12% 0%, rgba(74, 132, 255, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 88% 10%, rgba(121, 74, 255, 0.14) 0%, transparent 34%);
        }

        .rrCmdHeaderTitle {
          font-size: clamp(18px, 1.8vw, 30px);
          line-height: 0.98;
          font-weight: 1000;
          letter-spacing: 0.035em;
          color: #f7f1e6;
          text-transform: uppercase;
          text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.28);
        }

        .rrCmdHeaderSubtitle {
          margin-top: 6px;
          font-size: clamp(11px, 0.9vw, 14px);
          line-height: 1.15;
          font-weight: 800;
          color: rgba(235, 242, 255, 0.88);
          text-wrap: balance;
          text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.2);
        }

        .rrCmdControlZone {
          position: absolute;
          left: 50%;
          bottom: calc(14px + env(safe-area-inset-bottom));
          transform: translateX(-50%);
          width: min(1120px, calc(100% - 28px));
          min-height: 126px;
          pointer-events: none;
        }

        .rrCmdNavBar {
          pointer-events: auto;
          min-height: 110px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: stretch;
          gap: 0;
          border-radius: 24px;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(103, 33, 255, 0.96) 0%, rgba(79, 17, 223, 0.98) 100%);
          border: 1px solid rgba(171, 139, 255, 0.18);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.12),
            0 16px 28px rgba(28, 8, 88, 0.34);
        }

        .rrCmdNavButton {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 110px;
          border: 0;
          color: #f7f1e6;
          background: transparent;
          overflow: hidden;
          transition: transform 120ms ease, filter 180ms ease, background 180ms ease, box-shadow 180ms ease;
        }

        .rrCmdNavButton + .rrCmdNavButton {
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .rrCmdNavButton:hover,
        .rrCmdNavButton:active {
          filter: brightness(1.06);
        }

        .rrCmdNavButton:active {
          transform: translateY(2px) scale(0.992);
          box-shadow: inset 0 8px 18px rgba(0,0,0,0.16);
        }

        .rrCmdNavSweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            112deg,
            transparent 0%,
            transparent 34%,
            rgba(255,255,255,0.04) 42%,
            rgba(255,255,255,0.18) 50%,
            rgba(255,255,255,0.04) 58%,
            transparent 66%,
            transparent 100%
          );
          background-size: 220% 100%;
          animation: rrCmdWingSweep 8s linear infinite;
          mix-blend-mode: screen;
        }

        .rrCmdNavButton--left {
          padding: 16px 96px 16px 26px;
          justify-content: flex-start;
          text-align: left;
        }

        .rrCmdNavButton--right {
          padding: 16px 26px 16px 96px;
          justify-content: flex-end;
          text-align: right;
        }

        .rrCmdNavArrow,
        .rrCmdNavLabel,
        .rrCmdNavIcon {
          position: relative;
          z-index: 1;
          text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.28);
        }

        .rrCmdNavArrow {
          font-size: clamp(15px, 1.2vw, 20px);
          font-weight: 1000;
          letter-spacing: -0.12em;
          opacity: 0.9;
        }

        .rrCmdNavLabel {
          font-size: clamp(20px, 2vw, 34px);
          line-height: 0.94;
          font-weight: 1000;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .rrCmdNavIcon {
          font-size: clamp(22px, 2vw, 34px);
          line-height: 1;
        }

        .rrCmdPointsButton {
          pointer-events: auto;
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%) translateY(-18px);
          z-index: 2;
          width: clamp(174px, 17vw, 218px);
          min-height: 138px;
          border: 1px solid rgba(97, 176, 255, 0.22);
          border-radius: 28px;
          padding: 14px 14px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 50% 0%, rgba(94, 161, 255, 0.18), rgba(14, 31, 68, 0.98) 42%),
            linear-gradient(180deg, rgba(17, 40, 89, 0.98) 0%, rgba(7, 20, 49, 1) 100%);
          color: #f7f1e6;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.1),
            0 14px 26px rgba(7, 22, 56, 0.4),
            0 0 0 4px rgba(63, 145, 255, 0.1);
          overflow: hidden;
          transition: transform 120ms ease, box-shadow 180ms ease, filter 180ms ease;
        }

        .rrCmdPointsButton::before {
          content: "";
          position: absolute;
          inset: 10px 10px auto;
          height: 18px;
          border-radius: 999px;
          background: rgba(255,255,255,0.05);
          filter: blur(1px);
        }

        .rrCmdPointsButton.isClickable {
          cursor: pointer;
          animation: rrCmdPointsBreath 2.8s ease-in-out infinite;
        }

        .rrCmdPointsButton.isClickable:hover,
        .rrCmdPointsButton.isClickable:active {
          transform: translateX(-50%) translateY(-21px) scale(1.015);
          filter: brightness(1.03);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 16px 30px rgba(7, 22, 56, 0.48),
            0 0 0 5px rgba(82, 159, 255, 0.16);
        }

        .rrCmdPointsButton.isClickable:active {
          transform: translateX(-50%) translateY(-14px) scale(0.985);
          box-shadow:
            inset 0 8px 16px rgba(0,0,0,0.16),
            0 10px 18px rgba(7, 22, 56, 0.34),
            0 0 0 4px rgba(82, 159, 255, 0.12);
        }

        .rrCmdPointsButton:disabled {
          cursor: default;
        }

        .rrCmdPointsButtonSheen {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            112deg,
            transparent 0%,
            transparent 34%,
            rgba(255,255,255,0.04) 42%,
            rgba(113,200,255,0.16) 50%,
            rgba(255,255,255,0.04) 58%,
            transparent 66%,
            transparent 100%
          );
          background-size: 220% 100%;
          animation: rrCmdPointsSheen 7.5s linear infinite;
          mix-blend-mode: screen;
          opacity: 0.72;
        }

        .rrCmdPointsTop,
        .rrCmdPointsValue,
        .rrCmdPointsBottom {
          position: relative;
          z-index: 1;
          text-shadow: 3px 3px 0 rgba(0,0,0,0.24);
        }

        .rrCmdPointsTop {
          font-size: clamp(16px, 1.35vw, 28px);
          line-height: 0.94;
          font-weight: 1000;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .rrCmdPointsValue {
          margin-top: 2px;
          font-size: clamp(44px, 3.7vw, 72px);
          line-height: 0.84;
          font-weight: 1000;
          letter-spacing: -0.04em;
        }

        .rrCmdPointsBottom {
          margin-top: 4px;
          font-size: clamp(14px, 1.25vw, 24px);
          line-height: 0.96;
          font-weight: 1000;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .isPulsePop {
          animation: rrCmdPointsLand 540ms ease;
        }

        .reducedMotion .rrCmdNavSweep,
        .reducedMotion .rrCmdPointsButtonSheen,
        .reducedMotion .rrCmdPointsButton.isClickable {
          animation: none;
        }

        .reducedMotion .rrCmdNavButton,
        .reducedMotion .rrCmdPointsButton {
          transition: none;
        }

        @keyframes rrCmdWingSweep {
          0% { background-position: 135% 0; }
          100% { background-position: -120% 0; }
        }

        @keyframes rrCmdPointsSheen {
          0% { background-position: 130% 0; }
          100% { background-position: -120% 0; }
        }

        @keyframes rrCmdPointsBreath {
          0%, 100% {
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.1),
              0 14px 26px rgba(7, 22, 56, 0.4),
              0 0 0 4px rgba(63, 145, 255, 0.1);
          }
          50% {
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.13),
              0 16px 30px rgba(7, 22, 56, 0.46),
              0 0 0 6px rgba(82, 159, 255, 0.15);
          }
        }

        @keyframes rrCmdPointsLand {
          0% { transform: translateX(-50%) translateY(-12px) scale(0.96); }
          45% { transform: translateX(-50%) translateY(-25px) scale(1.04); }
          100% { transform: translateX(-50%) translateY(-18px) scale(1); }
        }

        @media (max-width: 980px) {
          .rrCmdBarSpacer { height: 198px; }
          .rrCmdHeader { padding: 14px 16px 104px; }
          .rrCmdNavButton--left { padding-right: 88px; }
          .rrCmdNavButton--right { padding-left: 88px; }
          .rrCmdNavLabel { font-size: clamp(18px, 2.5vw, 28px); }
          .rrCmdNavIcon { font-size: clamp(20px, 2.5vw, 30px); }
        }

        @media (max-width: 720px) {
          .rrCmdBarSpacer { height: 196px; }
          .rrCmdBarWrap { padding-left: 0; padding-right: 0; padding-bottom: 0; }
          .rrCmdShell { border-left: 0; border-right: 0; border-radius: 24px 24px 0 0; }
          .rrCmdHeader { padding: 12px 14px 102px; }
          .rrCmdHeaderTitle { font-size: 18px; }
          .rrCmdHeaderSubtitle { margin-top: 5px; font-size: 11px; }
          .rrCmdControlZone { width: 100%; left: 0; transform: none; padding: 0 10px; }
          .rrCmdNavBar { min-height: 82px; border-radius: 18px; }
          .rrCmdNavButton { min-height: 82px; gap: 7px; }
          .rrCmdNavButton--left { padding: 10px 58px 10px 14px; }
          .rrCmdNavButton--right { padding: 10px 14px 10px 58px; }
          .rrCmdNavArrow { font-size: 13px; }
          .rrCmdNavLabel { font-size: 15px; }
          .rrCmdNavIcon { font-size: 19px; }
          .rrCmdPointsButton {
            width: 132px;
            min-height: 108px;
            border-radius: 22px;
            padding: 10px 8px 10px;
            transform: translateX(-50%) translateY(-15px);
          }
          .rrCmdPointsButton.isClickable:hover,
          .rrCmdPointsButton.isClickable:active {
            transform: translateX(-50%) translateY(-17px) scale(1.01);
          }
          .rrCmdPointsButton.isClickable:active {
            transform: translateX(-50%) translateY(-11px) scale(0.985);
          }
          .rrCmdPointsTop { font-size: 13px; }
          .rrCmdPointsValue { font-size: 38px; }
          .rrCmdPointsBottom { font-size: 11px; }
        }

        @media (max-width: 520px) {
          .rrCmdBarSpacer { height: 188px; }
          .rrCmdHeader { padding: 11px 12px 98px; }
          .rrCmdHeaderTitle { font-size: 17px; }
          .rrCmdHeaderSubtitle {
            max-width: 270px;
            margin: 4px auto 0;
            font-size: 10px;
          }
          .rrCmdControlZone { padding: 0 8px; }
          .rrCmdNavBar { min-height: 74px; }
          .rrCmdNavButton { min-height: 74px; gap: 5px; }
          .rrCmdNavButton--left { padding: 10px 52px 10px 12px; }
          .rrCmdNavButton--right { padding: 10px 12px 10px 52px; }
          .rrCmdNavArrow { display: none; }
          .rrCmdNavLabel { font-size: 14px; }
          .rrCmdNavIcon { font-size: 17px; }
          .rrCmdPointsButton {
            width: 122px;
            min-height: 100px;
            border-radius: 20px;
          }
          .rrCmdPointsTop { font-size: 12px; }
          .rrCmdPointsValue { font-size: 34px; }
          .rrCmdPointsBottom { font-size: 10px; }
        }
      `}</style>
    </>
  );
}
