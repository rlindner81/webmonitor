#!/usr/bin/env node
"use strict";

const fs = require("fs");
const { promisify } = require("util");
const { spawn, execSync } = require("child_process");

const open = promisify(fs.open);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const PID_FILE = "webmonitor.pid";
const LOG_FILE = "webmonitor.txt";
const SCRIPT_FILE = `${__dirname}/../src/webmonitor.js`;

const _kill = (pid) => {
  if (Number.isFinite(pid)) {
    const killCommand = process.platform === "win32" ? `taskkill /f /pid ${pid}` : `kill ${pid}`;
    execSync(killCommand, { stdio: "ignore" });
  }
};

(async () => {
  const args = process.argv.slice(2);
  const [firstArg] = args;
  try {
    const pid = parseFloat((await readFile(PID_FILE)).toString());
    _kill(pid);
    // eslint-disable-next-line no-empty
  } catch (err) {}

  if (/(?:stop|kill)/gi.test(firstArg)) {
    return;
  }

  const foutlog = await open(LOG_FILE, "w");
  const child = spawn(process.execPath, [SCRIPT_FILE].concat(args), {
    stdio: ["ignore", foutlog, foutlog],
    detached: true,
  });
  await writeFile(PID_FILE, String(child.pid));
  child.unref();
})();
