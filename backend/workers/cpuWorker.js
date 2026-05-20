/**
 * CPU Stress Worker
 * Runs as a forked child process to burn CPU without blocking the main server.
 * Uses crypto hashing loops across multiple cores for realistic CPU pressure.
 *
 * Expected message: { duration: <seconds> }
 */

const crypto = require('crypto');
const os = require('os');

process.on('message', (msg) => {
  const duration = (msg.duration || 60) * 1000; // convert to ms
  const numCPUs = os.cpus().length;
  const startTime = Date.now();

  console.log(`[CPU Worker] Starting CPU spike for ${msg.duration || 60}s across ${numCPUs} logical cores`);

  // Burn CPU until duration expires
  const burn = () => {
    while (Date.now() - startTime < duration) {
      // Tight crypto loop — very CPU-intensive
      crypto.createHash('sha256').update(crypto.randomBytes(256)).digest('hex');
    }
  };

  // Fork additional workers to saturate all cores
  if (typeof require('worker_threads') !== 'undefined') {
    const { Worker, isMainThread, parentPort } = require('worker_threads');

    if (isMainThread) {
      // Spawn worker threads for each CPU core
      const workers = [];
      for (let i = 1; i < numCPUs; i++) {
        const worker = new Worker(__filename, { workerData: { duration } });
        workers.push(worker);
      }

      // Main thread also burns
      burn();

      // Cleanup workers
      workers.forEach((w) => w.terminate());
      console.log('[CPU Worker] CPU spike completed.');
      process.send && process.send({ status: 'completed' });
      process.exit(0);
    } else {
      // Worker thread — just burn
      const { workerData } = require('worker_threads');
      const workerDuration = workerData.duration;
      const workerStart = Date.now();
      while (Date.now() - workerStart < workerDuration) {
        crypto.createHash('sha256').update(crypto.randomBytes(256)).digest('hex');
      }
    }
  } else {
    // Fallback: single-threaded burn
    burn();
    console.log('[CPU Worker] CPU spike completed.');
    process.send && process.send({ status: 'completed' });
    process.exit(0);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[CPU Worker] Received SIGTERM, stopping...');
  process.exit(0);
});

process.on('disconnect', () => {
  console.log('[CPU Worker] Parent disconnected, stopping...');
  process.exit(0);
});
