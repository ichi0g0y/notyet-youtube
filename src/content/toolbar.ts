import type { Scope, Settings } from "../storage";
import { createViewHideIcon, createViewIcon } from "./icons";
import { t } from "./i18n";

export const BUTTON_ID = "fadee-toggle";

export function upsertButton(
  scope: Scope | null,
  settings: Settings,
  onToggle: () => Promise<void>
): void {
  const slot = document.querySelector<HTMLElement>("#buttons.ytd-masthead");
  if (!slot) return;

  const existing = document.querySelector<HTMLButtonElement>(`#${BUTTON_ID}`);
  const button = existing ?? document.createElement("button");
  const disabled = scope === null;
  const displayScope: Scope = scope ?? "channel-videos";
  const active = !disabled && Boolean(settings.activeScopes[displayScope]);
  const labelText = disabled ? t("label.disabled") : labelFor(displayScope);

  button.id = BUTTON_ID;
  button.className = "fadee-toggle";
  button.type = "button";
  button.disabled = disabled;
  button.dataset.scope = displayScope;
  button.dataset.active = String(active);
  button.setAttribute("aria-label", labelText);
  button.setAttribute("aria-pressed", String(active));
  button.setAttribute("aria-disabled", String(disabled));
  button.title = labelText;

  const iconWrap = document.createElement("span");
  iconWrap.className = "fadee-icon-wrap";
  iconWrap.append(active ? createViewHideIcon() : createViewIcon());

  const label = document.createElement("span");
  label.className = "fadee-label";
  label.textContent = labelText;

  button.replaceChildren(iconWrap, label);

  if (!existing) {
    button.addEventListener("click", () => {
      void onToggle();
    });
  }

  if (button.parentElement !== slot) {
    slot.prepend(button);
  }
}

function labelFor(scope: Scope): string {
  return t(`label.${scope}`);
}

export function removeButton(): void {
  document.querySelector(`#${BUTTON_ID}`)?.remove();
}
