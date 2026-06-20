const { chromium } = require('playwright');
const express = require('express');

const app = express();
app.use(express.static(__dirname));

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`Server running at http://localhost:${port}`);
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
    else console.log('PAGE LOG:', msg.text());
  });
  page.on('pageerror', error => console.log('UNCAUGHT EXCEPTION:', error.message));
  
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });
  
  // click a box if no errors so far
  try {
     // Wait for canvas
     await page.waitForSelector('#canvas-container canvas');
     // simulate a click in the center
     await page.mouse.click(300, 300);
     await page.waitForTimeout(1000);
  } catch (e) {
     console.log('Interaction error:', e.message);
  }

  await browser.close();
  server.close();
});
