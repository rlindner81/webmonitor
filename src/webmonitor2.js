"use strict";

const fs = require("fs");
const yaml = require("js-yaml");

const { sleep, computeHash, playAlarm } = require("./shared");
const fetch = require("./fetch");
const webdriver = require("./webdriver2");

const FREQUENCY_MILLISECONDS = 30000;
const WEBSITES_FILE = `${process.cwd()}/websites.yaml`;

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
    case "www.euronics.de": {
      return webdriver.euronicsCheck(driver, url);
    }
    default: {
      throw new Error(`unknown hostname ${hostname}`);
    }
  }
};

(async () => {
  let drivers = [];
  const driversCleanup = async () => {
    await Promise.all(drivers.map((driver) => driver.quit()));
    process.exit(0);
  };
  process.on("SIGINT", driversCleanup);
  process.on("SIGTERM", driversCleanup);

  const { websites } = yaml.load(fs.readFileSync(WEBSITES_FILE, "utf8"));

  await Promise.race(
    websites.map(async ({ url, hash, alarm, needsDriver }) => {
      const driver = needsDriver ? await webdriver.createDriver() : null;
      needsDriver && drivers.push(driver);

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
            playAlarm(alarmFile);
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
