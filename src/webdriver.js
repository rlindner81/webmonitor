"use strict";

const chrome = require("selenium-webdriver/chrome");
const { Builder, By } = require("selenium-webdriver");

const screen = {
  width: 1920,
  height: 1080,
};

const amazonCheck = async (url) => {
  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(new chrome.Options().headless().windowSize(screen))
    .build();
  let availability = "";
  try {
    await driver.get(url);
    await driver.findElement(By.id("a-autoid-16-announce")).click();
    await driver.wait(async () => {
      const productTitle = await driver.findElement(By.id("productTitle")).getText();
      return productTitle === "Sony PlayStation 5";
    }, 5000);

    availability = await driver.findElement(By.id("availability")).getText();
  } finally {
    await driver.quit();
  }
  return availability;
};

module.exports = {
  amazonCheck,
};
