# Deploy with Neon, Vercel, and a NestJS API host

This configuration requires three services:

- **Neon:** PostgreSQL database
- **Vercel:** React/Vite frontend
- **Railway or Render:** NestJS API

Do not use the demo seed as real nursery data.

## 1. Create the Neon database

1. Create a Neon project and database.
2. Copy the **pooled** PostgreSQL connection string.
3. It should contain `sslmode=require` or `?sslmode=require`.

Example:

```text
postgresql://USER:PASSWORD@HOST-pooler.neon.tech/DBNAME?sslmode=require&pgbouncer=true
```

## 2. Deploy the API

Deploy `apps/api` using the included Dockerfile, or configure the API host as a Node service.

Set these API environment variables:

```text
NODE_ENV=production
PORT=3000
DATABASE_URL=your Neon pooled connection string
JWT_ACCESS_SECRET=long-random-secret
COOKIE_SECURE=true
COOKIE_SAME_SITE=None
CORS_ORIGIN=https://YOUR-APP.vercel.app
```

Generate a secret locally:

```sh
openssl rand -hex 48
```

If Neon is the database, run committed migrations once before starting the API:

```sh
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

Using the API host's deployment build command is safer:

```text
Build: npm ci && npm run db:generate && npm run api:build
Start: npm run db:migrate && npm run start --workspace @mashtal/api
```

The API Dockerfile can also be used directly. After deployment, verify:

```text
https://YOUR-API-HOST/api/health
```

## 3. Deploy the React frontend to Vercel

In Vercel:

1. Import the GitHub repository.
2. Select Vite as the framework.
3. Set the root directory to the repository root.
4. Set `VITE_API_URL=https://YOUR-API-HOST/api`.
5. Deploy.

If the frontend URL changes after deployment, update `CORS_ORIGIN` on the API host and redeploy it.

For a custom Vercel domain, add the exact HTTPS origin, for example:

```text
CORS_ORIGIN=https://nursery.example.com
```

Do not include `/api` in `CORS_ORIGIN`.

## 4. Cookie behavior

Frontend and API hostnames are normally different websites, so the API must use:

```text
COOKIE_SECURE=true
COOKIE_SAME_SITE=None
```

Both values are required for HTTPS cross-origin cookies.

A custom domain for the frontend and API under the same parent domain can use `SameSite=Strict`, but the application currently provides no cookie `Domain` setting.

## 5. Optional demo seed

Run seed only on disposable/demo data:

```text
SEED_ADMIN_EMAIL=owner@example.com
SEED_ADMIN_PASSWORD=unique-password-at-least-12-characters
```

Seed command:

```sh
npm run db:seed --workspace @mashtal/api
```

## 6. Production checklist

- Create a Neon backup and restore plan.
- Test database migrations on a copy first.
- Keep migration secrets out of source control.
- Set exact HTTPS Vercel origin(s) in `CORS_ORIGIN`.
- Set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=None` on the API.
- Rotate every placeholder password and JWT secret.
- Avoid shared or public production credentials.
- Run unit, API end-to-end, UI, and build tests before release.
- Use a custom API domain and monitoring for a real deployment.
