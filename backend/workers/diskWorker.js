/**
 * Disk Stress Worker
 * Runs as a forked child process to spike disk I/O and usage.
 * Writes large temporary files, holds them, then cleans up.
 *
 * Expected message: { duration: <seconds>, sizeMB: <file size in MB> }
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TEMP_DIR = path.join(__dirname, '..', '.stress-tmp');
const TEMP_FILE_PREFIX = 'stress-disk-';

process.on('message', (msg) => {
  const duration = (msg.duration || 30) * 1000; // convert to ms
  const sizeMB = msg.sizeMB || 1024;
  const chunkSize = 1024 * 1024; // 1 MB per write
  const totalChunks = sizeMB;

  console.log(`[Disk Worker] Writing ${sizeMB}MB file for ${msg.duration || 30}s`);

  // Ensure temp directory exists
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const tempFile = path.join(TEMP_DIR, `${TEMP_FILE_PREFIX}${Date.now()}.tmp`);

  try {
    // Write in chunks for sustained I/O pressure
    const fd = fs.openSync(tempFile, 'w');
    const chunk = crypto.randomBytes(chunkSize); // random data for realistic I/O

    for (let i = 0; i < totalChunks; i++) {
      fs.writeSync(fd, chunk);
      // Also trigger fsync periodically to spike IOPS
      if (i % 10 === 0) {
        fs.fsyncSync(fd);
      }
    }

    fs.fsyncSync(fd);
    fs.closeSync(fd);

    const actualSize = fs.statSync(tempFile).size / (1024 * 1024);
    console.log(`[Disk Worker] Written ${actualSize.toFixed(0)}MB to ${tempFile}`);

    // Continue generating I/O reads during the hold period
    const readInterval = setInterval(() => {
      try {
        // Read random sections of the file to spike read IOPS
        const fd = fs.openSync(tempFile, 'r');
        const readBuf = Buffer.alloc(chunkSize);
        const fileSize = fs.statSync(tempFile).size;
        const offset = Math.floor(Math.random() * Math.max(0, fileSize - chunkSize));
        fs.readSync(fd, readBuf, 0, chunkSize, offset);
        fs.closeSync(fd);
      } catch (e) {
        // File may have been cleaned up
      }
    }, 200); // read every 200ms for sustained IOPS

    // Cleanup after duration
    setTimeout(() => {
      clearInterval(readInterval);
      cleanup(tempFile);
      console.log('[Disk Worker] Disk spike completed.');
      process.send && process.send({ status: 'completed' });
      process.exit(0);
    }, duration);
  } catch (error) {
    console.error(`[Disk Worker] Error: ${error.message}`);
    cleanup(tempFile);
    process.send && process.send({ status: 'error', error: error.message });
    process.exit(1);
  }
});

function cleanup(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Disk Worker] Cleaned up ${filePath}`);
    }
    // Remove temp dir if empty
    if (fs.existsSync(TEMP_DIR)) {
      const remaining = fs.readdirSync(TEMP_DIR);
      if (remaining.length === 0) {
        fs.rmdirSync(TEMP_DIR);
      }
    }
  } catch (e) {
    console.error(`[Disk Worker] Cleanup error: ${e.message}`);
  }
}

// Graceful shutdown — always clean up temp files
process.on('SIGTERM', () => {
  console.log('[Disk Worker] Received SIGTERM, cleaning up...');
  // Clean all stress temp files
  try {
    if (fs.existsSync(TEMP_DIR)) {
      const files = fs.readdirSync(TEMP_DIR);
      files.forEach((f) => {
        if (f.startsWith(TEMP_FILE_PREFIX)) {
          fs.unlinkSync(path.join(TEMP_DIR, f));
        }
      });
    }
  } catch (e) { /* best effort */ }
  process.exit(0);
});

process.on('disconnect', () => {
  console.log('[Disk Worker] Parent disconnected, stopping...');
  process.exit(0);
});
