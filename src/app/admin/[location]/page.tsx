"use client";

import { useEffect, useState } from "react";
import { SHOUTOUT_PRODUCTS } from "@/lib/shoutoutProducts";

type RequestItem = {
  id: string;
  title: string;
  artist: string;
  score: number;
};

type MessageItem = {
  id: string;
  fromName: string;
  messageText: string;
  tier: string;
};

export default function AdminPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [tab, setTab] = useState("dashboard");

  const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
  const [pendingMessages, setPendingMessages] = useState<MessageItem[]>([]);

  async function loadRequests() {
    const res = await fetch(`/api/admin/queue/${location}`);
    const data = await res.json();
    setPendingRequests(data.pending || []);
  }

  async function loadMessages() {
    const res = await fetch(`/api/admin/shoutouts/${location}`);
    const data = await res.json();
    setPendingMessages(data.pending || []);
  }

  async function approveMessage(id: string) {
    await fetch(`/api/admin/shoutouts/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });

    loadMessages();
  }

  async function rejectMessage(id: string) {
    await fetch(`/api/admin/shoutouts/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });

    loadMessages();
  }

  useEffect(() => {
    loadRequests();
    loadMessages();
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
        <img src="/logo.png" style={{ height: 40, marginRight: 12 }} />
        <h1>Admin Dashboard</h1>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setTab("dashboard")}>Dashboard</button>
        <button onClick={() => setTab("requestSettings")}>Request Settings</button>
        <button onClick={() => setTab("top10")}>Top 10</button>
        <button onClick={() => setTab("users")}>Users and Points</button>
        <button onClick={() => setTab("shoutoutSettings")}>Shoutout Settings</button>
      </div>

      {tab === "dashboard" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
          
          <div>
            <h2>Pending Requests</h2>

            {pendingRequests.map((r) => (
              <div
                key={r.id}
                style={{
                  border: "1px solid #444",
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <b>{r.title}</b> — {r.artist}
                <div>Score: {r.score}</div>
              </div>
            ))}
          </div>

          <div>
            <h2>Pending Shout Outs</h2>

            {pendingMessages.map((m) => {
              const product = SHOUTOUT_PRODUCTS[m.tier as any];

              return (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid #444",
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{m.fromName}</div>

                  <div style={{ marginBottom: 6 }}>{m.messageText}</div>

                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {product?.title}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={() => approveMessage(m.id)}
                      style={{ marginRight: 10 }}
                    >
                      Approve
                    </button>

                    <button onClick={() => rejectMessage(m.id)}>
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "shoutoutSettings" && (
        <div>
          <h2>Shout Out Products</h2>

          {Object.values(SHOUTOUT_PRODUCTS).map((p) => (
            <div
              key={p.id}
              style={{
                border: "1px solid #444",
                padding: 12,
                marginBottom: 10,
              }}
            >
              <b>{p.title}</b>

              <div>{p.description}</div>

              <div style={{ fontSize: 13, marginTop: 6 }}>
                Cost: {p.creditsCost} credits
              </div>

              <div style={{ fontSize: 13 }}>
                Duration: {Math.round(p.durationSec / 60)} minutes
              </div>

              {p.hasPhoto && (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Photo tier (requires moderation)
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}