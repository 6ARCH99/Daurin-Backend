# Backend — MySQL setup

Database: **MySQL 8.0** via Prisma (`backend/prisma/schema.prisma`).

## Option A — Docker (recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```powershell
cd backend
npm install
npm run db:up
npm run db:wait
npm run db:setup
npm run dev
```

## Option B — Local MySQL (XAMPP / MySQL Installer)

1. Create database and user:

```sql
CREATE DATABASE suarabumi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'suarabumi'@'localhost' IDENTIFIED BY 'suarabumi_dev';
GRANT ALL PRIVILEGES ON suarabumi.* TO 'suarabumi'@'localhost';
FLUSH PRIVILEGES;
```

2. Copy `.env.example` → `.env` and set:

```env
DATABASE_URL="mysql://suarabumi:suarabumi_dev@127.0.0.1:3306/suarabumi"
```

3. Apply schema + seed:

```powershell
npm run db:setup
npm run dev
```

## Production

Use a managed MySQL URL in `DATABASE_URL`, then:

```powershell
npm run db:generate
npx prisma db push
npm run db:seed
```

For production with migrations, prefer `npm run db:migrate` instead of `db push`.
