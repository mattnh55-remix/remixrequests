"use client";

import { useEffect, useState } from "react";

type QueueItem = { id: string; title: string; artist: string; score: number; createdAt: string; type: string };

export default function AdminPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [msg, setMsg] = useState("");

  const [rules, setRules] = useState<any>(null);
  const [queue, setQueue] = useState<{ playNow: QueueItem[]; upNext: QueueItem[] } | null>(null);

  async function login() {
    setMsg("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin })
    });
    if (!res.ok) { setMsg("Wrong PIN."); return; }
    setAuthed(true);
  }

  async function loadAll() {
    const r1 = await fetch(`/api/admin/rules/get/${location}`, { cache: "no-store" });
    if (r1.status === 401) { setAuthed(false); return; }
    const d1 = await r1.json();
    setRules((prev: any) => prev ?? d1.rules);
    const r2 = await fetch(`/api/admin/queue/${location}`, { cache: "no-store" });
    const d2 = await r2.json();
    setQueue({ playNow: d2.playNow || [], upNext: d2.upNext || [] });
  }

  useEffect(() => {
    if (authed) {
      loadAll();
      const id = setInterval(loadAll, 3000);
      return () => clearInterval(id);
    }
  }, [authed]);

  async function saveRules() {
    setMsg("");
    const res = await fetch(`/api/admin/rules/set/${location}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rules)
    });
    const data = await res.json();
    if (!data.ok) setMsg("Failed to save rules.");
    else setMsg("✅ Rules saved.");
    await loadAll();
  }

  async function markPlayed(requestId: string) {
    await fetch(`/api/admin/queue/played`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId })
    });
    await loadAll();
  }

  async function reject(requestId: string) {
    const reason = prompt("Reject reason?", "Rejected");
    if (!reason) return;
    await fetch(`/api/admin/queue/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId, reason })
    });
    await loadAll();
  }

