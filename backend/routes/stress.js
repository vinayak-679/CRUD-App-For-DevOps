/**
 * Stress Test Routes
 * Endpoints to trigger CPU, memory, and disk spikes for CloudWatch alarm testing.
 * Each spike runs in a forked child process so the Express server stays responsive.
 */

const express = require('express');
const { fork } = require('child_process');
const path = require('path');
const os = require('os');

const router = express.Router();

// Track active stress processes
const activeProcesses = {
  cpu: null,
  memory: null,
  disk: null,
};

// Track status
const status = {
  cpu: { state: 'idle', startedAt: null, duration: null },
  memory: { state: 'idle', startedAt: null, duration: null, megabytes: null },
  disk: { state: 'idle', startedAt: null, duration: null, sizeMB: null },
};

/**
 * Helper to spawn a worker process
 */
function spawnWorker(type, workerFile, message) {
  // Kill existing process if any
  if (activeProcesses[type]) {
    try {
      activeProcesses[type].kill('SIGTERM');
    } catch (e) { /* already dead */ }
  }

  const worker = fork(path.join(__dirname, '..', 'workers', workerFile));

  activeProcesses[type] = worker;
  status[type] = {
    state: 'running',
    startedAt: new Date().toISOString(),
    ...message,
  };

  // Send the config to the worker
  worker.send(message);

  // Handle worker completion
  worker.on('message', (msg) => {
    if (msg.status === 'completed' || msg.status === 'error') {
      status[type] = {
        state: msg.status === 'error' ? 'error' : 'idle',
        lastRun: new Date().toISOString(),
        error: msg.error || null,
      };
      activeProcesses[type] = null;
    }
  });

  worker.on('exit', (code) => {
    if (status[type].state === 'running') {
      status[type] = {
        state: 'idle',
        lastRun: new Date().toISOString(),
        exitCode: code,
      };
    }
    activeProcesses[type] = null;
  });

  worker.on('error', (err) => {
    console.error(`[Stress] ${type} worker error:`, err.message);
    status[type] = {
      state: 'error',
      error: err.message,
      lastRun: new Date().toISOString(),
    };
    activeProcesses[type] = null;
  });
}

// ─── POST /api/stress/cpu ────────────────────────────────────────────
router.post('/cpu', (req, res) => {
  if (activeProcesses.cpu) {
    return res.status(409).json({
      message: 'CPU spike is already running.',
      status: status.cpu,
    });
  }

  const duration = Math.min(Math.max(parseInt(req.body.duration) || 60, 10), 300);

  spawnWorker('cpu', 'cpuWorker.js', { duration });

  res.json({
    message: `CPU spike started for ${duration} seconds`,
    type: 'cpu',
    duration,
    cores: os.cpus().length,
  });
});

// ─── POST /api/stress/memory ─────────────────────────────────────────
router.post('/memory', (req, res) => {
  if (activeProcesses.memory) {
    return res.status(409).json({
      message: 'Memory spike is already running.',
      status: status.memory,
    });
  }

  const duration = Math.min(Math.max(parseInt(req.body.duration) || 60, 10), 300);
  const totalMemMB = Math.round(os.totalmem() / (1024 * 1024));
  const megabytes = Math.min(parseInt(req.body.megabytes) || 512, totalMemMB * 0.8);

  spawnWorker('memory', 'memoryWorker.js', { duration, megabytes });

  res.json({
    message: `Memory spike started: ${megabytes}MB for ${duration} seconds`,
    type: 'memory',
    duration,
    megabytes,
    totalSystemMemMB: totalMemMB,
  });
});

// ─── POST /api/stress/disk ───────────────────────────────────────────
router.post('/disk', (req, res) => {
  if (activeProcesses.disk) {
    return res.status(409).json({
      message: 'Disk spike is already running.',
      status: status.disk,
    });
  }

  const duration = Math.min(Math.max(parseInt(req.body.duration) || 30, 10), 300);
  const sizeMB = Math.min(parseInt(req.body.sizeMB) || 1024, 5120);

  spawnWorker('disk', 'diskWorker.js', { duration, sizeMB });

  res.json({
    message: `Disk spike started: ${sizeMB}MB file for ${duration} seconds`,
    type: 'disk',
    duration,
    sizeMB,
  });
});

// ─── POST /api/stress/stop ───────────────────────────────────────────
router.post('/stop', (req, res) => {
  const type = req.body.type || 'all';
  const stopped = [];

  const stopType = (t) => {
    if (activeProcesses[t]) {
      try {
        activeProcesses[t].kill('SIGTERM');
        status[t] = { state: 'idle', stoppedAt: new Date().toISOString() };
        activeProcesses[t] = null;
        stopped.push(t);
      } catch (e) {
        console.error(`[Stress] Error stopping ${t}:`, e.message);
      }
    }
  };

  if (type === 'all') {
    ['cpu', 'memory', 'disk'].forEach(stopType);
  } else if (['cpu', 'memory', 'disk'].includes(type)) {
    stopType(type);
  } else {
    return res.status(400).json({ message: `Invalid type: ${type}. Use cpu, memory, disk, or all.` });
  }

  res.json({
    message: stopped.length > 0 ? `Stopped: ${stopped.join(', ')}` : 'No active spikes to stop.',
    stopped,
  });
});

// ─── GET /api/stress/status ──────────────────────────────────────────
router.get('/status', (req, res) => {
  // Add elapsed time for running processes
  const enrichedStatus = {};
  for (const [type, s] of Object.entries(status)) {
    enrichedStatus[type] = { ...s };
    if (s.state === 'running' && s.startedAt) {
      const elapsed = Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000);
      enrichedStatus[type].elapsedSeconds = elapsed;
      enrichedStatus[type].remainingSeconds = Math.max(0, (s.duration || 0) - elapsed);
    }
  }

  res.json({
    status: enrichedStatus,
    system: {
      cpuCores: os.cpus().length,
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
      uptime: Math.round(os.uptime()),
      loadAverage: os.loadavg(),
    },
  });
});

module.exports = router;
