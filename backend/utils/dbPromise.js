const pool = require('../db');

// Since we're using mysql2/promise, the pool already returns promises
module.exports = {
  query: async (sql, params) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }
};
