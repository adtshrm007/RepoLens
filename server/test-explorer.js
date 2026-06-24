import 'dotenv/config';
import { runCodeExplorer } from './src/services/analysis.service.js';

async function test() {
  try {
    const content = `
      function a() { console.log('a'); }
      function b() { console.log('b'); }
    `;
    const res = await runCodeExplorer('test.js', content);
    console.log("Success:", res);
  } catch (e) {
    console.error("Test failed:", e);
  }
}

test();
