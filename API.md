# Suarabumi API Reference

Base URL: `http://127.0.0.1:3001`  
Auth: `Authorization: Bearer <accessToken>`  
Operator: `X-Operator-Key: operator-dev-key`

## Auth & Akun (`/api/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Email/password register (+ optional `referralCode`) |
| POST | `/login` | Login → `accessToken`, `refreshToken` |
| POST | `/oauth/:provider` | Google/Facebook (`google`, `facebook`) |
| POST | `/otp/send` | Generate OTP (dev code in response) |
| POST | `/otp/resend` | Resend OTP |
| POST | `/otp/verify` | Verify OTP |
| POST | `/forgot-password` | Send reset link (logged in dev) |
| POST | `/reset-password` | Reset with token |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Revoke refresh tokens |

## Pengaturan (`/api/settings`) 🔒

| Method | Path | Description |
|--------|------|-------------|
| GET | `/account-status` | Status akun |
| GET | `/preferences` | Preferensi notifikasi, bahasa, dll |
| PATCH | `/preferences` | Update preferensi |
| PATCH | `/password` | Ganti password |

## Bantuan (`/api/help`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/faq` | Daftar FAQ |
| GET | `/faq/search?q=` | Cari FAQ |
| POST | `/live-chat/session` | Session live chat 🔒 |
| POST | `/support/ticket` | Kirim tiket support 🔒 |

## Setor Sampah (`/api/deposits`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Catat setor pending + QR token 🔒 |
| GET | `/verify/:token` | Detail transaksi by token |
| POST | `/:id/verify` | Operator verifikasi setor |
| GET | `/history` | Riwayat setor 🔒 |

## Drop Point (`/api/drop-points`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List (`?material=&q=&lat=&lng=`) |
| GET | `/:id` | Detail |
| GET | `/:id/status` | Status buka/tutup |

## Penjemputan (`/api/pickups`) 🔒

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Jadwal aktif |
| POST | `/` | Buat jadwal |
| PATCH | `/:id` | Update jadwal |
| DELETE | `/:id` | Batalkan |
| PATCH | `/:id/courier-status` | Status kurir (operator) |
| POST | `/:id/complete` | Selesai + award poin (operator) |

## Reward (`/api/rewards`) 🔒

| Method | Path | Description |
|--------|------|-------------|
| GET | `/balance` | Saldo & progress reward |
| GET | `/history` | Mutasi poin |
| GET/PUT | `/ewallet` | E-wallet |
| POST | `/redeem` | Tukar poin |

## Referral (`/api/referral`) 🔒

| Method | Path | Description |
|--------|------|-------------|
| GET | `/code` | Kode referral |
| GET | `/stats` | Statistik |
| POST | `/validate` | Validasi kode |

## Webhooks (`/api/webhooks`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ewallet/redemption` | Callback provider e-wallet |

## Existing modules

- `GET /api/dashboard` 🔒
- `GET /api/profile` 🔒
- `GET /api/climate-impact` 🔒
- `GET /api/challenges/overview` 🔒
- `GET /api/leaderboard`
- `GET /api/badges` 🔒

🔒 = requires Bearer token
