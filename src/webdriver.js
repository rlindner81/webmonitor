"use strict";

const chrome = require("selenium-webdriver/chrome");
const { Builder, By } = require("selenium-webdriver");

const screen = {
  width: 1920,
  height: 1080,
};

const createDriver = async () =>
  new Builder().forBrowser("chrome").setChromeOptions(new chrome.Options().headless().windowSize(screen)).build();

const amazonCheck = async (driver, url) => {
  await driver.get(url);
  await driver.findElement(By.css("#edition_5 button")).click();
  await driver.wait(async () => {
    const productTitle = await driver.findElement(By.id("productTitle")).getText();
    return productTitle === "Sony PlayStation 5";
  }, 15000);

  const availability = await driver.findElement(By.id("availability")).getText();
  if (availability === "Erhältlich bei diesen Anbietern.") {
    throw new Error("Erhältlich bei diesen Anbietern.");
  }
  return availability;
};

module.exports = {
  createDriver,
  amazonCheck,
};
