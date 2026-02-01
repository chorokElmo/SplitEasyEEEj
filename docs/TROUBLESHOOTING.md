# 🔧 SplitEasy Troubleshooting Guide

## Common Issues and Solutions

### 🚫 PowerShell Execution Policy Issues

**Problem**: Scripts cannot run due to PowerShell execution policy restrictions.

**Solutions**:
1. **Use Command Prompt instead of PowerShell**:
   ```cmd
   cd backend
   npm install
   npm start
   ```

2. **Change execution policy** (requires Administrator):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### 🔌 Port Already in Use (EADDRINUSE)

**Problem**: `Error: listen EADDRINUSE: address already in use :::8000`

**Solutions**:
1. **Find and kill the process using port 8000**:
   ```cmd
   netstat -ano | findstr :8000
   taskkill /PID <PID_NUMBER> /F
   ```

2. **Use a different port** via `backend/.env`:
   ```env
   PORT=8001
   ```

### 🗄️ MongoDB Connection Issues

**Problem**: Cannot connect to MongoDB database.

**Solutions**:
1. **Start MongoDB service**:
   ```cmd
   net start MongoDB
   ```

2. **Check MongoDB status**:
   ```cmd
   sc query MongoDB
   ```

3. **Install MongoDB** if not installed: https://www.mongodb.com/try/download/community

### 📦 Node.js/NPM Issues

**Problem**: `node` or `npm` commands not recognized.

**Solutions**:
1. Install Node.js from https://nodejs.org/ (LTS)
2. Restart Command Prompt after installation
3. Verify: `node --version` and `npm --version`

### 🔐 Permission Issues

**Problem**: Access denied or permission errors during installation.

**Solutions**:
1. Run Command Prompt as Administrator
2. Clear npm cache: `npm cache clean --force`
3. Use different npm registry if needed: `npm config set registry https://registry.npmjs.org/`

### 🌐 Network/Firewall Issues

**Problem**: Cannot access localhost URLs or API calls fail.

**Solutions**:
1. Allow Node.js through Windows Firewall
2. Try `http://127.0.0.1:5173` or `http://127.0.0.1:8000` instead of localhost
3. Add project folder to antivirus exclusions if needed

### ⚛️ React (Vite) Development Server Issues

**Problem**: React app won't start or shows errors.

**Solutions**:
1. **Clear node_modules and reinstall**:
   ```cmd
   cd frontend-react
   rmdir /s node_modules
   del package-lock.json
   npm install
   ```

2. **Check for port conflicts**: Vite uses port 5173 by default; kill any process using it if needed

3. **Update dependencies**: `npm update`

### 🔄 API Connection Issues

**Problem**: Frontend cannot connect to backend API.

**Solutions**:
1. **Verify backend is running**: Open `http://localhost:8000/health` in browser
2. **Check CORS**: Backend allows localhost origins in development; see `backend/server.js`
3. **Verify API URL**: Check `frontend-react/.env` — `VITE_API_URL=http://127.0.0.1:8000/api`

## 🚀 Running the Project

**Terminal 1 – Backend:**
```cmd
cd backend
npm install
npm start
```

**Terminal 2 – React Frontend:**
```cmd
cd frontend-react
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

## 📞 Getting Help

1. Check console logs for specific error messages
2. Open browser developer tools (F12) for network errors
3. Verify Node.js v16+ and MongoDB are installed and running

## 📋 Quick Checklist

- [ ] Node.js installed (v16+)
- [ ] MongoDB installed and running
- [ ] No processes using ports 5173 or 8000
- [ ] Dependencies installed in both `backend` and `frontend-react`
- [ ] Backend `.env` file exists (see README)

---

**Happy expense splitting! 💰**
