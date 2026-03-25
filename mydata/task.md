# Authentication & RBAC — Task Checklist

## Fase 1: Database
- [x] Create `users` table (id, username, password_hash, role, id_kader)
- [x] Create migration script + run

## Fase 2: Backend Auth
- [x] Install bcryptjs + jsonwebtoken
- [x] Create [middleware/auth.js](file:///d:/MAINSERVER/laragon/www/Pemilu/middleware/auth.js) (verifyToken, isSuperadmin)
- [x] Add POST `/api/auth/login` endpoint
- [x] Add POST `/api/auth/register` endpoint (Superadmin only)
- [x] Add GET `/api/auth/me` endpoint (current user info)
- [x] Seed default Superadmin account
- [x] Protect all API routes with verifyToken
- [x] Protect admin-only routes with isSuperadmin

## Fase 3: Frontend
- [x] Create [login.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/login.html) page
- [x] Add token to all fetch() headers ([auth.js](file:///d:/MAINSERVER/laragon/www/Pemilu/public/js/auth.js) helper + modified [pemilih.js](file:///d:/MAINSERVER/laragon/www/Pemilu/public/js/pemilih.js)/[kader.js](file:///d:/MAINSERVER/laragon/www/Pemilu/public/js/kader.js))
- [x] Add auth guard — redirect to login if no token ([auth.js](file:///d:/MAINSERVER/laragon/www/Pemilu/public/js/auth.js))
- [x] UI manipulation: hide admin-only buttons for Kader role (`.superadmin-only`)
- [x] Add logout button to header
- [x] Show current user info in header
