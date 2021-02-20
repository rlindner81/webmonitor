"use strict";

const chrome = require("selenium-webdriver/chrome");
const { Builder } = require("selenium-webdriver");
const { promisify } = require("util");

const screen = {
  width: 1920,
  height: 1080,
};

const createDriver = async () =>
  new Builder().forBrowser("chrome").setChromeOptions(new chrome.Options().windowSize(screen)).build();

const urls = ["https://www.google.com", "https://www.amazon.com", "https://www.apple.com", "https://www.twitter.com"];

const singleTest = async (index, driver, run) => {
  try {
    console.log("started instance %i run %i", index, run);
    const size = { width: 320 * (run + 1), height: 200 * (run + 1) };
    const url = urls[index];
    await driver.manage().window().setRect(size);
    await driver.manage().window().minimize();

    await driver.get(url);
    if (index === 0 && run === 0) {
      return false;
    }
    if (index === 1 && run === 1) {
      return false;
    }
    return true;
  } catch (err) {
    console.error(err.stack || err.message);
    return true;
  }
};

const singleTestRepeater = async (index, driver, waitTime) => {
  let run = 0;
  console.log("started repeater %i", index);
  while (await singleTest(index, driver, run++)) {
    await promisify(setTimeout)(waitTime);
  }
  console.log("finished repeater %i run %i", index, run);
};

const parallelTestRepeater = async (count, waitTime) => {
  const parallel = [...Array(count).keys()];
  const drivers = await Promise.all(
    parallel.map(async () => {
      return createDriver();
    })
  );
  try {
    await Promise.all(
      parallel.map(async (index) => {
        return singleTestRepeater(index, drivers[index], waitTime);
      })
    );
  } finally {
    await Promise.all(
      parallel.map(async (index) => {
        return drivers[index].quit();
      })
    );
  }
};

(async () => {
  await parallelTestRepeater(2, 10000);
})();

module.exports = {};
