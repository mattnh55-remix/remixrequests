"use client";

import { useEffect, useState } from "react";

type BoothNotesPanelProps = {
  storageKey: string;
};

export default function BoothNotesPanel({ storageKey }: BoothNotesPanelProps) {
  const [value, setValue] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey) ?? "";
      const savedTime = window.localStorage.getItem(`${storageKey}:savedAt`);
      setValue(saved);
      setSavedAt(savedTime);
    } catch {
      // ignore localStorage issues
    }
  }, [storageKey]);

  function handleSave() {
    try {
      window.localStorage.setItem(storageKey, value);
      const iso = new Date().toISOString();
      window.localStorage.setItem(`${storageKey}:savedAt`, iso);
      setSavedAt(iso);
    } catch {
      // ignore localStorage issues
    }
  }

  return (
    <section className="boothPanel boothPanel--compact">
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">Booth Notes</div>
          <div className="boothPanelSub">
            Local booth scratch pad for this machine until shared save is wired.
          </div>
        </div>
      </div>

      <div className="rrBoothNotes">
        <textarea
          className="gunmetalInput rrBoothNotes__textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          placeholder="Leave yourself quick booth notes here..."
        />

        <div className="rrBoothNotes__footer">
          <div className="rrBoothNotes__saved">
            {savedAt
              ? `Saved ${new Date(savedAt).toLocaleTimeString()}`
              : "Not saved yet"}
          </div>

          <button
            type="button"
            className="gunmetalBtn gunmetalBtn--primary gunmetalBtn--mini"
            onClick={handleSave}
          >
            Save Note
          </button>
        </div>
      </div>
    </section>
  );
}