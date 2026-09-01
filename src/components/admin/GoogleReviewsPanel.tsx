"use client";

import { useEffect, useState } from "react";

type Review = { id: string; reviewer: string; rating: string; comment: string; updatedAt: string | null; hasReply: boolean };
type Connection = { displayName: string | null; updatedAt: string } | null;

function stars(rating: string) {
  const amount = Number(String(rating).replace(/[^0-9]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? "★".repeat(Math.min(5, amount)) + "☆".repeat(Math.max(0, 5 - amount)) : "No rating";
}

export default function GoogleReviewsPanel({ locationSlug }: { locationSlug: string }) {
  const [connection, setConnection] = useState<Connection>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setBusy(true); setError("");
    try {
      const status = await fetch(`/api/admin/google/status?locationSlug=${encodeURIComponent(locationSlug)}`, { cache: "no-store" }).then((r) => r.json());
      if (!status.ok) throw new Error(status.error || "Could not check Google connection.");
      setConnection(status.connection || null);
      if (!status.connected) { setReviews([]); return; }
      const result = await fetch(`/api/admin/google/reviews?locationSlug=${encodeURIComponent(locationSlug)}`, { cache: "no-store" }).then((r) => r.json());
      if (!result.ok) throw new Error(result.error || "Could not load Google reviews.");
      setReviews(result.reviews || []);
    } catch (value: any) { setError(value?.message || "Could not load Google reviews."); }
    finally { setBusy(false); }
  }

  useEffect(() => { void refresh(); }, [locationSlug]);

  return (
    <div className="admPanel">
      <div className="admPanelHead">
        <div>
          <div className="admPanelTitle">Google review inbox</div>
          <div className="admPanelSub">Read-only feed for daily reputation follow-up. Review replies still happen in Google Business Profile.</div>
        </div>
        <div className="admActionRow">
          {connection ? <button type="button" className="admBtnGhost" onClick={() => window.open("https://business.google.com/", "_blank", "noopener,noreferrer")}>Open Google</button> : null}
          <button type="button" className="admBtn" onClick={() => connection ? void refresh() : window.location.assign(`/api/admin/google/login?locationSlug=${encodeURIComponent(locationSlug)}`)} disabled={busy}>
            {busy ? "Checking…" : connection ? "Refresh reviews" : "Connect Google"}
          </button>
        </div>
      </div>
      <div className="admPanelBody">
        {error ? <div className="admSubPanel"><div className="admSubCopy">{error}</div></div> : !connection && !busy ? <div className="admSubPanel"><div className="admSubTitleText">Not connected</div><div className="admSubCopy" style={{ marginTop: 4 }}>Connect the one Google Business Profile for this location to bring its latest ten reviews here.</div></div> : null}
        {connection ? <div className="admFieldHelp" style={{ marginBottom: 12 }}>Connected to {connection.displayName || "Google Business Profile"}.</div> : null}
        {connection && !busy && reviews.length === 0 ? <div className="admSubPanel"><div className="admSubCopy">No reviews were returned yet.</div></div> : null}
        {reviews.map((review) => <div key={review.id} className="admRow" style={{ marginBottom: 8 }}>
          <div className="admTextWrap" style={{ flex: 1 }}><div style={{ fontWeight: 900 }}>{review.reviewer} <span style={{ color: "#e7bd5d" }}>{stars(review.rating)}</span></div><div className="admFieldHelp" style={{ marginTop: 4 }}>{review.updatedAt ? new Date(review.updatedAt).toLocaleString() : "Recent"} · {review.hasReply ? "Reply posted" : "Needs reply"}</div>{review.comment ? <div className="admSubCopy" style={{ marginTop: 8 }}>{review.comment}</div> : null}</div>
        </div>)}
      </div>
    </div>
  );
}
