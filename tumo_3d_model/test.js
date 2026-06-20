const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.static(__dirname));

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`Server running at http://localhost:${port}`);
  
  const browser = await puppeteer.launch({executablePath: 'C:/Users/diar/.cache/puppeteer/chrome/win64-149.0.7827.22/chrome-win64/chrome.exe'});
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle0' });
  
  await browser.close();
  server.close();
});
