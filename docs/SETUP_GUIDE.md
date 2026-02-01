# 🚀 SplitEasy - Complete Setup Guide

This guide will help you get the SplitEasy expense-splitting application running on your system.

## 📋 Prerequisites

Before starting, make sure you have:

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB** (v5.0 or higher) - [Download here](https://www.mongodb.com/try/download/community)
3. **Git** (optional) - [Download here](https://git-scm.com/)

## 🔧 Quick Setup (5 minutes)

### Step 1: Start MongoDB

**Windows:**
```cmd
# If MongoDB is installed as a service
net start MongoDB

# Or start manually (adjust path as needed)
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "C:\data\db"
```

**macOS:**
```bash
# With Homebrew
brew services start mongodb-community

# Or manually
mongod --config /usr/local/etc/mongod.conf
```

**Linux:**
```bash
# With systemd
sudo systemctl start mongod

# Or manually
mongod --dbpath /var/lib/mongodb
```

### Step 2: Start the Backend Server

```cmd
cd backend
npm install
npm start
```

### Step 3: Start the React Frontend

```cmd
cd frontend-react
npm install
npm run dev
```

The React app will be at **http://localhost:5173** (Vite default).

### Step 4: Test the Setup

1. Open your browser to `http://localhost:8000/health`
2. You should see: `{"status":"OK","timestamp":"..."}`

## 🎯 Default Test Accounts

If you run the seed script (`npm run seed` in backend), you'll get these test accounts:

- **Admin**: admin@spliteasy.com / admin123
- **Alice**: alice@example.com / password123
- **Bob**: bob@example.com / password123
- **Charlie**: charlie@example.com / password123
- **Diana**: diana@example.com / password123

## 🔗 API Endpoints

Once running, your API will be available at:
- **Base URL**: http://localhost:8000
- **API Base**: http://localhost:8000/api
- **Health Check**: http://localhost:8000/health

### Key Endpoints:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/groups` - Get user's groups
- `POST /api/expenses` - Add new expense
- `GET /api/settle` - Get settlement calculations

## 🛠 Troubleshooting

See **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** for common issues and solutions.

## 📁 Project Structure

```
SplitEasy/
├── backend/                 # Node.js/Express API
│   ├── config/             # Database configuration
│   ├── controllers/        # Route controllers (MVC)
│   ├── middleware/         # Custom middleware
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── scripts/            # Database seeding scripts
│   ├── utils/              # Utility functions
│   ├── .env                # Environment variables
│   └── server.js           # Main server file
├── frontend-react/         # React (Vite) frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── lib/            # API & utilities
│   │   └── i18n/           # Internationalization
│   └── package.json
├── docs/                   # Documentation
└── README.md
```

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ Backend server starts without errors
2. ✅ Health check returns `{"status":"OK"}`
3. ✅ MongoDB connection is established
4. ✅ React app loads at http://localhost:5173
5. ✅ You can register and login through the web interface

## 🚀 Next Steps

Once everything is running:

1. **Explore the Features**: Create groups, add expenses, view balances
2. **Development**: Check `backend/README.md` for API details
3. **Production**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## 🔒 Security Notes

For production deployment:
- Change the JWT_SECRET to a strong, random value
- Set NODE_ENV to 'production'
- Configure proper CORS origins
- Use HTTPS
- Set up proper database authentication

---

**Happy expense splitting! 💰**
