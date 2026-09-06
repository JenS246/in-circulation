module.exports = {
  apps: [{
    name: 'in-circulation-api',
    cwd: '/config/projects/in-circulation',
    script: 'node',
    args: '--env-file=.env backend/server.mjs',
    interpreter: 'none',
    autorestart: true,
    max_memory_restart: '200M',
    time: true,
  }],
};
