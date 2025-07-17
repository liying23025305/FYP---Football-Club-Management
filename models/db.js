const mysql = require('mysql2/promise');
const path = require('path');

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mydb'
};

let connection;

const initializeDatabase = async () => {
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL database');
        return connection;
    } catch (error) {
        console.error('Error connecting to MySQL database: ', error);
        throw error;
    }
};

const getConnection = () => {
    if (!connection) {
        throw new Error('Database not initialized. Call initializeDatabase first.');
    }
    return connection;
};

module.exports = { initializeDatabase, getConnection };