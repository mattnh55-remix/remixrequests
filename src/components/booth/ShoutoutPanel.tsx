"use client";

import type { ShoutoutItem } from "./types";
import { formatTimeAgo } from "./booth-utils";

type Props = {
  pending: ShoutoutItem[];
  approved: ShoutoutItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
};

function ShoutoutRow({ item, pending, onApprove, onReject }: { item: ShoutoutItem; pending?: boolean; onApprove: (id: string) => void; onReject: (id: string) => void; }) {
  return (
    <div className="gunmetalBox shoutRow">
      <div className="shoutTop"><strong>{item.fromName || "Guest"}</strong><span>{formatTimeAgo(item.createdAt)}</span></div>
      <div className="shoutText">{item.messageText || "No text."}</div>
      {pending ? <div className="requestRowActions"><button type="button" className="gunBtn gunBtn--primary" onClick={() => onApprove(item.id)}>Approve</button><button type="button" className="gunBtn gunBtn--danger" onClick={() => onReject(item.id)}>Reject</button></div> : null}
    </div>
  );
}

export default function ShoutoutPanel({ pending, approved, onApprove, onReject }: Props) {
  return (
    <div className="columnPanel">
      <div className="panelHead"><div><h3>Shoutouts</h3><p>Message moderation and recently approved callouts.</p></div></div>
      <div className="sectionLabel">Pending</div>
      <div className="requestList">{pending.length === 0 ? <div className="emptyMini">No pending shoutouts.</div> : pending.map((item) => <ShoutoutRow key={item.id} item={item} pending onApprove={onApprove} onReject={onReject} />)}</div>
      <div className="sectionLabel sectionLabel--spaced">Approved</div>
      <div className="requestList">{approved.length === 0 ? <div className="emptyMini">No approved shoutouts.</div> : approved.map((item) => <ShoutoutRow key={item.id} item={item} onApprove={onApprove} onReject={onReject} />)}</div>
    </div>
  );
}
