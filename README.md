# Football Club Management System: How to run the application

## Requirements
- Windows OS  
- Node.js (v18+ recommended)  
- npm  
- MySQL server (e.g., XAMPP)  
- Internet access  

---

## Install dependencies
```bash
cd "C:\Users\23021014\Downloads\fyp"
npm install
```

---

## Set up environment variables

Create a `.env` file in the root folder and add:
```
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
EMAIL_FROM="Raffles Rangers" <your_email@gmail.com>

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=mydb

# App Configuration
SESSION_SECRET=your_session_secret
PORT=3000
NODE_ENV=development
```

> Remember to add `.env` to `.gitignore` and never commit secrets to GitHub.

---

## Set up the database

1. Start MySQL with XAMPP  
2. Create the database:
```sql
CREATE DATABASE mydb;
```
3. Run all SQL files from the `/database` folder using phpMyAdmin or the CLI.

---

## Run the app

Using Nodemon (for development):
```bash
npx nodemon app.js
```

Or with plain Node:
```bash
node app.js
```

Open your browser and go to:  
**http://localhost:3000**

---

## Tech Stack

| Component         | Package/Tool Used                          |
|-------------------|--------------------------------------------|
| Server Framework  | express@5.1.0                              |
| Templating        | ejs@3.1.10                                 |
| MySQL Connection  | mysql2@3.14.1                              |
| Authentication    | express-session@1.18.1                    |
| Input Validation  | express-validator@7.2.1                   |
| Email Service     | nodemailer@6.10.1                          |
| Payment Gateway   | stripe@18.3.0, @paypal/checkout-server-sdk@1.0.3 |
| Environment Vars  | dotenv@16.5.0                              |
| Dev Tool          | nodemon@3.1.10   
