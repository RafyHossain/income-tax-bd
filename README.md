# income-tax-bd

A comprehensive Bangladesh Income Tax Calculation, Return Filing, and Administration Platform built with React, Node.js, Express, and MySQL.

## Features

- **Accurate Tax Engine**: Multi-year tax calculation rules (2021-22 to 2025-26) compliant with National Board of Revenue (NBR) regulations.
- **Progressive Tax Slabs**: Automatic progressive slab rate calculations for general, female, senior citizens, disabled persons, and gazetted freedom fighters.
- **Salary & Income Exemptions**: Configurable standard deduction (1/3rd of salary up to limit), housing, medical, and conveyances exemptions.
- **Investment Rebate Calculation**: Progressive investment rebate calculations according to Income Tax Act guidelines.
- **Minimum Tax & Surcharge**: Dynamic location-based minimum tax (City Corporation, Paurashava, Other) and wealth-based surcharge rules.
- **Return Filing & Verification**: Multi-step return filing, payment verification, and automated tax acknowledgment generation.
- **Refund Management**: Refund eligibility computation, claim submission, tracking, and admin verification workflow.
- **Admin Management Panel**: Full rule-engine management for tax years, slabs, thresholds, exemptions, rebates, surcharges, minimum tax, return approvals, and user accounts.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide React, Axios, React Router
- **Backend**: Node.js, Express.js, MySQL (MariaDB), JWT Authentication, bcryptjs
- **Database**: MySQL / MariaDB (Consolidated `schema.sql` and `seed.sql`)

## Getting Started

### 1. Database Setup
1. Create a MySQL database named `income_tax_system`.
2. Import the schema and statutory rules:
   ```bash
   mysql -u root -p income_tax_system < backend/database/schema.sql
   mysql -u root -p income_tax_system < backend/database/seed.sql
   ```

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```
2. Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your MySQL credentials and JWT secret.
4. Start the server:
   ```bash
   npm run dev # or node src/server.js
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```
2. Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```

## Default Accounts
- **Admin**: `rafy@gmail.com` (Password: `111222`)
- **Taxpayer**: `shimul@gmail.com` (Password: `111222`)

## License
MIT

