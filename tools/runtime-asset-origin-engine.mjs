import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const gitExecutable = process.platform === 'win32' ? 'git.exe' : 'git';

function fail(message) {
  throw new Error(message);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function repositoryByName(lock, name) {
  const repository = lock.repositories?.find((entry) => entry.name === name);
  if (!repository) fail(`UPSTREAM-LOCK is missing repository ${name}.`);
  return repository;
}

function sourceBlob(root, lock, entry) {
  const repository = repositoryByName(lock, entry.repository);
  const checkout = path.join(root, '.upstream', entry.repository);
  const result = spawnSync(gitExecutable, [
    '-C', checkout, 'cat-file', 'blob', `${repository.commit}:${entry.upstreamPath}`
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: null,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = Buffer.concat([result.stderr || Buffer.alloc(0), result.stdout || Buffer.alloc(0)]).toString('utf8');
    fail(`Runtime asset source is missing: ${entry.path} <- ${repository.commit}:${entry.upstreamPath}\n${detail}`);
  }
  return result.stdout || Buffer.alloc(0);
}

export function materializeRuntimeAssets({ root, entries, lock, check = false }) {
  if (!Array.isArray(entries) || entries.length === 0) {
    fail('The generation graph has no materialized runtime asset entries.');
  }

  const outputs = [];
  for (const entry of entries) {
    if (!entry.path || !entry.repository || !entry.upstreamPath || !/^[0-9a-f]{64}$/.test(entry.sha256 || '')) {
      fail(`Invalid materialized runtime asset entry: ${JSON.stringify(entry)}`);
    }

    const sourceBuffer = sourceBlob(root, lock, entry);
    const sourceHash = sha256(sourceBuffer);
    if (sourceHash !== entry.sha256) {
      fail(`Locked runtime asset hash mismatch for ${entry.path}: expected ${entry.sha256}, got ${sourceHash}.`);
    }

    const destination = path.join(root, entry.path);
    if (check) {
      if (!fs.existsSync(destination) || !fs.statSync(destination).isFile()) {
        fail(`Materialized runtime asset is missing: ${entry.path}`);
      }
      const outputBuffer = fs.readFileSync(destination);
      const outputHash = sha256(outputBuffer);
      if (outputHash !== entry.sha256 || !outputBuffer.equals(sourceBuffer)) {
        fail(`Materialized runtime asset is stale: ${entry.path}`);
      }
    } else {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, sourceBuffer);
    }
    outputs.push(entry.path.replaceAll('\\', '/'));
  }

  console.log(`${check ? 'Checked' : 'Materialized'} ${outputs.length} locked runtime assets.`);
  return { outputs };
}
