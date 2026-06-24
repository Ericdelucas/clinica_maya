const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("smartSaudeDesktop", {
  platform: process.platform,
});
