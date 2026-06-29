import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const skipDirs = new Set(['node_modules', 'uploads', 'dist', 'coverage']);
const files = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) await walk(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
}

function checkFile(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--check', file], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.on('close', (code) => {
      resolve({ file, code, output });
    });
  });
}

await walk(root);

const failures = [];
for (const file of files.sort()) {
  const result = await checkFile(file);
  if (result.code !== 0) failures.push(result);
}

if (failures.length > 0) {
  console.error(`Backend build check failed for ${failures.length} file(s):`);
  for (const failure of failures) {
    console.error(`\n${relative(root, failure.file)}`);
    console.error(failure.output.trim());
  }
  process.exit(1);
}

console.log(`Backend build check passed (${files.length} JavaScript files checked).`);
