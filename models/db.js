const mysql = require('mysql2');
const path = require('path');
const db = require(`../config.json`).database;

// Create a MySQL connection using config.json
const connection = mysql.createConnection({
    host: db.host,
    user: db.user,
    password: db.password,
    database: db.name,
});

// Connect to the database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database: ', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

// Export the promise-based connection for async/await usage
module.exports = connection.promise();