"use strict";

const chrome = require("selenium-webdriver/chrome");
const { Builder, By } = require("selenium-webdriver");

const screen = {
  width: 1920,
  height: 1080,
};

const headless = /true/gi.test(process.env.WEBMONITOR_HEADLESS);

const createDriver = async () =>
  new Builder()
    .forBrowser("chrome")
    .setChromeOptions(
      headless ? new chrome.Options().headless().windowSize(screen) : new chrome.Options().windowSize(screen)
    )
    .build();

const amazonCheck = async (driver, url) => {
  await driver.get(url);
  const [cookieButton] = await driver.findElements(By.css("input#sp-cc-accept"));
  cookieButton && cookieButton.click();

  await driver.findElement(By.css("#edition_5 button")).click();
  await driver.wait(async () => {
    const productTitle = await driver.findElement(By.id("productTitle")).getText();
    const selection = await driver.findElement(By.css("span.selection")).getText();
    return selection === "PS5" && productTitle === "Sony PlayStation 5";
  }, 30000);

  const availability = await driver.findElement(By.id("availability")).getText();
  if (availability === "Erhältlich bei diesen Anbietern.") {
    throw new Error("Erhältlich bei diesen Anbietern.");
  }
  return availability;
};

const euronicsCheck = async (driver, url) => {
  await driver.get(url);
  try {
    await driver.findElement(By.css("button#onetrust-accept-btn-handler")).click();
  } catch (err) {} // eslint-disable-line no-empty
  try {
    const alert = await driver.findElement(By.css("div.alert--content > span")).getText();
    return alert;
  } catch (err) {
    return "manual check";
  }
};

module.exports = {
  createDriver,
  amazonCheck,
  euronicsCheck,
};
