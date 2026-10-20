"use client";

import { useEffect, useSyncExternalStore } from "react";

import { copy } from "@/lib/content";
import { getServerSound, getSound, initSound, setSoundOn, subscribeSound } from "@/lib/sound";

/** Header switch for the background music. */
export function SoundToggle() {
  const on = useSyncExternalStore(subscribeSound, getSound, getServerSound);
  useEffect(() => initSound(), []);

  return (
    <button
      type="button"
      className="sound-btn"
      aria-pressed={on}
      title={copy.sound.hint}
      onClick={() => setSoundOn(!on)}
    >
      <span className="sound-bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {copy.sound.label}
    </button>
  );
}
