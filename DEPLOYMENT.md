# Tazkara Deployment Guide - Vercel Only

**NO CREDIT CARD REQUIRED** - Deploy everything on Vercel for free!

## What's Changed

The backend has been converted to Next.js API routes. Now you can deploy everything (frontend + backend) to Vercel with **one click**.

---

## Quick Deploy to Vercel

### Step 1: Push to GitHub
Make sure your code is pushed to GitHub.

### Step 2: Import to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Framework Preset: **Next.js** (auto-detected)

### Step 3: Configure Environment Variables
Add these in Vercel Project Settings:

```
MONGODB_URI=mongodb+srv://adamwael:ADAMwael7070@tazkara.vstgt64.mongodb.net/tazkara?retryWrites=true&w=majority&appName=tazkara

JWT_SECRET=Generate_a_random_32_char_string

JWT_EXPIRES_IN=7d

NEXT_PUBLIC_GOOGLE_CLIENT_ID=317034001675-i1labe4hedhjo0onpjru359ansbvvkkb.apps.googleusercontent.com

ADMIN_EMAILS=dodogomma2015@gmail.com

ACCESS_MODE=open

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=adamtickets2026@gmail.com
SMTP_PASS=htqwzxhrmbbmtcgi
EMAIL_FROM=adamtickets2026@gmail.com
```

### Step 4: Deploy
Click **Deploy** and wait ~2 minutes.

**Your app will be live at:** `https://your-project.vercel.app`

---

## Local Development

Now you can run the entire app (frontend + API) with one command:

```bash
cd tazkara/frontend
npm install
npm run dev
```

Then open http://localhost:3000

The frontend now includes the API routes, so you don't need to run the backend separately!

---

## Project Structure

```
tazkara/frontend/
├── pages/
│   ├── api/
│   │   ├── auth/[...path].js   # Auth endpoints
│   │   ├── events/index.js     # Events endpoints  
│   │   ├── orders/index.js     # Orders endpoints
│   │   └── tickets/index.js    # Tickets endpoints
│   ├── _app.js
│   ├── index.js
│   ├── login.js
│   ├── register.js
│   └── ...
├── models/                     # MongoDB models
│   ├── User.js
│   ├── Event.js
│   ├── Order.js
│   └── Ticket.js
├── lib/
│   ├── db.js                   # MongoDB connection
│   └── auth.js                 # Auth middleware
└── ...
```

---

## Google OAuth Setup

For Google Login to work in production:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   ```
   https://your-project.vercel.app/api/auth/callback/google
   ```
5. Add to **Authorized JavaScript origins**:
   ```
   https://your-project.vercel.app
   ```

---

## Features Working

✅ User Registration with email/password  
✅ Login with Google OAuth  
✅ Login with email/password  
✅ Create/View Events  
✅ Purchase Tickets (wave-based)  
✅ QR Code Tickets (emailed)  
✅ Admin Dashboard  
✅ Scanner Page  
✅ Profile & Password Change  

---

## Troubleshooting

### CORS Errors
Not an issue anymore - API routes are on the same domain!

### Login Not Working
Make sure you added the Vercel URL to Google Cloud Console.

### Emails Not Sending
Check SMTP credentials are correct in Vercel env vars.

### Database Connection
Make sure MONGODB_URI is correct in Vercel env vars.

---

## Production URL

After deployment, update your environment:

In Vercel, set:
```
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```
