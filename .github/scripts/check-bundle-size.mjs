// Fails when any single built JS chunk is larger than the budget (in KB, gzip not applied).
// Usage: node check-bundle-size.mjs <dist-dir> <max-kb>
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [dir, maxKbArg] = process.argv.slice(2);
const maxKb = Number(maxKbArg);
if (!dir || !Number.isFinite(maxKb)) {
  console.error('Usage: check-bundle-size.mjs <dist-dir> <max-kb>');
  process.exit(2);
}

const walk = (d) =>
  readdirSync(d).flatMap((name) => {
    const p = join(d, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const tooBig = walk(dir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => ({ f, kb: Math.round(statSync(f).size / 1024) }))
  .filter(({ kb }) => kb > maxKb);

if (tooBig.length) {
  for (const { f, kb } of tooBig) console.error(`::error::${f} is ${kb} KB (budget ${maxKb} KB)`);
  process.exit(1);
}
console.log(`All JS chunks are within ${maxKb} KB.`);
