"use strict";

const crypto = require("crypto");
const childProcess = require("child_process");
const fs = require("fs");
const { promisify } = require("util");

const fetch = require("./fetch");

const FREQUENCY_MILLISECONDS = 30000;
const WEBSITES_FILE = `${process.cwd()}/websites.json`;
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

const _cleanResponse = async (hostname, responseText) => {
  switch (hostname) {
    case "www.gameswirtschaft.de": {
      const paragraphs = [];
      responseText.replace(/<div class="comments" id="comments">[\s\S]*$/gi, "").replace(/<p.*?<\/p>/gi, (result) => {
        paragraphs.push(result);
      });
      return paragraphs.join("\n");
    }
    case "www.alternate.de": {
      const spans = [];
      responseText
        .replace(/<span.*?<\/span>/gi, (result) => {
          spans.push(result);
        });
      return spans.join("\n");
    }
    // case "www.saturn.de": {
    //   const matchText = "Dieser Artikel ist aktuell nicht verfügbar.";
    //   return responseText.includes(matchText) ? matchText : responseText;
    // }
    // case "www.euronics.de": {
    //   const matchText = "+++ Leider ist das gewünschte Produkt bereits vergriffen +++";
    //   return responseText.includes(matchText) ? matchText : responseText;
    // }
    default: {
      throw new Error(`unknown hostname ${hostname}`);
    }
  }
};

(async () =>
  Promise.all(
    websites.map(async ({ url, hash, alarm }) => {
      const checkUrl = async () => {
        const now = new Date();
        const response = await fetch({ url, logged: false });
        const responseText = await response.text();
        const { hostname } = new URL(url);

        const cleanText = await _cleanResponse(hostname, responseText);
        const currentHash = computeHash(cleanText);

        if (currentHash !== hash) {
          console.log(`!!! ${now.toISOString()} ${url} changed to ${currentHash}`);
          const filename =
            [now.toISOString().replace(/\W/g, "-"), hostname.replace(/\W/g, "_"), currentHash].join(" ") + ".html";
          fs.writeFileSync(filename, cleanText);

          const alarmFile = `${__dirname}/../data/${alarm ? alarm.replace(/\W/g, "-") : "alarm"}.mp3`;
          _run("afplay", alarmFile);
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
