"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UiDensityMode = "simple" | "detail";
export type UiTextSize = "standard" | "large";

export interface UiPreferences {
  density: UiDensityMode;
  textSize: UiTextSize;
}

const UI_PREFERENCES_STORAGE_KEY = "maguromaru-note.ui-preferences.v1";

const DEFAULT_UI_PREFERENCES: UiPreferences = {
  density: "simple",
  textSize: "standard",
};

interface UiPreferencesContextValue {
  preferences: UiPreferences;
  setDensity: (density: UiDensityMode) => void;
  setTextSize: (textSize: UiTextSize) => void;
}

const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(null);

function readStoredPreferences(): UiPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_UI_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_UI_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      density: parsed.density === "detail" ? "detail" : "simple",
      textSize: parsed.textSize === "large" ? "large" : "standard",
    };
  } catch {
    return DEFAULT_UI_PREFERENCES;
  }
}

function persistPreferences(preferences: UiPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export function UiPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UiPreferences>(() => readStoredPreferences());

  useEffect(() => {
    persistPreferences(preferences);
  }, [preferences]);

  const value = useMemo<UiPreferencesContextValue>(
    () => ({
      preferences,
      setDensity: (density) => setPreferences((current) => ({ ...current, density })),
      setTextSize: (textSize) => setPreferences((current) => ({ ...current, textSize })),
    }),
    [preferences],
  );

  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
}

export function useUiPreferences() {
  const value = useContext(UiPreferencesContext);
  if (!value) {
    throw new Error("UiPreferencesProvider is missing.");
  }
  return value;
}
