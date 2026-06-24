const { app, BrowserWindow, dialog, screen, session, shell } = require("electron");
const path = require("node:path");

let mainWindow = null;
const DEVELOPMENT_URL = "http://localhost:5173";
const WINDOWS_APP_ID = "com.smartsaude.desktop";

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

function getProductionRendererPath() {
  return path.join(process.resourcesPath, "web", "index.html");
}

function getClinicWindowBounds() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return {
    width: Math.min(1600, Math.max(1100, Math.floor(width * 0.9))),
    height: Math.min(1000, Math.max(720, Math.floor(height * 0.9))),
  };
}

function createWindow() {
  const bounds = getClinicWindowBounds();
  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 1024,
    minHeight: 720,
    center: true,
    show: false,
    autoHideMenuBar: true,
    title: "SmartSaúde",
    backgroundColor: "#f3f8f6",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowedOrigin = app.isPackaged
      ? "file:"
      : new URL(DEVELOPMENT_URL).origin;
    const destination = new URL(url);
    if (
      (app.isPackaged && destination.protocol !== allowedOrigin) ||
      (!app.isPackaged && destination.origin !== allowedOrigin)
    ) {
      event.preventDefault();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  if (!app.isPackaged) {
    void mainWindow.loadURL(
      process.env.SMARTSAUDE_RENDERER_URL ?? DEVELOPMENT_URL,
    );
  } else {
    void mainWindow.loadFile(getProductionRendererPath());
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

if (hasSingleInstanceLock) {
  app.on("second-instance", () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });

  app.whenReady().then(() => {
    if (process.platform !== "win32") {
      dialog.showErrorBox(
        "Plataforma não suportada",
        "O SmartSaúde Desktop é distribuído exclusivamente para Windows.",
      );
      app.quit();
      return;
    }

    app.setAppUserModelId(WINDOWS_APP_ID);
    session.defaultSession.setPermissionRequestHandler(
      (_webContents, permission, callback) => {
        callback(permission === "media");
      },
    );
    createWindow();
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}
