# Inventory Management System - MongoDB Edition

A complete ceramic shop inventory management system with automatic stock tracking, built with **MongoDB** instead of PostgreSQL.

## ✅ Why MongoDB for This Project?

- **Simpler setup** - No complex PostgreSQL service on Windows
- **Cloud-ready** - MongoDB Atlas provides free cloud hosting
- **Perfect for JSON data** - Inventory items are naturally hierarchical
- **Same API** - All endpoints work identically
- **No schema headaches** - Prisma manages everything

## 🚀 Quick Start

### 1. Choose Your MongoDB Option

**Option A: Cloud (MongoDB Atlas) - Recommended**
- Sign up free: https://www.mongodb.com/cloud/atlas
- Zero installation needed
- Can access from multiple devices

**Option B: Local MongoDB**
- Download from https://www.mongodb.com/try/download/community
- Runs on your computer
- No internet needed

See **MONGODB_SETUP.md** for detailed instructions on both.

### 2. Install Prerequisites
```bash
# Download and install Node.js 20 LTS
# https://nodejs.org/
```

### 3. Backend Setup
```bash
cd backend
npm install
copy .env.example .env  # Windows
cp .env.example .env    # Mac/Linux

# Edit .env with your MongoDB connection string
# (Instructions in MONGODB_SETUP.md)

npx prisma generate
npx prisma db push
npm run dev
```

### 4. Frontend Setup (New Terminal)
```bash
cd frontend
npm install
copy .env.example .env  # Windows
cp .env.example .env    # Mac/Linux
npm run dev
```

### 5. Access Application
- Browser: **http://localhost:5173**
- Register owner account
- Start using the system!

## 📚 Documentation

- **MONGODB_SETUP.md** - Complete MongoDB setup guide (START HERE)
- **SETUP_GUIDE.md** - Step-by-step installation for your PC
- **planning.md** - Complete feature specifications

## 🏗️ Technology Stack

**Backend**
- Node.js 20 LTS
- Express.js + TypeScript
- Prisma ORM
- MongoDB

**Frontend**
- React 18 + TypeScript
- Vite + Tailwind CSS
- React Router v6
- Axios API client

## 📋 Features

✅ Automatic stock management
✅ Product categorization (size, company, finish, etc.)
✅ Sales & Purchase management
✅ Customer & Supplier tracking
✅ Dashboard with low stock alerts
✅ Reports (stock, sales, purchases)
✅ Role-based permissions (owner/staff)
✅ Mobile responsive design

## 🎯 First Steps

1. **Read MONGODB_SETUP.md** - Choose your MongoDB option
2. **Follow SETUP_GUIDE.md** - Install everything on your PC
3. **Start the servers** - Backend & Frontend
4. **Register & Login** - Create owner account
5. **Add products** - Start building your inventory

## ❓ Issues with PostgreSQL?

This MongoDB version solves common PostgreSQL issues:
- ❌ "Service won't start" → ✅ No service needed with MongoDB
- ❌ "Port already in use" → ✅ Simple configuration
- ❌ "Connection refused" → ✅ Cloud option available
- ❌ Complex installation → ✅ Much simpler setup

## 📞 Need Help?

1. Check **MONGODB_SETUP.md** first
2. Verify .env files are correct
3. Ensure MongoDB is running
4. Check console for error messages

## 🔄 All Features from PostgreSQL Version

**Everything works the same:**
- All API endpoints identical
- Same database schema
- Same authentication system
- Same frontend UI
- Same reporting & analytics

The only difference is MongoDB instead of PostgreSQL - which is actually easier!
