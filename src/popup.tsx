import * as Switch from "@radix-ui/react-switch";
import { DeleteIcon } from "lolicon/Delete";
import { type ReactNode, StrictMode, createContext, useContext, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ALL_LOCALE_OVERRIDES, ALL_SCOPES, clearMarked, getSettings, getSyncStorageUsage, saveSettings, type LocaleOverride, type Scope, type Settings } from "./storage";

type Locale = "en" | "ja";
type SyncUsage = { count: number; bytesInUse: number; bytesQuota: number };

function resolveLocale(override: LocaleOverride): Locale {
  if (override === "en" || override === "ja") return override;
  return (navigator.language || "en").toLowerCase().startsWith("ja") ? "ja" : "en";
}

const SYNC_BYTES_WARNING_RATIO = 0.8;

const MESSAGES = {
  en: {
    title: "fadee",
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
    watchedThresholdHint: "Slide right to require more progress before hiding.",
    clearAction: "Clear",
    clearTooltip: "Remove every manually-marked video.",
    clearConfirm: (n: number) => `Clear all ${n} manually-marked videos? This cannot be undone.`,
    syncUsageTooltip: "Free Chrome sync storage. Used by your settings and manually-marked video IDs (Chrome cap: 100 KB, syncs across devices).",
    localeTooltip: "Popup language. Auto follows your browser language."
  },
  ja: {
    title: "fadee",
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
    watchedThresholdHint: "右に動かすほど、ほぼ完視聴のみ非表示。",
    clearAction: "クリア",
    clearTooltip: "手動マーク済の動画を全てクリアする。",
    clearConfirm: (n: number) => `手動マーク済 ${n} 件をクリアしますか？取り消しはできません。`,
    syncUsageTooltip: "Chrome sync 領域の空き容量。手動マーク済み動画ID + 設定が使用中（Chrome 上限 100 KB、端末間で同期される）。",
    localeTooltip: "ポップアップの表示言語。Auto はブラウザの言語に追従。"
  }
} as const;

const LOCALE_LABELS: Record<LocaleOverride, string> = { auto: "Auto", en: "EN", ja: "JA" };

type Messages = (typeof MESSAGES)[Locale];
const MessagesContext = createContext<Messages>(MESSAGES.en);
const useT = (): Messages => useContext(MessagesContext);

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [syncUsage, setSyncUsage] = useState<SyncUsage | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    let active = true;
    let seq = 0;
    const refresh = () => {
      const mine = ++seq;
      void getSyncStorageUsage()
        .then((next) => { if (active && mine === seq) setSyncUsage(next); })
        .catch((error) => {
          console.warn("Failed to refresh sync storage usage", error);
          if (active && mine === seq) setSyncUsage(null);
        });
    };
    const onChanged = (_changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === "sync") refresh();
    };

    refresh();
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  if (!settings) {
    return <div className="py-16 text-center text-base text-muted">…</div>;
  }

  const locale = resolveLocale(settings.localeOverride);
  const t = MESSAGES[locale];

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    void saveSettings(next);
  };

  return (
    <MessagesContext.Provider value={t}>
      <div className="flex flex-col gap-3">
        <Hero settings={settings} onToggle={(enabled) => update({ enabled })} />

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

        <div className="flex items-center justify-end gap-2 px-0.5">
          <LocaleSelector
            value={settings.localeOverride}
            onChange={(localeOverride) => update({ localeOverride })}
          />
          <SyncUsageBadge value={syncUsage} />
          <ClearMarksButton count={syncUsage?.count ?? 0} />
        </div>
      </div>
    </MessagesContext.Provider>
  );
}

function Hero({ settings, onToggle }: { settings: Settings; onToggle: (v: boolean) => void }) {
  const t = useT();
  return (
    <header className="flex items-start justify-between gap-3 px-0.5 pb-0.5">
      <TitleLogo />
      {/* Logo is 36px tall, ToggleSwitch(lg) is 28px; my-1 (4px top/bottom) vertically centers it. */}
      <div className="my-1">
        <ToggleSwitch checked={settings.enabled} onChange={onToggle} ariaLabel={t.title} size="lg" />
      </div>
    </header>
  );
}

