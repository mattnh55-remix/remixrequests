"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PublicView = "request" | "queue" | "shoutouts";
type PointsMode = "auto" | "claim" | "add";

type NavTarget = {
  label: string;
  href: string;
  icon: string;
  kicker: string;
  direction: "left" | "right";
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

function getSideTargets(location: string, activeView: PublicView): NavTarget[] {
  const requestHref = `/request/${location}`;
  const queueHref = `/queue/${location}`;
  const shoutoutsHref = `/shoutouts/${location}`;

  switch (activeView) {
    case "request":
      return [
        { label: "QUEUE", kicker: "Up Next", href: queueHref, icon: "♫", direction: "left" },
        { label: "SHOUTOUTS", kicker: "On Screen", href: shoutoutsHref, icon: "📣", direction: "right" },
      ];
    case "queue":
      return [
        { label: "REQUEST", kicker: "Add Songs", href: requestHref, icon: "🎵", direction: "left" },
        { label: "SHOUTOUTS", kicker: "On Screen", href: shoutoutsHref, icon: "📣", direction: "right" },
      ];
    case "shoutouts":
      return [
        { label: "REQUEST", kicker: "Add Songs", href: requestHref, icon: "🎵", direction: "left" },
        { label: "QUEUE", kicker: "Up Next", href: queueHref, icon: "♫", direction: "right" },
      ];
    default:
      return [
        { label: "REQUEST", kicker: "Add Songs", href: requestHref, icon: "🎵", direction: "left" },
        { label: "QUEUE", kicker: "Up Next", href: queueHref, icon: "♫", direction: "right" },
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
      <span className="rrCmdNavGlow" aria-hidden="true" />
      <span className="rrCmdNavSheen" aria-hidden="true" />
      <span className="rrCmdNavInner" aria-hidden="true" />
      <span className="rrCmdNavText">
        <span className="rrCmdNavKicker">{target.kicker}</span>
        <span className="rrCmdNavLabelRow">
          <span className="rrCmdNavArrow" aria-hidden="true">
            {target.direction === "left" ? "‹‹" : "››"}
          </span>
          <span className="rrCmdNavLabel">{target.label}</span>
          <span className="rrCmdNavIcon" aria-hidden="true">
            {target.icon}
          </span>
        </span>
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
          <span className="rrCmdTopGlow" aria-hidden="true" />
          <span className="rrCmdTopEdge" aria-hidden="true" />

          <div className="rrCmdControlZone">
            <div className="rrCmdNavRail">
              <div className="rrCmdNavBar">
                <SideNavButton target={targets[0]} />
                <SideNavButton target={targets[1]} />
              </div>
            </div>

            <button
              type="button"
              className={[
                "rrCmdPointsButton",
                onPointsClick ? "isClickable" : "",
                pointsPulse ? "isPulsePop" : "",
                isClaimMode ? "isClaimMode" : "",
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
              <span className="rrCmdPointsHalo" aria-hidden="true" />
              <span className="rrCmdPointsButtonSheen" aria-hidden="true" />
              <span className="rrCmdPointsInner" aria-hidden="true" />
              <span className="rrCmdPointsTop">POINTS</span>
              <span className="rrCmdPointsValue">{displayPoints}</span>
              <span className="rrCmdPointsBottom">{pointsCta}</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .rrCmdBarSpacer {
          height: 218px;
        }

        .rrCmdBarWrap {
          position: fixed;
          left: 0;
          right: 0;
          bottom: env(safe-area-inset-bottom);
          z-index: 80;
          pointer-events: none;
          padding: 0 14px calc(16px + env(safe-area-inset-bottom));
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
          min-height: 122px;
          margin: 0 auto;
          border-radius: 32px 32px 0 0;
          overflow: visible;
          border: 1px solid rgba(121, 182, 255, 0.16);
          border-bottom: 0;
          background:
            radial-gradient(circle at 50% -40%, rgba(85, 145, 255, 0.18), transparent 38%),
            linear-gradient(90deg, rgba(3, 18, 48, 0.98) 0%, rgba(22, 8, 64, 0.985) 52%, rgba(6, 20, 52, 0.98) 100%);
          box-shadow:
            0 22px 50px rgba(0, 0, 0, 0.46),
            0 0 0 1px rgba(57, 101, 180, 0.11),
            inset 0 1px 0 rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(16px) saturate(126%);
          -webkit-backdrop-filter: blur(16px) saturate(126%);
        }

        .rrCmdTopGlow {
          position: absolute;
          left: 6%;
          right: 6%;
          top: -14px;
          height: 22px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(106, 169, 255, 0.34) 0%, rgba(106, 169, 255, 0) 72%);
          filter: blur(10px);
          opacity: 0.75;
          pointer-events: none;
        }

        .rrCmdTopEdge {
          position: absolute;
          left: 18px;
          right: 18px;
          top: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(166, 210, 255, 0.42) 18%, rgba(205, 164, 255, 0.3) 50%, rgba(166, 210, 255, 0.42) 82%, transparent 100%);
          pointer-events: none;
        }

        .rrCmdControlZone {
          position: absolute;
          left: 50%;
          bottom: calc(16px + env(safe-area-inset-bottom));
          transform: translateX(-50%);
          width: min(1120px, calc(100% - 28px));
          min-height: 136px;
          pointer-events: none;
        }

        .rrCmdNavRail {
          position: relative;
          min-height: 92px;
          padding-top: 8px;
        }

        .rrCmdNavRail::before {
          content: "";
          position: absolute;
          inset: 6px 0 0;
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(18, 39, 95, 0.92) 0%, rgba(32, 10, 87, 0.88) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            inset 0 -10px 14px rgba(0, 0, 0, 0.22),
            0 18px 30px rgba(21, 8, 62, 0.42);
          border: 1px solid rgba(141, 164, 255, 0.12);
        }

        .rrCmdNavBar {
          position: relative;
          z-index: 1;
          pointer-events: auto;
          min-height: 92px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: stretch;
          gap: 10px;
          padding: 10px;
          border-radius: 26px;
          overflow: hidden;
        }

        .rrCmdNavButton {
          position: relative;
          min-height: 72px;
          border: 0;
          border-radius: 18px;
          color: #f8f4ea;
          background:
            linear-gradient(180deg, rgba(248, 251, 255, 0.14) 0%, rgba(90, 123, 255, 0.06) 16%, rgba(12, 32, 78, 0.92) 100%);
          overflow: hidden;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.13),
            inset 0 -8px 18px rgba(0, 0, 0, 0.22),
            0 10px 18px rgba(6, 17, 48, 0.26);
          transition: transform 130ms ease, filter 180ms ease, box-shadow 180ms ease;
        }

        .rrCmdNavButton + .rrCmdNavButton {
          margin-left: 0;
        }

        .rrCmdNavButton--left {
          text-align: left;
        }

        .rrCmdNavButton--right {
          text-align: right;
        }

        .rrCmdNavGlow,
        .rrCmdNavSheen,
        .rrCmdNavInner {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .rrCmdNavGlow {
          background:
            radial-gradient(circle at 18% 20%, rgba(109, 190, 255, 0.26), transparent 34%),
            radial-gradient(circle at 82% 24%, rgba(194, 114, 255, 0.18), transparent 32%);
          opacity: 0.9;
        }

        .rrCmdNavInner {
          inset: 1px;
          border-radius: 17px;
          border: 1px solid rgba(174, 214, 255, 0.08);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 28%, transparent 100%);
        }

        .rrCmdNavSheen {
          background: linear-gradient(
            112deg,
            transparent 0%,
            transparent 34%,
            rgba(255, 255, 255, 0.03) 42%,
            rgba(255, 255, 255, 0.14) 50%,
            rgba(255, 255, 255, 0.03) 58%,
            transparent 66%,
            transparent 100%
          );
          background-size: 220% 100%;
          animation: rrCmdWingSweep 7.8s linear infinite;
          mix-blend-mode: screen;
        }

        .rrCmdNavText {
          position: relative;
          z-index: 1;
          min-height: 72px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          padding: 11px 16px;
        }

        .rrCmdNavButton--left .rrCmdNavText {
          align-items: flex-start;
          padding-right: 54px;
        }

        .rrCmdNavButton--right .rrCmdNavText {
          align-items: flex-end;
          padding-left: 54px;
        }

        .rrCmdNavKicker,
        .rrCmdNavArrow,
        .rrCmdNavLabel,
        .rrCmdNavIcon {
          position: relative;
          z-index: 1;
          text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.28);
        }

        .rrCmdNavKicker {
          font-size: clamp(9px, 0.82vw, 12px);
          line-height: 1;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(197, 224, 255, 0.84);
        }

        .rrCmdNavLabelRow {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rrCmdNavButton--right .rrCmdNavLabelRow {
          flex-direction: row-reverse;
        }

        .rrCmdNavArrow {
          font-size: clamp(12px, 1vw, 16px);
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.14em;
          color: rgba(229, 240, 255, 0.86);
          opacity: 0.88;
        }

        .rrCmdNavLabel {
          font-size: clamp(18px, 1.55vw, 24px);
          line-height: 0.96;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          white-space: nowrap;
          color: #ffffff;
        }

        .rrCmdNavIcon {
          font-size: clamp(15px, 1.15vw, 18px);
          opacity: 0.94;
          filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.3));
        }

        .rrCmdNavButton:hover,
        .rrCmdNavButton:active {
          filter: brightness(1.06);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 -8px 18px rgba(0, 0, 0, 0.28),
            0 12px 22px rgba(6, 17, 48, 0.3),
            0 0 0 1px rgba(117, 178, 255, 0.16);
        }

        .rrCmdNavButton:active {
          transform: translateY(2px) scale(0.985);
        }

        .rrCmdPointsButton {
          pointer-events: auto;
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%) translateY(-18px);
          z-index: 2;
          width: clamp(164px, 16vw, 200px);
          min-height: 124px;
          border: 1px solid rgba(97, 176, 255, 0.22);
          border-radius: 28px;
          padding: 12px 12px 11px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 50% 0%, rgba(92, 161, 255, 0.24), rgba(13, 31, 69, 0.98) 40%),
            linear-gradient(180deg, rgba(14, 35, 85, 0.98) 0%, rgba(6, 20, 48, 1) 100%);
          color: #f7f1e6;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 16px 28px rgba(7, 22, 56, 0.44),
            0 0 0 4px rgba(63, 145, 255, 0.1);
          overflow: visible;
          transition: transform 120ms ease, box-shadow 180ms ease, filter 180ms ease;
        }

        .rrCmdPointsHalo,
        .rrCmdPointsButtonSheen,
        .rrCmdPointsInner {
          position: absolute;
          pointer-events: none;
        }

        .rrCmdPointsHalo {
          inset: -10px -8px auto;
          height: 34px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(97, 189, 255, 0.38) 0%, rgba(97, 189, 255, 0) 72%);
          filter: blur(10px);
          opacity: 0.75;
        }

        .rrCmdPointsInner {
          inset: 1px;
          border-radius: 27px;
          border: 1px solid rgba(176, 219, 255, 0.08);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 30%, transparent 100%);
        }

        .rrCmdPointsButton::before {
          content: "";
          position: absolute;
          inset: 10px 10px auto;
          height: 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          filter: blur(1px);
        }

        .rrCmdPointsButton.isClaimMode {
          background:
            radial-gradient(circle at 50% 0%, rgba(100, 197, 255, 0.28), rgba(10, 37, 82, 0.98) 42%),
            linear-gradient(180deg, rgba(12, 55, 112, 0.98) 0%, rgba(8, 28, 64, 1) 100%);
        }

        .rrCmdPointsButton.isClickable {
          cursor: pointer;
          animation: rrCmdPointsBreath 2.8s ease-in-out infinite;
        }

        .rrCmdPointsButton.isClickable:hover,
        .rrCmdPointsButton.isClickable:active {
          transform: translateX(-50%) translateY(-21px) scale(1.016);
          filter: brightness(1.03);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            0 18px 32px rgba(7, 22, 56, 0.48),
            0 0 0 5px rgba(82, 159, 255, 0.16);
        }

        .rrCmdPointsButton.isClickable:active {
          transform: translateX(-50%) translateY(-14px) scale(0.985);
          box-shadow:
            inset 0 8px 16px rgba(0, 0, 0, 0.16),
            0 10px 18px rgba(7, 22, 56, 0.34),
            0 0 0 4px rgba(82, 159, 255, 0.12);
        }

        .rrCmdPointsButton:disabled {
          cursor: default;
        }

        .rrCmdPointsButtonSheen {
          inset: 0;
          background: linear-gradient(
            112deg,
            transparent 0%,
            transparent 34%,
            rgba(255, 255, 255, 0.04) 42%,
            rgba(113, 200, 255, 0.16) 50%,
            rgba(255, 255, 255, 0.04) 58%,
            transparent 66%,
            transparent 100%
          );
          background-size: 220% 100%;
          animation: rrCmdPointsSheen 7.5s linear infinite;
          mix-blend-mode: screen;
          opacity: 0.72;
          border-radius: 28px;
        }

        .rrCmdPointsTop,
        .rrCmdPointsValue,
        .rrCmdPointsBottom {
          position: relative;
          z-index: 1;
          text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.24);
        }

        .rrCmdPointsTop {
          font-size: clamp(14px, 1.2vw, 20px);
          line-height: 0.94;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(232, 243, 255, 0.92);
        }

        .rrCmdPointsValue {
          margin-top: 2px;
          font-size: clamp(40px, 3.1vw, 60px);
          line-height: 0.84;
          font-weight: 1000;
          letter-spacing: -0.05em;
        }

        .rrCmdPointsBottom {
          margin-top: 3px;
          font-size: clamp(11px, 0.95vw, 15px);
          line-height: 0.96;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .isPulsePop {
          animation: rrCmdPointsLand 540ms ease;
        }

        .reducedMotion .rrCmdNavSheen,
        .reducedMotion .rrCmdPointsButtonSheen,
        .reducedMotion .rrCmdPointsButton.isClickable {
          animation: none;
        }

        .reducedMotion .rrCmdNavButton,
        .reducedMotion .rrCmdPointsButton {
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

        @keyframes rrCmdPointsSheen {
          0% {
            background-position: 130% 0;
          }
          100% {
            background-position: -120% 0;
          }
        }

        @keyframes rrCmdPointsBreath {
          0%,
          100% {
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 16px 28px rgba(7, 22, 56, 0.44),
              0 0 0 4px rgba(63, 145, 255, 0.1);
          }
          50% {
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.13),
              0 18px 32px rgba(7, 22, 56, 0.5),
              0 0 0 6px rgba(82, 159, 255, 0.16);
          }
        }

        @keyframes rrCmdPointsLand {
          0% {
            transform: translateX(-50%) translateY(-12px) scale(0.96);
          }
          45% {
            transform: translateX(-50%) translateY(-25px) scale(1.04);
          }
          100% {
            transform: translateX(-50%) translateY(-18px) scale(1);
          }
        }

        @media (max-width: 980px) {
          .rrCmdBarSpacer {
            height: 214px;
          }

          .rrCmdNavBar {
            min-height: 88px;
          }

          .rrCmdNavLabel {
            font-size: clamp(17px, 2.3vw, 22px);
          }
        }

        @media (max-width: 720px) {
          .rrCmdBarSpacer {
            height: 202px;
          }

          .rrCmdBarWrap {
            padding-left: 0;
            padding-right: 0;
            padding-bottom: 0;
          }

          .rrCmdShell {
            border-left: 0;
            border-right: 0;
            border-radius: 24px 24px 0 0;
          }

          .rrCmdControlZone {
            width: 100%;
            left: 0;
            transform: none;
            padding: 0 10px;
            bottom: calc(12px + env(safe-area-inset-bottom));
          }

          .rrCmdNavRail {
            min-height: 84px;
            padding-top: 6px;
          }

          .rrCmdNavRail::before {
            border-radius: 20px;
          }

          .rrCmdNavBar {
            min-height: 84px;
            gap: 8px;
            padding: 8px;
            border-radius: 20px;
          }

          .rrCmdNavButton {
            min-height: 68px;
            border-radius: 16px;
          }

          .rrCmdNavInner {
            border-radius: 15px;
          }

          .rrCmdNavText {
            min-height: 68px;
            gap: 3px;
            padding: 10px 12px;
          }

          .rrCmdNavButton--left .rrCmdNavText {
            padding-right: 40px;
          }

          .rrCmdNavButton--right .rrCmdNavText {
            padding-left: 40px;
          }

          .rrCmdNavKicker {
            font-size: 8px;
            letter-spacing: 0.12em;
          }

          .rrCmdNavArrow {
            font-size: 11px;
          }

          .rrCmdNavLabel {
            font-size: 14px;
          }

          .rrCmdNavIcon {
            font-size: 14px;
          }

          .rrCmdPointsButton {
            width: 126px;
            min-height: 102px;
            border-radius: 22px;
            padding: 10px 8px 10px;
            transform: translateX(-50%) translateY(-13px);
          }

          .rrCmdPointsInner,
          .rrCmdPointsButtonSheen {
            border-radius: 21px;
          }

          .rrCmdPointsButton.isClickable:hover,
          .rrCmdPointsButton.isClickable:active {
            transform: translateX(-50%) translateY(-15px) scale(1.01);
          }

          .rrCmdPointsButton.isClickable:active {
            transform: translateX(-50%) translateY(-10px) scale(0.985);
          }

          .rrCmdPointsTop {
            font-size: 12px;
          }

          .rrCmdPointsValue {
            font-size: 34px;
          }

          .rrCmdPointsBottom {
            font-size: 10px;
          }
        }

        @media (max-width: 520px) {
          .rrCmdBarSpacer {
            height: 194px;
          }

          .rrCmdControlZone {
            padding: 0 8px;
          }

          .rrCmdNavRail::before {
            inset: 5px 0 0;
          }

          .rrCmdNavBar {
            min-height: 76px;
            gap: 7px;
            padding: 7px;
          }

          .rrCmdNavButton {
            min-height: 62px;
          }

          .rrCmdNavText {
            min-height: 62px;
          }

          .rrCmdNavKicker {
            font-size: 7px;
          }

          .rrCmdNavArrow {
            display: none;
          }

          .rrCmdNavLabelRow {
            gap: 6px;
          }

          .rrCmdNavLabel {
            font-size: 13px;
          }

          .rrCmdNavIcon {
            font-size: 13px;
          }

          .rrCmdPointsButton {
            width: 118px;
            min-height: 94px;
            border-radius: 20px;
          }

          .rrCmdPointsTop {
            font-size: 11px;
          }

          .rrCmdPointsValue {
            font-size: 31px;
          }

          .rrCmdPointsBottom {
            font-size: 9px;
          }
        }
      `}</style>
    </>
  );
}
