"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import SongManagementPanel from "@/components/admin/SongManagementPanel";

type TabKey =
  | "dashboard"
  | "songs"
  | "requestSettings"
  | "top10"
  | "users"
  | "shoutoutSettings";

export default function AdminPage() {
  const params = useParams();
  const location = String(params.location);

  const [tab, setTab] = useState<TabKey>("dashboard");
  const [rules, setRules] = useState<any>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadRules() {
      try {
        const res = await fetch(`/api/admin/rules/get/${location}`);
        const data = await res.json();
        if (data?.rules) setRules(data.rules);
      } catch (err) {
        console.error(err);
      }
    }

    loadRules();
  }, [location]);

  function TabButton({
    children,
    active,
    onClick,
  }: {
    children: React.ReactNode;
    active: boolean;
    onClick: () => void;
  }) {
    return (
      <button
        onClick={onClick}
        className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
          active
            ? "bg-blue-600 text-white"
            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        }`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin • {location}</h1>
        {msg && (
          <div className="text-sm text-green-400 font-semibold">{msg}</div>
        )}
      </div>

      {/* TABS */}
      <div className="flex gap-2 flex-wrap">
        <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
          Dashboard
        </TabButton>

        <TabButton active={tab === "songs"} onClick={() => setTab("songs")}>
          Songs
        </TabButton>

        <TabButton
          active={tab === "requestSettings"}
          onClick={() => setTab("requestSettings")}
        >
          Request Settings
        </TabButton>

        <TabButton active={tab === "top10"} onClick={() => setTab("top10")}>
          Top 10
        </TabButton>

        <TabButton active={tab === "users"} onClick={() => setTab("users")}>
          Users
        </TabButton>

        <TabButton
          active={tab === "shoutoutSettings"}
          onClick={() => setTab("shoutoutSettings")}
        >
          Shoutouts
        </TabButton>
      </div>

      {/* CONTENT */}

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <div className="bg-zinc-900 p-6 rounded-xl">
          <h2 className="text-lg font-bold mb-2">Dashboard</h2>
          <p className="text-zinc-400 text-sm">
            Admin overview panel (keep your existing widgets here).
          </p>
        </div>
      )}

      {/* SONG MANAGEMENT */}
      {tab === "songs" && (
        <SongManagementPanel
          location={location}
          rules={
            rules
              ? {
                  albumArtBaseUrl: rules.albumArtBaseUrl,
                  defaultAlbumArtUrl: rules.defaultAlbumArtUrl,
                }
              : null
          }
          onGlobalMessage={setMsg}
        />
      )}

      {/* REQUEST SETTINGS */}
      {tab === "requestSettings" && (
        <div className="bg-zinc-900 p-6 rounded-xl">
          <h2 className="text-lg font-bold mb-2">Request Settings</h2>
          <p className="text-zinc-400 text-sm">
            Existing request settings UI remains unchanged.
          </p>
        </div>
      )}

      {/* TOP 10 */}
      {tab === "top10" && (
        <div className="bg-zinc-900 p-6 rounded-xl">
          <h2 className="text-lg font-bold mb-2">Top 10</h2>
          <p className="text-zinc-400 text-sm">
            Existing Top 10 management UI.
          </p>
        </div>
      )}

      {/* USERS */}
      {tab === "users" && (
        <div className="bg-zinc-900 p-6 rounded-xl">
          <h2 className="text-lg font-bold mb-2">Users</h2>
          <p className="text-zinc-400 text-sm">
            Existing user management UI.
          </p>
        </div>
      )}

      {/* SHOUTOUTS */}
      {tab === "shoutoutSettings" && (
        <div className="bg-zinc-900 p-6 rounded-xl">
          <h2 className="text-lg font-bold mb-2">Shoutouts</h2>
          <p className="text-zinc-400 text-sm">
            Existing shoutout settings UI.
          </p>
        </div>
      )}
    </div>
  );
}