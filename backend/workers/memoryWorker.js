/**
 * Memory Stress Worker
 * Runs as a forked child process to consume RAM without affecting the main server.
 * Allocates large buffers, holds them for the specified duration, then releases.
 *
 * Expected message: { duration: <seconds>, megabytes: <MB to consume> }
 */

process.on('message', (msg) => {
  const duration = (msg.duration || 60) * 1000; // convert to ms
  const megabytes = msg.megabytes || 512;
  const chunkSize = 10 * 1024 * 1024; // 10 MB chunks
  const numChunks = Math.ceil((megabytes * 1024 * 1024) / chunkSize);

  console.log(`[Memory Worker] Allocating ~${megabytes}MB for ${msg.duration || 60}s`);

  const buffers = [];

  try {
    // Allocate memory in chunks
    for (let i = 0; i < numChunks; i++) {
      const buf = Buffer.alloc(chunkSize, 0xff); // fill with data to ensure actual allocation
      // Touch the buffer to prevent OS from using lazy allocation
      for (let j = 0; j < buf.length; j += 4096) {
        buf[j] = 0xaa;
      }
      buffers.push(buf);
    }

    const allocatedMB = (buffers.length * chunkSize) / (1024 * 1024);
    console.log(`[Memory Worker] Successfully allocated ~${allocatedMB.toFixed(0)}MB`);

    // Hold the memory for the specified duration
    setTimeout(() => {
      console.log('[Memory Worker] Releasing memory...');
      buffers.length = 0; // release references
      if (global.gc) global.gc(); // force GC if available
      console.log('[Memory Worker] Memory spike completed.');
      process.send && process.send({ status: 'completed' });
      process.exit(0);
    }, duration);
  } catch (error) {
    console.error(`[Memory Worker] Error allocating memory: ${error.message}`);
    buffers.length = 0;
    process.send && process.send({ status: 'error', error: error.message });
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Memory Worker] Received SIGTERM, releasing memory and stopping...');
  process.exit(0);
});

process.on('disconnect', () => {
  console.log('[Memory Worker] Parent disconnected, stopping...');
  process.exit(0);
});
