# Football Club Management Web App

A full-stack web application built to manage football club operations such as member login, schedule viewing, player info, and store access.

---

## 🛠 Tech Stack

- **Frontend**: HTML, CSS (Bootstrap 5), EJS (Embedded JavaScript Templates)
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Server**: XAMPP (for MySQL service)

---

## ⚙️ How to Run This Project

### 1. Clone the Repository
git clone https://github.com/liying23025305/FYP---Football-Club-Management.git
cd FYP---Football-Club-Management

### 2. Start MySQL Using XAMPP
Open XAMPP Control Panel
Start Apache and MySQL
Open phpMyAdmin and import the database (e.g. football_club.sql if provided)

### 3. Install Node.js Dependencies
npm install

### 4.Set Up the Database
Make sure the database credentials in models/db.js match your local XAMPP MySQL settings:
host: 'localhost',
user: 'root',
password: '',
database: 'your_database_name'

### 1. Run the app
node app.js
Then open your browser and go to:
http://localhost:3000
