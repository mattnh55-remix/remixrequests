"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PublicTheme from "../components/ui/public/PublicTheme";
import confetti from "canvas-confetti";

const REMIX_LOGO_URL =
  "https://skateremix.com/wp-content/uploads/2026/03/Remix_Globe_Logo_350px.png";

export default function HomePage() {
  const router = useRouter();

  // ✅ Set location + confetti
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("rr_location")) {
        localStorage.setItem("rr_location", "remix");
      }
    }

    // 🎉 Confetti
    confetti({
      particleCount: 80,
      spread: 70,
      startVelocity: 35,
      gravity: 0.9,
      origin: { x: 0.5, y: 0.4 },
      colors: ["#6ee7f9", "#d946ef", "#ffffff"],
    });

    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { x: 0.3, y: 0.5 },
      });
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { x: 0.7, y: 0.5 },
      });
    }, 120);
  }, []);

  const location =
    typeof window !== "undefined"
      ? localStorage.getItem("rr_location") || "remix"
      : "remix";

  return (
    <PublicTheme>
      <div className="rrWelcome">

        {/* LOGO */}
        <div className="rrWelcomeLogo">
          <img src={REMIX_LOGO_URL} alt="Remix" />
        </div>

        {/* HEADLINE */}
        <div className="rrWelcomeHero">
          <div className="rrWelcomeTitle">CONTROL THE MUSIC</div>
          <div className="rrWelcomeSub">
            Request songs. Boost favorites. Earn bonus points.
          </div>
        </div>

        {/* BONUS CARD */}
        <div className="rrBonusCard">
          <div className="rrBonusBadge">THIS WEEK</div>

          <div className="rrBonusTitle">
            Leave a Google Review
          </div>

          <div className="rrBonusPoints">+10 POINTS</div>

          <div className="rrBonusSub">
            Show a staff member to receive your bonus card
          </div>

          <div className="rrBonusActions">
            <button
              className="rrBtn"
              onClick={() =>
                window.open("https://g.page/r/YOUR_LINK_HERE/review", "_blank")
              }
            >
              Leave Review
            </button>

            <button
              className="rrBtnGhost"
              onClick={() =>
                router.push(`/request/${encodeURIComponent(location)}?verify=1`)
              }
            >
              I Have a Code
            </button>
          </div>
        </div>

        {/* HOW IT WORKS */}
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

        {/* CTA */}
        <button
          className="rrEnterBtn"
          onClick={() =>
            router.push(`/request/${encodeURIComponent(location)}`)
          }
        >
          ENTER REMIX
        </button>

      </div>

      {/* STYLES */}
      <style jsx>{`
        .rrWelcome {
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
        }

        .rrBonusTitle {
          font-size: 20px;
          font-weight: 900;
        }

        .rrBonusPoints {
          color: #6ee7f9;
          font-weight: 1000;
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
        }

        .rrEnterBtn {
          padding: 14px;
          border-radius: 14px;
          font-weight: 1000;
          background: linear-gradient(180deg, #4d8fe4, #2f6fc6);
          border: none;
          color: white;
        }
      `}</style>
    </PublicTheme>
  );
}