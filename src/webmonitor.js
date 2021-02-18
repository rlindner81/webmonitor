"use strict";

const crypto = require("crypto");
const childProcess = require("child_process");
const fs = require("fs");
const { promisify } = require("util");

const fetch = require("./fetch");

const FREQUENCY_MILLISECONDS = 30000;
const WEBSITES_FILE = `${process.cwd()}/websites.json`;
const ALARM_MP3_FILE = `${__dirname}/../data/alarm.mp3`;
const websites = require(WEBSITES_FILE);

const sleep = promisify(setTimeout);
const computeHash = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

const _run = (file, ...args) => {
  return childProcess.execFileSync(file, args, {
    maxBuffer: 1 << 20, // 1 MB
    env: {
      PATH: process.env.PATH,
    },
  });
};

(async () =>
  Promise.all(
    websites.map(async ({ url, hash }) => {
      const checkUrl = async () => {
        const response = await fetch({ url, logged: false });
        const responseText = await response.text();

        const paragraphs = [];
        responseText
          .replace(/<div class="comments" id="comments">[\s\S]*$/gi, "")
          .replace(/<p>.*?<\/p>/gi, (result) => {
            paragraphs.push(result);
          });
        const cleanText = paragraphs.join("\n");
        const currentHash = computeHash(cleanText);

        if (currentHash !== hash) {
          const now = new Date();
          console.log(`!!! ${now.toISOString()} ${url} changed to ${currentHash}`);
          const { hostname } = new URL(url);
          const filename =
            [now.toISOString().replace(/\W/g, "-"), hostname.replace(/\W/g, "_"), currentHash].join(" ") + ".html";
          fs.writeFileSync(filename, cleanText);
          _run("afplay", ALARM_MP3_FILE);
          return false;
        }
        console.log(`${new Date().toISOString()} ${url} unchanged`);
        return true;
      };

      while (await checkUrl()) {
        await sleep(FREQUENCY_MILLISECONDS);
      }
    })
  ))();
