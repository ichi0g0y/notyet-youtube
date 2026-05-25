import * as Switch from "@radix-ui/react-switch";
import { type ReactNode, StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useActionIconTheme } from "./icon-theme";
import { ALL_SCOPES, getMarkedCount, getSettings, saveSettings, type Scope, type Settings } from "./storage";

type Locale = "en" | "ja";
type MarkedCount = { count: number; cap: number };

const MESSAGES = {
  en: {
    eyebrow: "Move on. Find new.",
    title: "fadee",
    subtitle: "Tame your YouTube feeds by hiding videos you've already watched.",
    masterOn: "Filter on",
    masterOff: "Filter off",
    markedCountLabel: "Marked",
    sectionScopes: "Where to filter",
    sectionExtras: "Extras",
    scope: {
      "channel-videos": "Channel · Videos",
      "channel-shorts": "Channel · Shorts",
      "channel-live": "Channel · Streams",
      subscriptions: "Subscriptions",
      home: "Home",
      search: "Search results"
    },
    removeShortsSection: "Hide all Shorts",
    removeShortsSectionHint: "Removes Shorts shelves and any inline Shorts cards in feeds.",
    hideHomeShelves: "Hide themed shelves on Home",
    hideHomeShelvesHint: "Removes news / topic shelves on the Home feed.",
    skipTopRecommendations: "Keep top recommendations",
    skipTopRecommendationsHint: "Leaves the first items on Home untouched (they don't auto-refill).",
    topCountLabel: "Items to keep",
    watchedThresholdLabel: "Counts as watched after",
    watchedThresholdHint: "Slide right to require more progress before hiding."
  },
  ja: {
    eyebrow: "視聴済みは、視界の外へ。",
    title: "fadee",
    subtitle: "視聴済み動画を隠して YouTube フィードをすっきり保つ。",
    masterOn: "フィルタ ON",
    masterOff: "フィルタ OFF",
    markedCountLabel: "視聴済み",
    sectionScopes: "どこをフィルタするか",
    sectionExtras: "その他",
    scope: {
      "channel-videos": "チャンネル · 動画",
      "channel-shorts": "チャンネル · ショート",
      "channel-live": "チャンネル · ライブ",
      subscriptions: "登録チャンネル",
      home: "ホーム",
      search: "検索結果"
    },
    removeShortsSection: "Shorts を全部隠す",
    removeShortsSectionHint: "Shorts の棚も、フィード内の単独カードもまとめて消す。",
    hideHomeShelves: "ホームのテーマ別シェルフを隠す",
    hideHomeShelvesHint: "ニュース速報・トピック別おすすめなど横並びシェルフを消す。",
    skipTopRecommendations: "おすすめにフィルターを適用しない",
    skipTopRecommendationsHint: "ホーム先頭はフィルタしない（補填されないため）。",
    topCountLabel: "残す件数",
    watchedThresholdLabel: "視聴済みとみなす再生率",
    watchedThresholdHint: "右に動かすほど、ほぼ完視聴のみ非表示。"
  }
} as const;

const locale: Locale = (navigator.language || "en").toLowerCase().startsWith("ja") ? "ja" : "en";
const t = MESSAGES[locale];
const MARKED_META_KEY = "fadee_marked_meta_v2";
const MARKED_SHARD_PREFIX = "fadee_marked_v2_";

