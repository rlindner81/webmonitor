# webmonitor

play a sound when a change is detected on a website

## alarm tones from

https://www.tonesmp3.com/alarm-ringtones/

## webdriver API documentation

https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_WebDriver.html

## example config file

`websites.yaml` in working directory

```yaml
---
websites:
  - url: "https://www.gameswirtschaft.de/wirtschaft/playstation-5-kaufen-februar-kw8/"
    alarm: alarm
    needsDriver: false

  - url: "https://www.amazon.de/dp/B08H93ZRK9"
    alarm: police-siren-sound-effect
    needsDriver: true
```
