import * as Switch from "@radix-ui/react-switch";
import { type ReactNode, StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ALL_SCOPES, getSettings, saveSettings, type Scope, type Settings } from "./storage";

type Locale = "en" | "ja";

const MESSAGES = {
  en: {
    title: "fadee",
    masterOn: "Filter on",
    masterOff: "Filter off",
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
    title: "fadee",
    masterOn: "フィルタ ON",
    masterOff: "フィルタ OFF",
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

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  if (!settings) {
    return <div className="py-16 text-center text-sm text-muted">…</div>;
  }

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    void saveSettings(next);
  };

  return (
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
    </div>
  );
}

function Hero({ settings, onToggle }: { settings: Settings; onToggle: (v: boolean) => void }) {
  return (
    <header className="flex items-center justify-between gap-3 px-0.5 pb-0.5">
      <TitleLogo />
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-faded">
          {settings.enabled ? t.masterOn : t.masterOff}
        </span>
        <ToggleSwitch checked={settings.enabled} onChange={onToggle} ariaLabel={t.title} />
      </div>
    </header>
  );
}

function TitleLogo() {
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-outline bg-card p-2.5">
      <h2 className="m-0 mb-1.5 px-1.5 text-[10px] font-semibold uppercase tracking-widest text-faded">
        {title}
      </h2>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5 transition-colors ${
        disabled ? "opacity-40" : "hover:bg-[rgba(255,255,255,0.04)]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] leading-snug text-muted">{hint}</div>}
      </div>
      <ToggleSwitch checked={checked} disabled={disabled} onChange={onChange} ariaLabel={label} />
    </label>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5">
      <div className="text-[13px] font-medium text-ink">{label}</div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className="w-14 rounded-md border border-outline bg-bg-2 px-2 py-1 text-right text-[13px] tabular-nums text-ink focus:border-accent focus:outline-none"
      />
    </label>
  );
}

function SliderRow({
  label,
  hint,
  value,
  onChange
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const percent = Math.round(value * 100);
  return (
    <div className="space-y-1 rounded-md px-1.5 py-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium text-ink">{label}</div>
        <div className="rounded bg-[rgba(94,106,210,0.16)] px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-accent-bright">
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

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  ariaLabel
}: {
  checked: boolean;
  disabled?: boolean | undefined;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
      aria-label={ariaLabel}
      className="relative h-[18px] w-[30px] shrink-0 cursor-pointer rounded-full border border-outline bg-[rgba(255,255,255,0.06)] transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent disabled:cursor-not-allowed"
    >
      <Switch.Thumb className="block size-[14px] translate-x-0.5 rounded-full bg-[#d4d5d8] shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition-transform data-[state=checked]:translate-x-[13px] data-[state=checked]:bg-white" />
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