function isMarkedStorageKey(key: string): boolean {
  return key === MARKED_META_KEY || key.startsWith(MARKED_SHARD_PREFIX);
}

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [markedCount, setMarkedCount] = useState<MarkedCount | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    let active = true;
    let seq = 0;
    const refresh = () => {
      const mine = ++seq;
      void getMarkedCount()
        .then((next) => { if (active && mine === seq) setMarkedCount(next); })
        .catch((error) => {
          console.warn("Failed to refresh marked count", error);
          if (active && mine === seq) setMarkedCount(null);
        });
    };
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === "sync" && Object.keys(changes).some(isMarkedStorageKey)) refresh();
    };

    refresh();
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  useActionIconTheme();

  if (!settings) {
    return <div className="py-16 text-center text-sm text-muted">…</div>;
  }

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    void saveSettings(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <Hero settings={settings} markedCount={markedCount} onToggle={(enabled) => update({ enabled })} />

      <Panel title={t.sectionScopes}>
        {ALL_SCOPES.map((scope) => (
          <ToggleRow
            key={scope}
            label={t.scope[scope]}
            checked={settings.activeScopes[scope]}
            disabled={!settings.enabled}
            onChange={(checked) =>
              update({ activeScopes: { ...settings.activeScopes, [scope]: checked } })
            }
          />
        ))}
      </Panel>

      <Panel title={t.sectionExtras}>
        <ToggleRow
          label={t.removeShortsSection}
          hint={t.removeShortsSectionHint}
          checked={settings.removeShortsSection}
          disabled={!settings.enabled}
          onChange={(checked) => update({ removeShortsSection: checked })}
        />
        <ToggleRow
          label={t.hideHomeShelves}
          hint={t.hideHomeShelvesHint}
          checked={settings.hideHomeShelves}
          disabled={!settings.enabled}
          onChange={(checked) => update({ hideHomeShelves: checked })}
        />
        <ToggleRow
          label={t.skipTopRecommendations}
          hint={t.skipTopRecommendationsHint}
          checked={settings.skipTopRecommendations}
          disabled={!settings.enabled}
          onChange={(checked) => update({ skipTopRecommendations: checked })}
        />
        {settings.skipTopRecommendations && (
          <NumberRow
            label={t.topCountLabel}
            value={settings.topRecommendationsCount}
            min={1}
            max={60}
            onChange={(value) => update({ topRecommendationsCount: value })}
          />
        )}
        <SliderRow
          label={t.watchedThresholdLabel}
          hint={t.watchedThresholdHint}
          value={settings.watchedThreshold}
          onChange={(value) => update({ watchedThreshold: value })}
        />
      </Panel>
    </div>
  );
}

function Hero({ settings, markedCount, onToggle }: { settings: Settings; markedCount: MarkedCount | null; onToggle: (v: boolean) => void }) {
  return (
    <header className="flex items-start justify-between gap-3 px-1 pt-1">
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          {t.eyebrow}
        </p>
        <h1 className="m-0 mt-1 text-2xl tracking-wide text-ink">{t.title}</h1>
        <p className="mt-1 text-[12px] leading-snug text-muted">{t.subtitle}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-accent">
            {settings.enabled ? t.masterOn : t.masterOff}
          </p>
          <MarkedCountBadge value={markedCount} />
        </div>
      </div>
      <ToggleSwitch checked={settings.enabled} onChange={onToggle} ariaLabel={t.title} />
    </header>
  );
}

function MarkedCountBadge({ value }: { value: MarkedCount | null }) {
  if (!value) return null;
  return (
    <div className="rounded-full bg-[rgba(27,26,22,0.06)] px-2 py-0.5 text-[11px] font-semibold text-muted">
      {t.markedCountLabel} {value.count.toLocaleString()} / {value.cap.toLocaleString()}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel-rise rounded-2xl border border-outline bg-card p-3.5 shadow-[0_10px_24px_rgba(33,25,15,0.08)]">
      <h2 className="m-0 mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {title}
      </h2>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function ToggleRow({ label, hint, checked, disabled, onChange }: { label: string; hint?: string; checked: boolean; disabled?: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition ${
        disabled ? "opacity-50" : "hover:bg-[rgba(213,107,47,0.06)]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] leading-snug text-muted">{hint}</div>}
      </div>
      <ToggleSwitch checked={checked} disabled={disabled} onChange={onChange} ariaLabel={label} />
    </label>
  );
}

function NumberRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl px-2 py-2">
      <div className="text-[13px] font-semibold text-ink">{label}</div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className="w-16 rounded-lg border border-outline bg-white px-2 py-1 text-right text-[13px] text-ink focus:border-accent focus:outline-2 focus:outline-[rgba(213,107,47,0.35)]"
      />
    </label>
  );
}

function SliderRow({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (v: number) => void }) {
  const percent = Math.round(value * 100);
  return (
    <div className="space-y-1 rounded-xl px-2 py-2">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-ink">{label}</div>
        <div className="rounded-full bg-[rgba(213,107,47,0.12)] px-2 py-0.5 text-[11px] font-semibold text-accent-dark">
          {percent}%
        </div>
      </div>
      {hint && <div className="text-[11px] leading-snug text-muted">{hint}</div>}
      <input
        type="range"
        min={0}
        max={100}
        value={percent}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10) / 100)}
        className="w-full accent-accent"
      />
    </div>
  );
}

function ToggleSwitch({ checked, disabled, onChange, ariaLabel }: { checked: boolean; disabled?: boolean | undefined; onChange: (v: boolean) => void; ariaLabel: string }) {
  return (
    <Switch.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
      aria-label={ariaLabel}
      className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-outline bg-[rgba(27,26,22,0.08)] transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent disabled:cursor-not-allowed"
    >
      <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-card shadow-[0_2px_6px_rgba(33,25,15,0.25)] transition-transform data-[state=checked]:translate-x-[22px]" />
    </Switch.Root>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