function TitleLogo() {
  const t = useT();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="3 0 50 12"
      width={150}
      height={36}
      shapeRendering="crispEdges"
      role="img"
      aria-label={t.title}
      className="text-ink"
    >
      <rect x={5} y={2} width={7} height={2} fill="currentColor" />
      <rect x={15} y={2} width={5} height={2} fill="currentColor" />
      <rect x={23} y={2} width={6} height={2} fill="currentColor" />
      <rect x={32} y={2} width={7} height={2} fill="currentColor" />
      <rect x={41} y={2} width={7} height={2} fill="currentColor" />
      <rect x={14} y={3} width={1} height={7} fill="currentColor" />
      <rect x={20} y={3} width={1} height={7} fill="currentColor" />
      <rect x={29} y={3} width={1} height={6} fill="currentColor" />
      <rect x={5} y={4} width={2} height={6} fill="currentColor" />
      <rect x={15} y={4} width={1} height={6} fill="currentColor" />
      <rect x={19} y={4} width={1} height={6} fill="currentColor" />
      <rect x={23} y={4} width={2} height={6} fill="currentColor" />
      <rect x={28} y={4} width={1} height={6} fill="currentColor" />
      <rect x={32} y={4} width={2} height={6} fill="currentColor" />
      <rect x={41} y={4} width={2} height={6} fill="currentColor" />
      <rect x={7} y={5} width={4} height={1} fill="currentColor" />
      <rect x={34} y={5} width={4} height={1} fill="currentColor" />
      <rect x={43} y={5} width={4} height={1} fill="currentColor" />
      <rect x={7} y={6} width={3} height={1} fill="currentColor" />
      <rect x={16} y={6} width={3} height={2} fill="currentColor" />
      <rect x={34} y={6} width={3} height={1} fill="currentColor" />
      <rect x={43} y={6} width={3} height={1} fill="currentColor" />
      <rect x={25} y={8} width={3} height={2} fill="currentColor" />
      <rect x={34} y={8} width={5} height={2} fill="currentColor" />
      <rect x={43} y={8} width={5} height={2} fill="currentColor" />
    </svg>
  );
}

const TOOLTIP_ALIGN = {
  right: "right-0",
  left: "left-0",
  center: "left-1/2 -translate-x-1/2"
} as const;

const TOOLTIP_VIEWPORT_MARGIN = 8;

function Tooltip({ children, text, align = "right", clamp = true }: { children: ReactNode; text: string; align?: keyof typeof TOOLTIP_ALIGN; clamp?: boolean }) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [clampLeft, setClampLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!clamp) {
      setClampLeft(null);
      return;
    }
    const wrapper = wrapperRef.current;
    const tooltip = tooltipRef.current;
    if (!wrapper || !tooltip) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth;
    const viewportWidth = document.documentElement.clientWidth;

    const desiredLeft =
      align === "right"
        ? wrapperRect.right - tooltipWidth
        : align === "left"
          ? wrapperRect.left
          : wrapperRect.left + wrapperRect.width / 2 - tooltipWidth / 2;

    const minLeft = TOOLTIP_VIEWPORT_MARGIN;
    const maxLeft = viewportWidth - TOOLTIP_VIEWPORT_MARGIN - tooltipWidth;
    const clamped = Math.max(minLeft, Math.min(maxLeft, desiredLeft));
    setClampLeft(clamped - wrapperRect.left);
  }, [text, align, clamp]);

  const alignClass = clampLeft === null ? TOOLTIP_ALIGN[align] : "";
  const inlineStyle = clampLeft === null ? undefined : { left: `${clampLeft}px` };

  return (
    <span ref={wrapperRef} className="group relative inline-flex">
      {children}
      <span
        ref={tooltipRef}
        role="tooltip"
        style={inlineStyle}
        className={`pointer-events-none absolute bottom-full ${alignClass} z-10 mb-1.5 w-max max-w-[240px] rounded-md border border-outline bg-bg-2 px-2 py-1.5 text-[12px] leading-snug text-ink opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100`}
      >
        {text}
      </span>
    </span>
  );
}

function SyncUsageBadge({ value }: { value: SyncUsage | null }) {
  const t = useT();
  if (!value) return null;
  const freeKb = ((value.bytesQuota - value.bytesInUse) / 1024).toFixed(1);
  const quotaKb = Math.round(value.bytesQuota / 1024);
  const overWarning = value.bytesInUse > value.bytesQuota * SYNC_BYTES_WARNING_RATIO;
  const className = overWarning ? "text-amber-400" : "text-muted";
  return (
    <Tooltip text={t.syncUsageTooltip}>
      <span className={`text-[12px] font-medium tabular-nums ${className}`}>
        {freeKb} KB / {quotaKb} KB
      </span>
    </Tooltip>
  );
}

