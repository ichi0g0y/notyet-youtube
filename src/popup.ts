import { getSettings, setEnabled } from "./storage";

const enabledInput = document.querySelector<HTMLInputElement>("#enabled");
const status = document.querySelector<HTMLElement>("#status");

if (!enabledInput || !status) {
  throw new Error("Popup markup is missing required controls.");
}

const toggle = enabledInput;
const statusText = status;

function render(enabled: boolean): void {
  toggle.checked = enabled;
  statusText.textContent = enabled ? "Ready on YouTube channel tabs." : "Disabled.";
}

const settings = await getSettings();
render(settings.enabled);

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  void setEnabled(enabled);
  render(enabled);
});
