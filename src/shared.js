"use strict";

const childProcess = require("child_process");
const crypto = require("crypto");
const { promisify } = require("util");

const sleep = promisify(setTimeout);

const computeHash = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

const playAlarm = (alarmFile) => {
  run("afplay", alarmFile);
};

const run = (file, ...args) => {
  return childProcess.execFileSync(file, args, {
    maxBuffer: 1 << 20, // 1 MB
    env: {
      PATH: process.env.PATH,
    },
  });
};

module.exports = {
  sleep,
  computeHash,
  playAlarm,
  run,
};
