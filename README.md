# 🎟️ Tazkara — Digital Ticketing Platform

A production-ready full-stack ticketing application built with Node.js/Express, Next.js, MongoDB, and Tailwind CSS.

---

## 🚀 Quick Start

### 1. Clone & install dependencies

```bash
# Install root dev dependencies
npm install

# Install backend & frontend dependencies
npm run install:all
```

### 2. Configure environment variables

**Backend** — copy and fill in:
```bash
cp server/.env.example server/.env
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection URI (Atlas or local) |
| `JWT_SECRET` | Long random string for JWT signing |
| `ADMIN_SECRET` | Secret key to register admin accounts |
| `PORT` | Server port (default: 5000) |
| `CLIENT_URL` | Frontend URL for CORS (default: http://localhost:3000) |

**Frontend** — copy and fill in:
```bash
cp frontend/.env.local.example frontend/.env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: http://localhost:5000/api) |

### 3. Run in development mode

```bash
npm run dev
```

This starts both the Express backend (port 5000) and Next.js frontend (port 3000) concurrently.

---

## 📁 Project Structure

```
tazkara/
├── server/                     # Express backend
│   ├── server.js               # Main server entrypoint
│   ├── models/
│   │   ├── User.js             # User model (bcrypt hashed password)
│   │   ├── Event.js            # Event model (seat inventory)
│   │   ├── Ticket.js           # Ticket model (QR code, status)
│   │   └── Order.js            # Order model (purchase record)
│   ├── routes/
│   │   ├── auth.js             # Signup / Login / Me
│   │   ├── events.js           # CRUD for events
│   │   ├── orders.js           # Purchase (atomic, race-safe)
│   │   └── tickets.js          # Get / validate tickets
│   └── middleware/
│       └── authMiddleware.js   # JWT protect + adminOnly guards
│
└── frontend/                   # Next.js frontend
    ├── pages/
    │   ├── index.js            # Homepage (event listing)
    │   ├── login.js            # Login form
    │   ├── signup.js           # Signup form
    │   ├── dashboard.js        # User's tickets dashboard
    │   ├── admin.js            # Admin event management
    │   └── event/[id].js       # Event detail + ticket purchase
    └── components/
        ├── Navbar.js           # Responsive navigation
        ├── EventCard.js        # Event card with sold-out badge
        └── TicketCard.js       # Ticket with QR code toggle
```

---

## 🔒 Key Features

### Concurrency Safety (Race Condition Prevention)
Ticket purchases use MongoDB's **atomic `findOneAndUpdate`** with a conditional `$gte` check:

```js
// Only succeeds if enough seats exist — handles 20k concurrent users
Event.findOneAndUpdate(
  { _id: eventId, [seatField]: { $gte: quantity } },  // Atomic condition
  { $inc: { [seatField]: -quantity } },               // Atomic decrement
  { session }                                          // Wrapped in transaction
)
```

This prevents race conditions without application-level locking.

### Email (Ethereal Sandbox)
Nodemailer uses Ethereal test accounts — no real emails are sent. After purchase, a **preview URL** is printed to the server console. Click it to see the email with QR codes.

### Admin Registration
To create an admin account, check "Register as admin" on the signup page and enter the `ADMIN_SECRET` from your `.env`. Without the secret, you get a regular user account regardless.

---

## 🛠️ API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Register user |
| POST | `/api/auth/login` | — | Login, get JWT |
| GET | `/api/auth/me` | JWT | Get current user |
| GET | `/api/events` | — | List all events |
| GET | `/api/events/:id` | — | Get event details |
| POST | `/api/events` | Admin | Create event |
| DELETE | `/api/events/:id` | Admin | Deactivate event |
| POST | `/api/orders` | JWT | Purchase tickets |
| GET | `/api/orders` | JWT | User's orders |
| GET | `/api/tickets/my` | JWT | User's tickets |
| PATCH | `/api/tickets/:code/use` | Admin | Mark ticket used |

---

## 📦 Tech Stack

- **Backend**: Node.js, Express, Mongoose, JWT, bcryptjs, QRCode, Nodemailer
- **Frontend**: Next.js 14, TailwindCSS, Framer Motion, Axios, react-hot-toast
- **Database**: MongoDB (Atlas or local)
