# Finrep Panel

Finrep is a React and Node.js application for user management, wallet operations, bureau reports, verification services, eSign workflows, API pricing, reporting, and administration.

## Technology

- Frontend: React 19, TypeScript, Vite
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- Email: SMTP through Nodemailer

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- A reachable MongoDB database
- Valid SMTP and provider credentials for the services that will be used

## Included directories

- `frontend/`: React administration panel
- `backend/`: Express API and business logic
- `backend/.env`: Environment configuration

`node_modules`, compiled builds, caches, logs, uploads, and other runtime files are not included.

## Local setup

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Configure the backend

Review `backend/.env` before starting the application. At minimum, confirm these settings:

```env
NODE_ENV=development
HOST=127.0.0.1
PORT=4100
MONGO_URI=mongodb_connection_string
APP_URL=http://localhost:5173
CLIENT_ORIGIN=http://localhost:5173
SUPER_ADMIN_EMAIL=admin_email
SUPER_ADMIN_PASSWORD=admin_password
```

Also configure the SMTP, payment gateway, and verification-provider variables required by the enabled services.

The frontend does not require a separate `.env` for local development. Vite proxies requests beginning with `/api` to `http://127.0.0.1:4100`.

### 4. Start the backend

From the `backend` directory:

```bash
npm run dev
```

The backend starts on `http://127.0.0.1:4100`. It connects to MongoDB and ensures the configured super-admin account exists during startup.

### 5. Start the frontend

In a separate terminal, from the `frontend` directory:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## Available commands

### Backend

```bash
npm run dev
npm start
npm test
npm run seed:super-admin
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm test
```

## Production build

Build the frontend:

```bash
cd frontend
npm install
npm run build
```

The generated frontend files are written to `frontend/dist`.

Start the backend:

```bash
cd backend
npm install --omit=dev
npm start
```

For a split frontend/backend deployment, serve `frontend/dist` with the web server and reverse-proxy `/api` requests to the backend on port `4100`.

## Security

The included `backend/.env` contains private configuration. Transfer the archive securely, do not commit the file to source control, and rotate credentials if the archive is shared outside the intended team.

## Common startup issues

- Database connection failure: verify `MONGO_URI` and database network access.
- Browser CORS failure: confirm `CLIENT_ORIGIN` matches the frontend URL.
- Email failure: verify the SMTP host, port, username, password, sender, and security mode.
- Provider request failure: confirm the relevant provider base URL and credentials in `backend/.env`.
- Frontend API failure: confirm the backend is running on port `4100` before starting Vite.
