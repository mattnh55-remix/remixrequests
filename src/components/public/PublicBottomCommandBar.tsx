"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type PublicView = "request" | "queue" | "shoutouts";

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

function SideWing({ target }: { target: NavTarget }) {
  return (
    <Link
      href={target.href}
      className={`rrCmdWing rrCmdWing--${target.direction}`}
      aria-label={target.label}
    >
      <span className="rrCmdWingGlow" aria-hidden="true" />
      <span className="rrCmdWingArrow" aria-hidden="true">
        {target.direction === "left" ? "‹‹‹" : "›››"}
      </span>
      <span className="rrCmdWingLabel">{target.label}</span>
      <span className="rrCmdWingIcon" aria-hidden="true">
        {target.icon}
      </span>
    </Link>
  );
}

export default function PublicBottomCommandBar({
  location,
  activeView,
  points,
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
  const pointsCta = safePoints > 0 ? "ADD MORE" : "CLAIM POINTS";

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
      pulseTimerRef.current = window.setTimeout(() => setPointsPulse(false), 520);
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

          <div className="rrCmdDeck">
            <SideWing target={targets[0]} />

            <button
              type="button"
              className={[
                "rrCmdPointsDock",
                onPointsClick ? "isClickable" : "",
                pointsPulse ? "isPulsePop" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={safePoints > 0 ? `You have ${safePoints} points. Add more.` : "Claim points"}
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
              <span className="rrCmdPointsDockSheen" aria-hidden="true" />
              <span className="rrCmdPointsDockTop">POINTS</span>
              <span className="rrCmdPointsDockValue">{displayPoints}</span>
              <span className="rrCmdPointsDockBottom">{pointsCta}</span>
            </button>

            <SideWing target={targets[1]} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .rrCmdBarSpacer {
          height: 172px;
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
          pointer-events: auto;
          max-width: 1120px;
          margin: 0 auto;
          border-radius: 30px 30px 0 0;
          overflow: hidden;
          border: 1px solid rgba(153, 170, 255, 0.14);
          border-bottom: 0;
          background:
            linear-gradient(90deg, rgba(0, 26, 63, 0.96) 0%, rgba(20, 7, 68, 0.98) 100%);
          box-shadow:
            0 22px 50px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 0 0 1px rgba(72, 107, 197, 0.1);
          backdrop-filter: blur(16px) saturate(125%);
          -webkit-backdrop-filter: blur(16px) saturate(125%);
        }

        .rrCmdHeader {
          padding: 18px 20px 92px;
          text-align: center;
          background:
            radial-gradient(circle at 10% 0%, rgba(66, 132, 255, 0.16) 0%, transparent 30%),
            radial-gradient(circle at 85% 15%, rgba(130, 76, 255, 0.14) 0%, transparent 34%);
        }

        .rrCmdHeaderTitle {
          font-size: clamp(24px, 2.3vw, 42px);
          line-height: 0.95;
          font-weight: 1000;
          letter-spacing: 0.03em;
          color: #f8f1e4;
          text-transform: uppercase;
          text-shadow: 4px 4px 0 rgba(0, 0, 0, 0.28);
        }

        .rrCmdHeaderSubtitle {
          margin-top: 10px;
          font-size: clamp(13px, 1vw, 18px);
          line-height: 1.15;
          font-weight: 800;
          color: rgba(234, 241, 255, 0.9);
          text-wrap: balance;
          text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.2);
        }

        .rrCmdDeck {
          position: absolute;
          left: 50%;
          bottom: calc(14px + env(safe-area-inset-bottom));
          transform: translateX(-50%);
          width: min(1120px, calc(100% - 28px));
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: end;
          gap: 0;
          pointer-events: none;
        }

        .rrCmdWing,
        .rrCmdPointsDock {
          pointer-events: auto;
        }

        .rrCmdWing {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          min-height: 118px;
          padding: 18px 28px;
          text-decoration: none;
          overflow: hidden;
          color: #f8f1e4;
          background: linear-gradient(180deg, #7524ff 0%, #5c18f4 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 16px 28px rgba(38, 8, 98, 0.32);
          transition: transform 140ms ease, filter 180ms ease, box-shadow 180ms ease;
        }

        .rrCmdWing::after {
          content: "";
          position: absolute;
          inset: auto 0 0 0;
          height: 14px;
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0));
          opacity: 0.55;
        }

        .rrCmdWing--left {
          clip-path: polygon(34px 0, 100% 0, calc(100% - 18px) 50%, 100% 100%, 34px 100%, 0 50%);
          padding-left: 42px;
          border-radius: 22px 0 18px 22px;
        }

        .rrCmdWing--right {
          clip-path: polygon(0 0, calc(100% - 34px) 0, 100% 50%, calc(100% - 34px) 100%, 0 100%, 18px 50%);
          padding-right: 42px;
          border-radius: 0 22px 22px 18px;
        }

        .rrCmdWing:hover,
        .rrCmdWing:active {
          transform: translateY(-2px) scale(1.01);
          filter: brightness(1.05);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 18px 34px rgba(38, 8, 98, 0.4);
        }

        .rrCmdWingGlow {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            115deg,
            transparent 0%,
            transparent 30%,
            rgba(255,255,255,0.04) 38%,
            rgba(255,255,255,0.18) 50%,
            rgba(255,255,255,0.04) 62%,
            transparent 72%,
            transparent 100%
          );
          background-size: 220% 100%;
          animation: rrCmdWingSweep 8s linear infinite;
          mix-blend-mode: screen;
        }

        .rrCmdWingArrow {
          font-size: clamp(18px, 1.8vw, 28px);
          font-weight: 1000;
          letter-spacing: -0.16em;
          opacity: 0.9;
          text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.28);
        }

        .rrCmdWingLabel {
          font-size: clamp(28px, 2.6vw, 54px);
          line-height: 0.92;
          font-weight: 1000;
          letter-spacing: 0.01em;
          text-transform: uppercase;
          text-shadow: 4px 4px 0 rgba(0, 0, 0, 0.28);
          white-space: nowrap;
        }

        .rrCmdWingIcon {
          font-size: clamp(34px, 2.8vw, 54px);
          line-height: 1;
          filter: drop-shadow(3px 3px 0 rgba(0, 0, 0, 0.24));
        }

        .rrCmdPointsDock {
          position: relative;
          z-index: 2;
          margin: 0 -6px;
          width: clamp(230px, 22vw, 286px);
          min-height: 168px;
          border: 0;
          border-radius: 38px;
          padding: 18px 18px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #48b8d0 0%, #3ea5c2 100%);
          color: #f8f1e4;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 18px 34px rgba(11, 95, 120, 0.34),
            0 0 0 6px rgba(36, 167, 206, 0.16);
          transform: translateY(-26px);
          transition: transform 120ms ease, box-shadow 180ms ease, filter 180ms ease;
          overflow: hidden;
        }

        .rrCmdPointsDock::before {
          content: "";
          position: absolute;
          inset: 14px 14px auto;
          height: 24px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          filter: blur(1px);
        }

        .rrCmdPointsDock.isClickable {
          cursor: pointer;
          animation: rrCmdDockPulse 2.8s ease-in-out infinite;
        }

        .rrCmdPointsDock.isClickable:hover,
        .rrCmdPointsDock.isClickable:active {
          transform: translateY(-30px) scale(1.015);
          filter: brightness(1.02);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.24),
            0 20px 40px rgba(11, 95, 120, 0.42),
            0 0 0 7px rgba(36, 167, 206, 0.22);
        }

        .rrCmdPointsDock.isClickable:active {
          transform: translateY(-22px) scale(0.985);
        }

        .rrCmdPointsDock:disabled {
          cursor: default;
        }

        .rrCmdPointsDockSheen {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            112deg,
            transparent 0%,
            transparent 32%,
            rgba(255,255,255,0.08) 40%,
            rgba(255,255,255,0.28) 50%,
            rgba(255,255,255,0.08) 60%,
            transparent 68%,
            transparent 100%
          );
          background-size: 220% 100%;
          animation: rrCmdDockSheen 7.5s linear infinite;
          mix-blend-mode: screen;
          opacity: 0.7;
        }

        .rrCmdPointsDockTop,
        .rrCmdPointsDockBottom,
        .rrCmdPointsDockValue {
          position: relative;
          z-index: 1;
          text-shadow: 4px 4px 0 rgba(0, 0, 0, 0.24);
        }

        .rrCmdPointsDockTop {
          font-size: clamp(24px, 1.9vw, 42px);
          line-height: 0.92;
          font-weight: 1000;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .rrCmdPointsDockValue {
          margin-top: 2px;
          font-size: clamp(64px, 5.1vw, 98px);
          line-height: 0.85;
          font-weight: 1000;
          letter-spacing: -0.04em;
        }

        .rrCmdPointsDockBottom {
          margin-top: 4px;
          font-size: clamp(22px, 1.8vw, 38px);
          line-height: 0.92;
          font-weight: 1000;
          letter-spacing: 0.01em;
          text-transform: uppercase;
        }

        .isPulsePop {
          animation: rrCmdDockLand 520ms ease;
        }

        .reducedMotion .rrCmdPointsDock.isClickable,
        .reducedMotion .rrCmdWingGlow,
        .reducedMotion .rrCmdPointsDockSheen {
          animation: none;
        }

        .reducedMotion .rrCmdWing,
        .reducedMotion .rrCmdPointsDock {
          transition: none;
        }

        @keyframes rrCmdWingSweep {
          0% {
            background-position: 135% 0;
          }
          100% {
            background-position: -120% 0;
          }
        }

        @keyframes rrCmdDockSheen {
          0% {
            background-position: 130% 0;
          }
          100% {
            background-position: -120% 0;
          }
        }

        @keyframes rrCmdDockPulse {
          0%, 100% {
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.2),
              0 18px 34px rgba(11, 95, 120, 0.34),
              0 0 0 6px rgba(36, 167, 206, 0.16);
          }
          50% {
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.22),
              0 20px 38px rgba(11, 95, 120, 0.4),
              0 0 0 8px rgba(36, 167, 206, 0.24);
          }
        }

        @keyframes rrCmdDockLand {
          0% {
            transform: translateY(-20px) scale(0.96);
          }
          45% {
            transform: translateY(-34px) scale(1.04);
          }
          100% {
            transform: translateY(-26px) scale(1);
          }
        }

        @media (max-width: 980px) {
          .rrCmdBarSpacer {
            height: 186px;
          }

          .rrCmdHeader {
            padding: 16px 16px 90px;
          }

          .rrCmdWing {
            min-height: 104px;
            gap: 10px;
            padding-top: 14px;
            padding-bottom: 14px;
          }

          .rrCmdWingLabel {
            font-size: clamp(24px, 3vw, 38px);
          }

          .rrCmdWingIcon {
            font-size: clamp(28px, 3vw, 42px);
          }

          .rrCmdPointsDock {
            width: clamp(206px, 30vw, 248px);
            min-height: 154px;
          }
        }

        @media (max-width: 720px) {
          .rrCmdBarSpacer {
            height: 200px;
          }

          .rrCmdBarWrap {
            padding-left: 0;
            padding-right: 0;
            padding-bottom: 0;
          }

          .rrCmdShell {
            border-left: 0;
            border-right: 0;
            border-radius: 26px 26px 0 0;
          }

          .rrCmdHeader {
            padding: 14px 16px 96px;
          }

          .rrCmdHeaderTitle {
            font-size: 22px;
          }

          .rrCmdHeaderSubtitle {
            margin-top: 7px;
            font-size: 12px;
          }

          .rrCmdDeck {
            width: 100%;
            left: 0;
            transform: none;
            padding: 0 10px;
            gap: 6px;
            grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          }

          .rrCmdWing {
            min-height: 88px;
            gap: 8px;
            padding: 12px 18px;
          }

          .rrCmdWing--left {
            padding-left: 24px;
            clip-path: polygon(22px 0, 100% 0, calc(100% - 12px) 50%, 100% 100%, 22px 100%, 0 50%);
          }

          .rrCmdWing--right {
            padding-right: 24px;
            clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 0 100%, 12px 50%);
          }

          .rrCmdWingArrow {
            display: none;
          }

          .rrCmdWingLabel {
            font-size: 18px;
          }

          .rrCmdWingIcon {
            font-size: 24px;
          }

          .rrCmdPointsDock {
            width: 154px;
            min-height: 126px;
            border-radius: 28px;
            padding: 14px 10px 12px;
            transform: translateY(-22px);
          }

          .rrCmdPointsDock.isClickable:hover,
          .rrCmdPointsDock.isClickable:active {
            transform: translateY(-24px) scale(1.01);
          }

          .rrCmdPointsDock.isClickable:active {
            transform: translateY(-18px) scale(0.985);
          }

          .rrCmdPointsDockTop {
            font-size: 18px;
          }

          .rrCmdPointsDockValue {
            font-size: 50px;
          }

          .rrCmdPointsDockBottom {
            font-size: 16px;
          }
        }

        @media (max-width: 520px) {
          .rrCmdBarSpacer {
            height: 192px;
          }

          .rrCmdHeader {
            padding: 12px 14px 90px;
          }

          .rrCmdHeaderTitle {
            font-size: 20px;
          }

          .rrCmdHeaderSubtitle {
            max-width: 290px;
            margin: 6px auto 0;
            font-size: 11px;
          }

          .rrCmdDeck {
            padding: 0 8px;
            gap: 4px;
          }

          .rrCmdWing {
            min-height: 76px;
            gap: 6px;
            padding-top: 10px;
            padding-bottom: 10px;
          }

          .rrCmdWingLabel {
            font-size: 15px;
          }

          .rrCmdWingIcon {
            font-size: 19px;
          }

          .rrCmdPointsDock {
            width: 136px;
            min-height: 114px;
            border-radius: 24px;
          }

          .rrCmdPointsDockTop {
            font-size: 16px;
          }

          .rrCmdPointsDockValue {
            font-size: 42px;
          }

          .rrCmdPointsDockBottom {
            font-size: 14px;
          }
        }
      `}</style>
    </>
  );
}
