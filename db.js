const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "asquare",
  password: "asquare123",
  database: "asquare_exam",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