function LocaleSelector({ value, onChange }: { value: LocaleOverride; onChange: (v: LocaleOverride) => void }) {
  const t = useT();
  return (
    <Tooltip text={t.localeTooltip} align="center">
      <div role="radiogroup" aria-label="popup language" className="inline-flex overflow-hidden rounded-md border border-outline bg-bg-2">
        {ALL_LOCALE_OVERRIDES.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={`px-1.5 py-0.5 text-[11px] font-medium leading-none transition-colors ${
                selected ? "bg-accent text-white" : "cursor-pointer text-muted hover:text-ink"
              }`}
            >
              {LOCALE_LABELS[option]}
            </button>
          );
        })}
      </div>
    </Tooltip>
  );
}

function ClearMarksButton({ count }: { count: number }) {
  const t = useT();
  const disabled = count <= 0;
  const handleClick = () => {
    if (disabled) return;
    if (!window.confirm(t.clearConfirm(count))) return;
    void clearMarked().catch((error) => {
      console.warn("Failed to clear marked videos", error);
    });
  };
  return (
    <Tooltip text={t.clearTooltip} align="center">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={t.clearTooltip}
        className="inline-flex cursor-pointer items-center text-muted transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted"
      >
        <DeleteIcon size={16} />
      </button>
    </Tooltip>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-outline bg-card p-2.5">
      <h2 className="m-0 mb-1.5 px-1.5 text-[12px] font-semibold uppercase tracking-widest text-faded">
        {title}
      </h2>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

function ToggleRow({ label, hint, checked, disabled, onChange }: { label: string; hint?: string; checked: boolean; disabled?: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5 transition-colors ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-[rgba(255,255,255,0.04)]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[13px] leading-snug text-muted">{hint}</div>}
      </div>
      <ToggleSwitch checked={checked} disabled={disabled} onChange={onChange} ariaLabel={label} />
    </label>
  );
}

function NumberRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5">
      <div className="text-[15px] font-medium text-ink">{label}</div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className="w-14 rounded-md border border-outline bg-bg-2 px-2 py-1 text-right text-[15px] tabular-nums text-ink focus:border-accent focus:outline-none"
      />
    </label>
  );
}

function SliderRow({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (v: number) => void }) {
  const percent = Math.round(value * 100);
  return (
    <div className="space-y-1 rounded-md px-1.5 py-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium text-ink">{label}</div>
        <div className="rounded bg-[rgba(94,106,210,0.16)] px-1.5 py-0.5 text-[13px] font-medium tabular-nums text-accent-bright">
          {percent}%
        </div>
      </div>
      {hint && <div className="text-[13px] leading-snug text-muted">{hint}</div>}
      <input
        type="range"
        min={0}
        max={100}
        value={percent}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10) / 100)}
        className="w-full cursor-pointer accent-accent"
      />
    </div>
  );
}

const TOGGLE_SIZES = {
  sm: {
    root: "h-[22px] w-[36px]",
    thumb: "size-[18px]",
    on: "data-[state=checked]:translate-x-[15px]"
  },
  lg: {
    root: "h-7 w-12",
    thumb: "size-6",
    on: "data-[state=checked]:translate-x-[20px]"
  }
} as const;

function ToggleSwitch({ checked, disabled, onChange, ariaLabel, size = "sm" }: { checked: boolean; disabled?: boolean | undefined; onChange: (v: boolean) => void; ariaLabel: string; size?: "sm" | "lg" }) {
  const variant = TOGGLE_SIZES[size];
  return (
    <Switch.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
      aria-label={ariaLabel}
      className={`relative ${variant.root} shrink-0 cursor-pointer rounded-full border border-outline bg-[rgba(255,255,255,0.06)] transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent disabled:cursor-not-allowed`}
    >
      <Switch.Thumb className={`block ${variant.thumb} translate-x-0.5 rounded-full bg-[#d4d5d8] shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition-transform ${variant.on} data-[state=checked]:bg-white`} />
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
