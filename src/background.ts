import { ensureDefaults } from "./storage";

chrome.runtime.onInstalled.addListener(() => {
  void ensureDefaults();
});
