module.exports = {
  apps: [{
    name: 'typing-backend',
    script: 'server.ts',
    interpreter: 'ts-node',
    interpreter_args: '--transpile-only',
    instances: 1,
    autorestart: true,
    watch: false,  // 生产环境不要开启 watch
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
