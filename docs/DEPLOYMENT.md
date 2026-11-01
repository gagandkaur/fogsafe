# FogSafe – Deploying so ANY phone (not just same-WiFi) can connect

Locally, `https://192.168.x.x:5173` only works for devices on the same WiFi as
your laptop. To let devices anywhere connect (different WiFi, mobile data),
deploy the backend and frontend to the internet. This uses three free services:
**MongoDB Atlas** (database), **Render** (backend), **Vercel** (frontend).

## 1. MongoDB Atlas (database)
1. Sign up at mongodb.com/cloud/atlas -> create a free (M0) cluster.
2. Database Access -> add a user with a password.
3. Network Access -> Add IP Address -> "Allow access from anywhere" (0.0.0.0/0)
   — fine for a prototype, tighten later.
4. Connect -> Drivers -> copy the connection string, e.g.:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/fogsafe`
   Keep this — it's your `MONGODB_URI`.

## 2. Render (backend)
1. Push this project to a GitHub repo.
2. render.com -> New -> Web Service -> connect your repo.
3. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Environment variables (Render dashboard -> Environment):
   - `MONGODB_URI` = the Atlas string from step 1
   - `CORS_ORIGIN` = your Vercel URL (add this AFTER step 3, e.g.
     `https://fogsafe.vercel.app`) — leave blank for now, fill in later.
5. Deploy. Note the URL Render gives you, e.g.
   `https://fogsafe-backend.onrender.com`. Test it: open
   `https://fogsafe-backend.onrender.com/api/health` in a browser — should
   show `{"ok":true,...}`.

   Free Render services sleep after inactivity; the first request after a
   while takes ~30s to wake up. Fine for a demo, mention it if a first
   connection seems slow.

## 3. Vercel (frontend)
1. vercel.com -> New Project -> import the same GitHub repo.
2. Settings:
   - Root Directory: `frontend`
   - Build Command: `npm run build` (default)
   - Output Directory: `dist` (default)
3. Environment variable:
   - `VITE_BACKEND_URL` = `https://fogsafe-backend.onrender.com` (your Render URL from step 2)
4. Deploy. You'll get a URL like `https://fogsafe.vercel.app`.

## 4. Close the loop (CORS)
Go back to Render -> Environment -> set `CORS_ORIGIN` to your Vercel URL
(`https://fogsafe.vercel.app`, no trailing slash) -> Render redeploys
automatically.

## 5. Test
Open `https://fogsafe.vercel.app` on any phone, on ANY network (WiFi or
mobile data). No certificate warning this time — Vercel/Render provide real
HTTPS certificates. Tap "Real phones" -> "Join as Vehicle (GPS)". Do the same
on a second phone (different network entirely, e.g. one on WiFi, one on
mobile data) — they should see each other, exactly like the same-WiFi test,
but now from anywhere.

## Notes
- Local development (`npm run dev`) is unaffected — it still uses
  `localhost`/the LAN IP and the Vite proxy, no env vars needed.
- Never commit `.env` files (only `.env.example`) — they're for your local
  MongoDB URI or secrets, not for the repo.
