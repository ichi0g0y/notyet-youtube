const mq = matchMedia("(prefers-color-scheme: dark)");
const send = (dark: boolean) => {
  void chrome.runtime.sendMessage({ type: "theme", dark });
};
send(mq.matches);
mq.addEventListener("change", (event) => send(event.matches));
