"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PublicView = "request" | "queue" | "shoutouts";

type CtaConfig = {
  label: string;
  href: string;
};

type BarCopy = {
  eyebrow?: string;
  message: string;
  primary?: CtaConfig;
  secondary?: CtaConfig;
};

type PublicBottomCommandBarProps = {
  location: string;
  activeView: PublicView;
  points?: number | null;
  className?: string;
};

function getCopy(location: string, activeView: PublicView): BarCopy {
  const requestHref = `/request/${location}`;
  const queueHref = `/queue/${location}`;
  const shoutoutsHref = `/shoutouts/${location}`;

  switch (activeView) {
    case "request":
      return {
        eyebrow: "LIVE QUEUE",
        message: "See what’s climbing now, vote favorites up, or send a shout-out to the big screen.",
        primary: { label: "View Queue", href: queueHref },
        secondary: { label: "Shout-Outs", href: shoutoutsHref },
      };

    case "queue":
      return {
        eyebrow: "GET IN THE MIX",
        message: "Browse songs, drop a request, or put your message on the screen while the queue heats up.",
        primary: { label: "Request Song", href: requestHref },
        secondary: { label: "Shout-Outs", href: shoutoutsHref },
      };

    case "shoutouts":
      return {
        eyebrow: "ON THE BIG SCREEN",
        message: "Jump back to songs, watch the live queue, or submit your shout-out in seconds.",
        primary: { label: "Browse Songs", href: requestHref },
        secondary: { label: "View Queue", href: queueHref },
      };

    default:
      return {
        message: "Browse songs, watch the queue, and send shout-outs.",
      };
  }
}

