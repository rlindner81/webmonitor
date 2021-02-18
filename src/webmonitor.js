"use strict";

const crypto = require("crypto");
const childProcess = require("child_process");
const fs = require("fs");
const { promisify } = require("util");

const fetch = require("./fetch");
const { createDriver, amazonCheck } = require("./webdriver");

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

const _cleanResponse = async (driver, url, hostname) => {
  switch (hostname) {
    case "www.gameswirtschaft.de": {
      const response = await fetch({ url, logged: false });
      const responseText = await response.text();
      const paragraphs = [];
      responseText.replace(/<div class="comments" id="comments">[\s\S]*$/gi, "").replace(/<p.*?<\/p>/gi, (result) => {
        paragraphs.push(result);
      });
      return paragraphs.join("\n");
    }
    case "www.alternate.de": {
      const response = await fetch({ url, logged: false });
      const responseText = await response.text();
      const spans = [];
      responseText.replace(/<span.*?<\/span>/gi, (result) => {
        spans.push(result);
      });
      return spans.join("\n");
    }
    case "www.amazon.de": {
      return amazonCheck(driver, url);
    }
    default: {
      throw new Error(`unknown hostname ${hostname}`);
    }
  }
};

(async () => {
  const driver = await createDriver();
  try {
    await Promise.all(
      websites.map(async ({ url, hash, alarm }) => {
        const checkUrl = async () => {
          try {
            const now = new Date();
            const { hostname } = new URL(url);

            const cleanText = await _cleanResponse(driver, url, hostname);
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
          } catch (err) {
            console.error(err.stack || err.message);
          }
          console.log(`${new Date().toISOString()} ${url} unchanged`);
          return true;
        };

        while (await checkUrl()) {
          await sleep(FREQUENCY_MILLISECONDS);
        }
      })
    );
  } finally {
    await driver.quit();
  }
})();