async function importFile(file: File) {
  setMsg("");
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`/api/admin/songs/import/${location}`, {
    method: "POST",
    body: form
  });

  const data = await res.json();
  if (!data.ok) setMsg(data.error || "Import failed.");
  else setMsg(`✅ Imported ${data.created} songs.`);
}
  if (!authed) {
    return (
      <div style={{ padding: 18, maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ margin: 0 }}>Admin • {location}</h1>
        <p style={{ opacity: 0.8 }}>Enter PIN to manage queue, rules, and songs.</p>
        <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" style={input} />
        <button onClick={login} style={btn}>Login</button>
        {msg && <div style={note}>{msg}</div>}
      </div>
    );
  }

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Admin • {location}</h1>
      <p style={{ opacity: 0.75, marginTop: 6 }}>Queue + Rules + Song Import</p>

      {msg && <div style={note}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16, marginTop: 14 }}>
        <div style={card}>
          <div style={h2}>PLAY NOW LANE</div>
          {(queue?.playNow || []).map((q) => (
            <div key={q.id} style={row}>
              <div>
                <div style={{ fontWeight: 900 }}>{q.title}</div>
                <div style={{ opacity: 0.75 }}>{q.artist} • score {q.score}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => markPlayed(q.id)} style={smallBtn}>Played</button>
                <button onClick={() => reject(q.id)} style={smallBtnAlt}>Reject</button>
              </div>
            </div>
          ))}
          {(queue?.playNow?.length || 0) === 0 ? <div style={{ opacity: 0.7 }}>No Play Now requests.</div> : null}

          <div style={{ height: 14 }} />

          <div style={h2}>UP NEXT</div>
          {(queue?.upNext || []).slice(0, 20).map((q, i) => (
            <div key={q.id} style={row}>
              <div>
                <div style={{ fontWeight: 900 }}>{i + 1}. {q.title}</div>
                <div style={{ opacity: 0.75 }}>{q.artist} • score {q.score}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => markPlayed(q.id)} style={smallBtn}>Played</button>
                <button onClick={() => reject(q.id)} style={smallBtnAlt}>Reject</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={card}>
            <div style={h2}>GLOBAL RULES</div>
            {!rules ? <div style={{ opacity: 0.7 }}>Loading rules…</div> : (
              <>
                <div style={{ display: "grid", gap: 10 }}>
                  <Field label="Request cost" value={rules.costRequest} onChange={(v) => setRules({ ...rules, costRequest: v })} />
                  <Field label="Upvote cost" value={rules.costUpvote} onChange={(v) => setRules({ ...rules, costUpvote: v })} />
                  <Field label="Downvote cost" value={rules.costDownvote} onChange={(v) => setRules({ ...rules, costDownvote: v })} />
                  <Field label="Play Now cost" value={rules.costPlayNow} onChange={(v) => setRules({ ...rules, costPlayNow: v })} />

                  <Field label="Max requests per user per session" value={rules.maxRequestsPerSession} onChange={(v) => setRules({ ...rules, maxRequestsPerSession: v })} />
                  <Field label="Max votes per user per session" value={rules.maxVotesPerSession} onChange={(v) => setRules({ ...rules, maxVotesPerSession: v })} />
                  <Field label="Min seconds between actions" value={rules.minSecondsBetweenActions} onChange={(v) => setRules({ ...rules, minSecondsBetweenActions: v })} />

                  <Toggle label="Enforce artist cooldown" checked={rules.enforceArtistCooldown} onChange={(c) => setRules({ ...rules, enforceArtistCooldown: c })} />
                  <Toggle label="Enforce song cooldown" checked={rules.enforceSongCooldown} onChange={(c) => setRules({ ...rules, enforceSongCooldown: c })} />
                  <Field label="Artist cooldown minutes" value={rules.artistCooldownMinutes} onChange={(v) => setRules({ ...rules, artistCooldownMinutes: v })} />
                  <Field label="Song cooldown minutes" value={rules.songCooldownMinutes} onChange={(v) => setRules({ ...rules, songCooldownMinutes: v })} />

                  <Toggle label="Enable voting" checked={rules.enableVoting} onChange={(c) => setRules({ ...rules, enableVoting: c })} />

                  <Text label="Logo URL (square or rectangle)" value={rules.logoUrl} onChange={(v) => setRules({ ...rules, logoUrl: v })} />
                  {rules.logoUrl ? (
                    <div style={{ marginTop: 6, opacity: 0.9 }}>
                      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Preview</div>
                      <img
                        src={rules.logoUrl}
                        alt="Logo preview"
                        style={{
                          height: 46,
                          width: "auto",
                          maxWidth: "100%",
                          objectFit: "contain",
                          borderRadius: 12,
                          border: "1px solid #2b2b55",
                          background: "#0b0b10",
                          padding: 8,
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                <div style={{ borderTop: "1px solid #1c1c2a", paddingTop: 12, marginTop: 12, display: "grid", gap: 10 }}>
                  <Text label="Explicit message" value={rules.msgExplicit} onChange={(t) => setRules({ ...rules, msgExplicit: t })} />
                  <Text label="Already requested message" value={rules.msgAlreadyRequested} onChange={(t) => setRules({ ...rules, msgAlreadyRequested: t })} />
                  <Text label="Artist cooldown message" value={rules.msgArtistCooldown} onChange={(t) => setRules({ ...rules, msgArtistCooldown: t })} />
                  <Text label="Song cooldown message" value={rules.msgSongCooldown} onChange={(t) => setRules({ ...rules, msgSongCooldown: t })} />
                  <Text label="No credits message" value={rules.msgNoCredits} onChange={(t) => setRules({ ...rules, msgNoCredits: t })} />
                </div>

                <button onClick={saveRules} style={btn}>Save rules</button>
              </>
            )}
          </div>

          <div style={card}>
            <div style={h2}>IMPORT SONGS (CSV)</div>
            <p style={{ opacity: 0.75, marginTop: 6 }}>
              Columns: <code>title,artist,explicit,tags,artworkUrl</code>
            </p>
            <input
              type="file"
		accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
			if (f) importFile(f);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ opacity: 0.85 }}>{label}</span>
      <input value={String(value ?? "")} onChange={(e) => onChange(Number(e.target.value))} style={input} />
    </label>
  );
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ opacity: 0.85 }}>{label}</span>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} style={input} />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ opacity: 0.9 }}>{label}</span>
    </label>
  );
}

const input: any = { padding: 12, borderRadius: 12, border: "1px solid #333", background: "#0b0b10", color: "white" };
const btn: any = { padding: 12, borderRadius: 14, border: "1px solid #2b2b55", background: "#15153a", color: "white", fontWeight: 900, cursor: "pointer", marginTop: 12 };
const smallBtn: any = { padding: "10px 12px", borderRadius: 12, border: "1px solid #2b2b55", background: "#15153a", color: "white", fontWeight: 900, cursor: "pointer" };
const smallBtnAlt: any = { padding: "10px 12px", borderRadius: 12, border: "1px solid #333", background: "#0c0c16", color: "white", fontWeight: 900, cursor: "pointer" };
const note: any = { marginTop: 12, padding: 12, borderRadius: 12, background: "#121228" };
const card: any = { borderRadius: 22, border: "1px solid #222", background: "rgba(0,0,0,0.35)", padding: 16 };
const h2: any = { fontSize: 18, fontWeight: 900, letterSpacing: 1, opacity: 0.9, marginBottom: 10 };
const row: any = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: 12, borderRadius: 16, border: "1px solid #1c1c2f", background: "rgba(10,10,20,0.75)", marginBottom: 10 };
