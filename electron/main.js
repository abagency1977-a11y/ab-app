const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let mainWindow;
let nextProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load Next.js running on localhost
  mainWindow.loadURL("http://localhost:3000");

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (nextProcess) {
      nextProcess.kill();
    }
  });
}

app.on("ready", () => {
  // Start Next.js server
  nextProcess = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "start", "-p", "3000"],
    {
      cwd: path.join(__dirname), // project folder
      shell: true,
      env: process.env,
    }
  );

  nextProcess.stdout.on("data", (data) => {
    console.log(`Next.js: ${data}`);
    if (data.toString().includes("started server")) {
      createWindow();
    }
  });

  nextProcess.stderr.on("data", (data) => {
    console.error(`Next.js Error: ${data}`);
  });

  nextProcess.on("close", (code) => {
    console.log(`Next.js process exited with code ${code}`);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
