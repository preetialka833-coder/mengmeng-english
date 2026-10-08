const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
for (const name of fs.readdirSync(__dirname).filter(name => name.endsWith('.js')).sort()) {
  const result = spawnSync(process.execPath, [path.join(__dirname, name)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