function NavTab({
  href,
  label,
  icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rrCmdTab ${isActive ? "isActive" : ""}`}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="rrCmdTabIcon" aria-hidden="true">
        {icon}
      </span>
      <span className="rrCmdTabLabel">{label}</span>
      {isActive ? <span className="rrCmdSweep" aria-hidden="true" /> : null}
    </Link>
  );
}

export default function PublicBottomCommandBar({
  location,
  activeView,
  points,
  className,
}: PublicBottomCommandBarProps) {
  const copy = useMemo(() => getCopy(location, activeView), [location, activeView]);
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined" || !window.matchMedia) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);

    sync();
    media.addEventListener?.("change", sync);

    return () => {
      media.removeEventListener?.("change", sync);
    };
  }, []);

  return (
    <>
      <div className="rrCmdBarSpacer" />

      <div
        className={`rrCmdBarWrap ${className ?? ""} ${mounted && reducedMotion ? "reducedMotion" : ""}`}
      >
        <div className="rrCmdBar">
          <div className="rrCmdTop">
            <div className="rrCmdCopy">
              {copy.eyebrow ? <div className="rrCmdEyebrow">{copy.eyebrow}</div> : null}
              <div className="rrCmdMessage">{copy.message}</div>
            </div>

            <div className="rrCmdActions">
              {copy.primary ? (
                <Link href={copy.primary.href} className="rrCmdAction rrCmdActionPrimary">
                  {copy.primary.label}
                </Link>
              ) : null}

              {copy.secondary ? (
                <Link href={copy.secondary.href} className="rrCmdAction rrCmdActionSecondary">
                  {copy.secondary.label}
                </Link>
              ) : null}

              <div className="rrCmdPointsPill" aria-label="Points balance">
                <span className="rrCmdPointsLabel">Points</span>
                <span className="rrCmdPointsValue">{points ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="rrCmdNav">
            <NavTab
              href={`/request/${location}`}
              label="Request"
              icon="🎵"
              isActive={activeView === "request"}
            />
            <NavTab
              href={`/queue/${location}`}
              label="Queue"
              icon="📺"
              isActive={activeView === "queue"}
            />
            <NavTab
              href={`/shoutouts/${location}`}
              label="Shout-Outs"
              icon="💬"
              isActive={activeView === "shoutouts"}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .rrCmdBarSpacer {
          height: 154px;
        }

        .rrCmdBarWrap {
          position: fixed;
          left: 0;
          right: 0;
          bottom: max(0px, env(safe-area-inset-bottom));
          z-index: 80;
          pointer-events: none;
          padding: 0 12px 12px;
        }

        .rrCmdBar {
          pointer-events: auto;
          max-width: 860px;
          margin: 0 auto;
          border-radius: 24px;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(12, 25, 46, 0.92) 0%, rgba(7, 15, 28, 0.96) 100%);
          border: 1px solid rgba(118, 174, 255, 0.18);
          box-shadow:
            0 18px 44px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.07),
            0 0 0 1px rgba(37, 88, 160, 0.18);
          backdrop-filter: blur(16px) saturate(130%);
          -webkit-backdrop-filter: blur(16px) saturate(130%);
        }

        .rrCmdTop {
          position: relative;
          display: flex;
          gap: 12px;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px 10px;
          background:
            radial-gradient(circle at 20% 0%, rgba(84, 129, 255, 0.16) 0%, transparent 38%),
            radial-gradient(circle at 85% 120%, rgba(129, 72, 255, 0.14) 0%, transparent 34%);
          border-bottom: 1px solid rgba(118, 174, 255, 0.12);
        }

        .rrCmdCopy {
          min-width: 0;
          flex: 1;
        }

        .rrCmdEyebrow {
          margin-bottom: 4px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(164, 206, 255, 0.95);
        }

        .rrCmdMessage {
          font-size: 13px;
          line-height: 1.35;
          font-weight: 700;
          color: rgba(245, 250, 255, 0.94);
          text-wrap: balance;
        }

        .rrCmdActions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .rrCmdAction {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.02em;
          text-decoration: none;
          white-space: nowrap;
          transition:
            transform 140ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            opacity 180ms ease;
        }

        .rrCmdAction:hover,
        .rrCmdAction:active {
          transform: translateY(-1px) scale(1.02);
        }

        .rrCmdActionPrimary {
          color: #ffffff;
          border: 1px solid rgba(131, 182, 255, 0.42);
          background:
            linear-gradient(180deg, rgba(88, 154, 255, 0.92) 0%, rgba(54, 113, 228, 0.95) 100%);
          box-shadow:
            0 8px 22px rgba(36, 95, 201, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.24);
        }

        .rrCmdActionPrimary:hover {
          box-shadow:
            0 10px 26px rgba(36, 95, 201, 0.4),
            0 0 0 1px rgba(153, 199, 255, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.28);
        }

        .rrCmdActionSecondary {
          color: rgba(237, 245, 255, 0.96);
          border: 1px solid rgba(118, 174, 255, 0.18);
          background: linear-gradient(180deg, rgba(23, 40, 67, 0.95) 0%, rgba(14, 24, 40, 0.98) 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .rrCmdPointsPill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 36px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(118, 174, 255, 0.18);
          background: rgba(10, 18, 34, 0.86);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .rrCmdPointsLabel {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(168, 202, 255, 0.88);
        }

        .rrCmdPointsValue {
          font-size: 15px;
          font-weight: 1000;
          color: #ffffff;
        }

        .rrCmdNav {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          padding: 12px;
        }

        .rrCmdTab {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 52px;
          padding: 0 12px;
          border-radius: 18px;
          overflow: hidden;
          text-decoration: none;
          border: 1px solid rgba(118, 174, 255, 0.12);
          background:
            linear-gradient(180deg, rgba(20, 34, 56, 0.94) 0%, rgba(10, 18, 31, 0.98) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 8px 20px rgba(0, 0, 0, 0.22);
          transition:
            transform 140ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .rrCmdTab:hover,
        .rrCmdTab:active {
          transform: translateY(-1px) scale(1.015);
          border-color: rgba(131, 182, 255, 0.26);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 10px 24px rgba(0, 0, 0, 0.28);
        }

        .rrCmdTabIcon {
          position: relative;
          z-index: 2;
          font-size: 16px;
          line-height: 1;
          filter: drop-shadow(0 0 10px rgba(121, 180, 255, 0.18));
        }

        .rrCmdTabLabel {
          position: relative;
          z-index: 2;
          font-size: 13px;
          font-weight: 1000;
          letter-spacing: 0.02em;
          color: rgba(235, 244, 255, 0.92);
        }

        .rrCmdTab.isActive {
          border-color: rgba(131, 182, 255, 0.3);
          background:
            radial-gradient(circle at 12% 0%, rgba(80, 131, 255, 0.22) 0%, transparent 42%),
            linear-gradient(180deg, rgba(31, 53, 86, 0.98) 0%, rgba(13, 23, 39, 1) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 12px 28px rgba(0, 0, 0, 0.32),
            0 0 0 1px rgba(118, 174, 255, 0.15);
        }

        .rrCmdTab.isActive::after {
          content: "";
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 8px;
          height: 3px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(110, 168, 255, 0.2), rgba(157, 206, 255, 0.95), rgba(110, 168, 255, 0.2));
          box-shadow: 0 0 16px rgba(115, 176, 255, 0.34);
        }

        .rrCmdSweep {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: linear-gradient(
            110deg,
            transparent 0%,
            transparent 36%,
            rgba(255, 255, 255, 0.02) 42%,
            rgba(170, 210, 255, 0.12) 49%,
            rgba(255, 255, 255, 0.22) 50%,
            rgba(170, 210, 255, 0.12) 51%,
            rgba(255, 255, 255, 0.02) 58%,
            transparent 64%,
            transparent 100%
          );
          background-size: 220% 100%;
          animation: rrSweep 5.5s linear infinite;
          mix-blend-mode: screen;
          opacity: 0.65;
        }

        .reducedMotion .rrCmdSweep {
          animation: none;
          opacity: 0.18;
        }

        .reducedMotion .rrCmdTab,
        .reducedMotion .rrCmdAction {
          transition: none;
        }

        @keyframes rrSweep {
          0% {
            background-position: 130% 0;
          }
          100% {
            background-position: -120% 0;
          }
        }

        @media (max-width: 720px) {
          .rrCmdBarSpacer {
            height: 170px;
          }

          .rrCmdTop {
            flex-direction: column;
            align-items: stretch;
          }

          .rrCmdActions {
            width: 100%;
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
          }

          .rrCmdAction {
            min-width: 0;
            padding: 0 10px;
          }

          .rrCmdPointsPill {
            justify-content: center;
          }
        }

        @media (max-width: 520px) {
          .rrCmdBarSpacer {
            height: 182px;
          }

          .rrCmdBarWrap {
            padding-left: 10px;
            padding-right: 10px;
            padding-bottom: 10px;
          }

          .rrCmdTop {
            padding: 10px 10px 8px;
          }

          .rrCmdActions {
            grid-template-columns: 1fr 1fr;
          }

          .rrCmdPointsPill {
            grid-column: 1 / -1;
          }

          .rrCmdNav {
            gap: 8px;
            padding: 10px;
          }

          .rrCmdTab {
            min-height: 50px;
            padding: 0 8px;
            gap: 6px;
          }

          .rrCmdTabLabel {
            font-size: 12px;
          }

          .rrCmdMessage {
            font-size: 12px;
          }
        }
      `}</style>
    </>
  );
}