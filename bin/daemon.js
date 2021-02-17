#!/usr/bin/env node
"use strict"

const fs = require("fs")
const path = require("path")
const { promisify } = require("util")
const { spawn, execSync } = require("child_process")

const open = promisify(fs.open)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

const PID_FILE = "webmonitor.pid"
const LOG_FILE = "webmonitor.txt"
const SCRIPT_FILE = `${__dirname}/../src/webmonitor.js`

const _kill = (pid) => {
  if (Number.isFinite(pid)) {
    const killCommand = process.platform === "win32" ? `taskkill /f /pid ${pid}` : `kill ${pid}`
    execSync(killCommand, { stdio: "ignore" })
  }
}

const _status = (pid) => {
  if (Number.isFinite(pid)) {
    const statusCommand = `ps -p ${pid}`
    execSync(statusCommand, { stdio: "pipe" })
  } else {
    throw new Error()
  }
}

;(async () => {
  const [mode] = process.argv.slice(2);
  if (!mode || !(["start", "status", "stop"].includes(mode))) {
    console.log("webmonitor start|status|stop");
    return;
  }

  switch (mode) {
    case "start": {
      const foutlog = await open(LOG_FILE, "w")
      const child = spawn(process.execPath, [SCRIPT_FILE].concat(process.argv.slice(2)), {
        stdio: ["ignore", foutlog, foutlog],
        detached: true,
      })
      await writeFile(PID_FILE, String(child.pid))
      child.unref()
    } break;
    case "status": {
      try {
        const pid = parseFloat((await readFile(PID_FILE)).toString())
        _status(pid)
      } catch (err) {
        console.log("webmonitor is not running")
      }
    } break;
    case "stop": {
      try {
        const pid = parseFloat((await readFile(PID_FILE)).toString())
        _kill(pid)
        // eslint-disable-next-line no-empty
      } catch (err) {}
    } break;
  }
})()
