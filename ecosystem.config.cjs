module.exports = {
  apps: [
    {
      name: 'payroll-app',
      script: './backend/server.js',
      cwd: '/home/deployer/payroleManagement3',
      env: {
        NODE_ENV: 'production',
        DB_HOST: '127.0.0.1',
        DB_PORT: '3306',
        DB_NAME: 'payroll_system2',
        DB_USER: 'root',
        DB_PASSWORD: '',
        DB_FORCE_IPV4: 'true',
        DB_CONNECTION_TIMEOUT: '60000',
        DB_ACQUIRE_TIMEOUT: '60000',
        DB_RECONNECT: 'true',
        DB_CONNECTION_LIMIT: '10',
        DB_IDLE_TIMEOUT: '30000',
        DB_SOCKET_PATH: '/var/run/mysqld/mysqld.sock',
        DB_SSL: 'false',
        DB_MULTIPLE_STATEMENTS: 'false',
        PORT: '5000',
        JWT_SECRET: 'payroll_jwt_secret_2024_secure_key',
        SESSION_SECRET: 'payroll_session_secret_2024',
        CORS_ORIGIN: 'http://65.20.84.140',
        SERVER_IP: '65.20.84.140',
        CORS_METHODS: 'GET,POST,PUT,DELETE,OPTIONS',
        CORS_ALLOW_HEADERS: 'Content-Type,Authorization,X-Requested-With'
      }
    }
  ]
};
