# Saarthi AI - Intelligent UPI Fraud Prevention System

🛡️ Real-time fraud detection and prevention for UPI transactions using hybrid AI (Rule-based + Machine Learning).

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd saarthi-ai
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your MongoDB URI and other settings
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your API URL
   npm run dev
   ```

4. **Access the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

---

## 📦 Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (free)
- MongoDB Atlas account (free)

### Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel auto-detects configuration
   - Add environment variables (see below)
   - Click "Deploy"

3. **Environment Variables**
   
   Add these in Vercel Dashboard → Settings → Environment Variables:
   
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your_secret_key
   NODE_ENV=production
   VITE_API_URL=https://your-app.vercel.app/api
   ```

4. **Done!** 🎉
   Your app is live at `https://your-app.vercel.app`

📖 **Detailed Guide:** See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

---

## 🏗️ Project Structure

```
saarthi-ai/
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── api/          # API client
│   │   └── state/        # State management
│   └── package.json
│
├── backend/               # Express.js backend
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── models/       # MongoDB models
│   │   ├── services/     # Business logic
│   │   └── ml/           # ML models
│   └── package.json
│
├── vercel.json           # Vercel configuration
└── README.md
```

---

## 🔑 Key Features

- ✅ **Hybrid AI Risk Scoring** - Rule-based + ML anomaly detection
- ✅ **Real-time Analysis** - Instant fraud detection
- ✅ **Behavioral Profiling** - Learns user patterns
- ✅ **Trusted Contacts** - SMS alerts for high-risk transactions
- ✅ **Beautiful UI** - Modern, responsive design with animations
- ✅ **Secure** - PIN verification, JWT authentication

---

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Framer Motion
- Zustand

**Backend:**
- Node.js
- Express.js
- MongoDB
- Redis (optional)
- ML (Isolation Forest)

---

## 📊 API Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /transaction/intent` - Submit transaction for risk analysis
- `POST /transaction/feedback` - Confirm/cancel transaction
- `GET /transaction/history/:user_id` - Get transaction history
- `POST /user/nominee` - Set trusted contact

---

## 🔐 Security

- JWT-based authentication
- PIN verification for transactions
- Encrypted sensitive data
- Rate limiting
- CORS protection

---

## 📝 License

ISC

---

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

---

## 📧 Support

For issues or questions, please open a GitHub issue.

---

**Built with ❤️ for safer digital payments**
