type MessageKey =
  | "label.channel-videos"
  | "label.channel-shorts"
  | "label.channel-live"
  | "label.subscriptions"
  | "label.home"
  | "label.search"
  | "label.disabled"
  | "label.mark"
  | "label.unmark";

type Locale = "en" | "ja";

const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  en: {
    "label.channel-videos": "Hide watched videos (Channel)",
    "label.channel-shorts": "Hide watched shorts (Channel)",
    "label.channel-live": "Hide watched streams (Channel)",
    "label.subscriptions": "Hide watched (Subscriptions)",
    "label.home": "Hide watched (Home)",
    "label.search": "Hide watched (Search)",
    "label.disabled": "Disabled",
    "label.mark": "Mark as watched",
    "label.unmark": "Unmark watched"
  },
  ja: {
    "label.channel-videos": "視聴済み動画を隠す（チャンネル）",
    "label.channel-shorts": "視聴済みショートを隠す（チャンネル）",
    "label.channel-live": "視聴済みライブを隠す（チャンネル）",
    "label.subscriptions": "視聴済みを隠す（登録チャンネル）",
    "label.home": "視聴済みを隠す（ホーム）",
    "label.search": "視聴済みを隠す（検索結果）",
    "label.disabled": "無効",
    "label.mark": "視聴済みにする",
    "label.unmark": "視聴済みを解除"
  }
};

function getPageLocale(): Locale {
  const raw = document.documentElement.lang || navigator.language || "en";
  const base = raw.split("-")[0]?.toLowerCase();
  return base === "ja" ? "ja" : "en";
}

export function t(key: MessageKey): string {
  return MESSAGES[getPageLocale()][key];
}
