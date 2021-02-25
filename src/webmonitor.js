"use strict";

const crypto = require("crypto");
const childProcess = require("child_process");
const fs = require("fs");
const { promisify } = require("util");
const yaml = require("js-yaml");

const fetch = require("./fetch");
const webdriver = require("./webdriver");

const FREQUENCY_MILLISECONDS = 30000;
const WEBSITES_FILE = `${process.cwd()}/websites.yaml`;

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
      return webdriver.amazonCheck(driver, url);
    }
    case "www.mediamarkt.de": {
      return webdriver.mediamarktCheck(driver, url);
    }
    case "www.saturn.de": {
      return webdriver.mediamarktCheck(driver, url);
    }
    case "ps5.expert.de": {
      return webdriver.expertCheck(driver, url);
    }
    case "www.euronics.de": {
      return webdriver.euronicsCheck(driver, url);
    }
    default: {
      throw new Error(`unknown hostname ${hostname}`);
    }
  }
};

(async () => {
  const { websites } = yaml.load(fs.readFileSync(WEBSITES_FILE, "utf8"));

  const drivers = await Promise.all(
    websites.map(async ({ needsDriver }) => (needsDriver ? await webdriver.createDriver() : null))
  );

  const driversCleanup = async () => {
    await Promise.all(drivers.filter((driver) => driver !== null).map((driver) => driver.quit()));
    process.exit(0);
  };
  process.on("SIGINT", driversCleanup);
  process.on("SIGTERM", driversCleanup);

  await Promise.race(
    websites.map(async ({ url, alarm }, index) => {
      const driver = drivers[index];
      let hash = null;

      const checkUrl = async () => {
        try {
          const now = new Date();
          const { hostname } = new URL(url);

          const cleanText = await _cleanResponse(driver, url, hostname);
          const currentHash = computeHash(cleanText);
          if (hash === null) {
            hash = currentHash;
            console.log(`${new Date().toISOString()} ${url} started polling`);
            return true;
          }

          if (currentHash !== hash) {
            console.log(`!!! ${now.toISOString()} ${url} changed to ${currentHash}`);
            const filename =
              [now.toISOString().replace(/\W/g, "-"), hostname.replace(/\W/g, "_"), currentHash].join(" ") + ".html";
            fs.writeFileSync(filename, cleanText);

            const alarmFile = `${__dirname}/../data/${alarm ? alarm.replace(/\W/g, "-") : "alarm"}.mp3`;
            _run("afplay", "-t", "2", alarmFile);
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

  await driversCleanup();
})();
