const puppeteer = require('puppeteer');

(async () => {
  const url = process.argv[2] || 'http://localhost:5001/tower-defense';
  console.log('Opening', url);
  const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();

  // Collect console messages from all frames
  page.on('console', msg => {
    try {
      const type = msg.type();
      const text = msg.text();
      console.log(`[PAGE][${type}] ${text}`);
    } catch (e) {
      console.log('[PAGE][console] (error reading message)');
    }
  });

  // Also listen to page errors
  page.on('pageerror', err => {
    console.log('[PAGE][error]', err.toString());
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Try to focus the iframe and click center
  try {
    const frames = page.frames();
    const tdFrame = frames.find(f => f.url().includes('/tower-defense/td.html')) || frames[0];
    console.log('Found frames:', frames.map(f => f.url()));
    if (tdFrame) {
      // Evaluate in iframe: print some markers and simulate a click on canvas
      await tdFrame.evaluate(() => {
        try {
          console.log('Inside iframe: document.readyState=' + document.readyState);
          const canvas = document.querySelector('canvas');
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            console.log('Inside iframe: canvas rect', rect.width, rect.height);
            // dispatch mousemove and click events at center
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const move = new MouseEvent('mousemove', {clientX: cx, clientY: cy, bubbles: true});
            const click = new MouseEvent('click', {clientX: cx, clientY: cy, bubbles: true});
            canvas.dispatchEvent(move);
            canvas.dispatchEvent(click);
            console.log('Inside iframe: dispatched synthetic events');
          } else {
            console.log('Inside iframe: canvas not found');
          }
        } catch (e) {
          console.log('Inside iframe: eval error', e.toString());
        }
      });
    }
  } catch (e) {
    console.log('Error interacting with iframe:', e.toString());
  }

  // Wait a bit to collect logs
  await new Promise(r => setTimeout(r, 4000));

  await browser.close();
  console.log('Done.');
})();
