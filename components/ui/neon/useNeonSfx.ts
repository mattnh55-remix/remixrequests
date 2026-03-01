"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Tiny embedded sounds (short + lightweight). You can swap these later.
const TAP_MP3 =
  "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const SUCCESS_MP3 =
  "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAADAAACcQCA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const ERROR_MP3 =
  "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAADAAACcQCA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/**
 * Neon SFX:
 * - Must "unlock" audio after first user gesture (mobile policy).
 * - Provides playTap/playSuccess/playError.
 * - Includes mute toggle persisted in localStorage.
 */
export function useNeonSfx() {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("neonMuted") === "1";
  });

  const [unlocked, setUnlocked] = useState(false);

  const tapRef = useRef<HTMLAudioElement | null>(null);
  const successRef = useRef<HTMLAudioElement | null>(null);
  const errorRef = useRef<HTMLAudioElement | null>(null);

  const sounds = useMemo(() => {
    if (typeof window === "undefined") return null;
    return {
      tap: new Audio(TAP_MP3),
      success: new Audio(SUCCESS_MP3),
      error: new Audio(ERROR_MP3),
    };
  }, []);

  useEffect(() => {
    if (!sounds) return;

    // Configure audio for snappy SFX
    sounds.tap.preload = "auto";
    sounds.success.preload = "auto";
    sounds.error.preload = "auto";

    tapRef.current = sounds.tap;
    successRef.current = sounds.success;
    errorRef.current = sounds.error;

    const unlock = async () => {
      // attempt silent play/pause to unlock on iOS/Android after gesture
      try {
        const a = tapRef.current;
        if (!a) return;
        a.muted = true;
        await a.play();
        a.pause();
        a.currentTime = 0;
        a.muted = muted;
        setUnlocked(true);
      } catch {
        // some browsers still need explicit play later; that's fine
        setUnlocked(true);
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sounds]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("neonMuted", muted ? "1" : "0");
    }
    // Apply mute to existing audio objects
    if (tapRef.current) tapRef.current.muted = muted;
    if (successRef.current) successRef.current.muted = muted;
    if (errorRef.current) errorRef.current.muted = muted;
  }, [muted]);

  function safePlay(a: HTMLAudioElement | null) {
    if (!a || muted || !unlocked) return;
    try {
      a.currentTime = 0;
      void a.play();
    } catch {
      // ignore
    }
  }

  return {
    muted,
    setMuted,
    playTap: () => safePlay(tapRef.current),
    playSuccess: () => safePlay(successRef.current),
    playError: () => safePlay(errorRef.current),
  };
}