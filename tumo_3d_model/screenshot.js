const { chromium } = require('playwright');
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.static(__dirname));

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`Diagnostic server running at http://localhost:${port}`);
  
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader'] // ensure WebGL works in headless
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE EXCEPTION:', error.message));
  
  try {
    console.log('Loading page...');
    await page.goto(`http://localhost:${port}/index.html`);
    
    // Wait for the loading screen to disappear
    console.log('Waiting for model assets to finish preloading...');
    await page.waitForSelector('#loading-overlay', { state: 'detached', timeout: 30000 });
    console.log('Preloading finished! Letting scene settle...');
    await page.waitForTimeout(2000); // let animations settle
    
    // Take exterior screenshot
    const extPath = path.join('C:', 'Users', 'diar', '.gemini', 'antigravity', 'brain', '626e5f46-37d1-4078-93e1-e9b803657263', 'exterior_view.png');
    await page.screenshot({ path: extPath });
    console.log(`Saved exterior screenshot to ${extPath}`);
    
    // Go to Floor 1 and click the Orange Box
    console.log('Navigating close to Floor 1...');
    await page.click('#btn-f1');
    await page.waitForTimeout(3000); // wait for camera transition
    
    // Let's trigger enterRoom by evaluating in the page context
    console.log('Entering the Orange Box...');
    await page.evaluate(() => {
      // Find the Orange Box mesh in boxData and enter it
      const orangeBoxMesh = window.boxData ? window.boxData.find(b => b.userData && b.userData.name && b.userData.name.includes('Orange Box')) : null;
      if (orangeBoxMesh) {
        // Expose a way to enter
        import('./src/ui.js').then(ui => {
          ui.enterRoom(orangeBoxMesh);
        });
      } else {
        console.log('Could not find Orange Box mesh in window.boxData');
      }
    });
    
    await page.waitForTimeout(4000); // wait for enter transition and grid fade-in
    
    // Take interior screenshot
    const intPath = path.join('C:', 'Users', 'diar', '.gemini', 'antigravity', 'brain', '626e5f46-37d1-4078-93e1-e9b803657263', 'interior_view.png');
    await page.screenshot({ path: intPath });
    console.log(`Saved interior screenshot to ${intPath}`);
    
  } catch (err) {
    console.error('Screenshot task error:', err);
  } finally {
    await browser.close();
    server.close();
    console.log('Diagnostic server closed.');
  }
});
