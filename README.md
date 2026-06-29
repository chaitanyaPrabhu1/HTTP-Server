# Chirpy HTTP Server

A small Twitter-style JSON API ("chirps") built with **Express 5**, **TypeScript**, **Drizzle ORM**, and **PostgreSQL**. It supports user accounts, JWT-based authentication with refresh tokens, posting/reading/deleting short messages, and a webhook for upgrading users to "Chirpy Red".

## Features

- User signup, login, and profile updates with **argon2** password hashing
- **JWT** access tokens (1 hour) + long-lived **refresh tokens** (60 days) with revocation
- Create, list, fetch, and delete chirps (max 140 characters, with profanity filtering)
- Filter chirps by author and sort by creation date (`asc` / `desc`)
- Polka webhook to upgrade a user to Chirpy Red
- Static file serving with a request-count metrics endpoint
- Automatic database migrations on startup via Drizzle

## Tech Stack

- Runtime: Node.js (ESM)
- Web framework: Express 5
- Language: TypeScript
- ORM / migrations: Drizzle ORM + drizzle-kit
- Database: PostgreSQL (`postgres` driver)
- Auth: jsonwebtoken, argon2
- Tests: Vitest

## Prerequisites

- Node.js 22+ (uses `process.loadEnvFile`)
- A running PostgreSQL instance

## Setup

1. Clone and install dependencies:

   ```bash
   git clone git@github.com:chaitanyaPrabhu1/http-server.git
   cd http-server
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   DB_URL=postgres://user:password@localhost:5432/chirpy
   JWT_SECRET=your-long-random-secret
   POLKA_KEY=your-polka-api-key
   ```

3. (Optional) Generate/apply migrations with drizzle-kit. Migrations also run automatically when the server starts.

   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

## Running

```bash
npm run dev     # compile with tsc and start the server
npm run build   # compile TypeScript to ./dist
npm start       # run the compiled server from ./dist
npm test        # run the Vitest test suite
```

The server listens on **http://localhost:8080**.

## API Endpoints

| Method | Path                     | Description                                  | Auth          |
| ------ | ------------------------ | -------------------------------------------- | ------------- |
| GET    | `/api/healthz`           | Readiness check                              | —             |
| GET    | `/admin/metrics`         | HTML page with fileserver hit count          | —             |
| POST   | `/admin/reset`           | Reset metrics and delete all users           | —             |
| POST   | `/api/users`             | Create a user                                | —             |
| PUT    | `/api/users`             | Update the current user's email/password     | Bearer (JWT)  |
| POST   | `/api/login`             | Log in, returns JWT + refresh token          | —             |
| POST   | `/api/refresh`           | Get a new access token from a refresh token  | Bearer        |
| POST   | `/api/revoke`            | Revoke a refresh token                       | Bearer        |
| GET    | `/api/chirps`            | List chirps (`?authorId=`, `?sort=asc\|desc`)| —             |
| GET    | `/api/chirps/:chirpId`   | Get a single chirp                           | —             |
| POST   | `/api/chirps`            | Create a chirp (max 140 chars)               | Bearer (JWT)  |
| DELETE | `/api/chirps/:chirpId`   | Delete own chirp                             | Bearer (JWT)  |
| POST   | `/api/polka/webhooks`    | Upgrade a user to Chirpy Red                 | API key       |
| GET    | `/app/*`                 | Static files served from `src/app`           | —             |

## Project Structure

```
src/
  index.ts            # Express app, routes, and handlers
  config.ts           # Environment-driven configuration
  auth.ts             # JWT, password hashing, token helpers
  errors.ts           # Typed HTTP error classes
  db/
    schema.ts         # Drizzle table definitions (users, chirps, refresh_tokens)
    index.ts          # Database client
    queries/          # Query functions per entity
    migrations/       # Generated SQL migrations
  app/                # Static assets served at /app
```

## License

ISC
