module.exports = {
  apps: [{
    name: 'campus-booking',
    script: 'dist/server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    }
  }]
};
