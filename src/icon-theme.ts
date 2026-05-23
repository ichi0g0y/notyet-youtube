import { useEffect } from "react";

const ICON_SIZES = [16, 32, 48, 128] as const;

function iconPathsFor(theme: "light" | "dark"): Record<number, string> {
  return Object.fromEntries(ICON_SIZES.map((size) => [size, `icons/${theme}/${size}.png`]));
}

export function useActionIconTheme(): void {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (isDark: boolean) => {
      void chrome.action.setIcon({ path: iconPathsFor(isDark ? "dark" : "light") });
    };
    apply(mq.matches);
    const handler = (event: MediaQueryListEvent) => apply(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
}
