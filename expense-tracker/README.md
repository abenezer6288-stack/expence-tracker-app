# AI-Powered Expense Tracker

A full-stack mobile app with OCR receipt scanning, smart insights, and budget management.

## Features

- 📱 Cross-platform mobile app (iOS, Android, Web)
- 🔐 Secure authentication with JWT tokens
- 💰 Multi-currency support (USD, EUR, GBP, INR, JPY, CAD, AUD, ETB)
- 📊 Real-time analytics and spending insights
- 📸 OCR receipt scanning
- 🔔 **Auto-track expenses from payment notifications**
- 💳 Budget management per category
- 🌙 Dark mode support
- 📈 Monthly and yearly spending charts
- 🔔 Notifications and alerts
- 👤 User profile management

## Tech Stack

- **Mobile**: React Native (Expo SDK 54)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 18
- **OCR**: Tesseract.js
- **Auth**: JWT (access + refresh tokens)
- **Charts**: react-native-chart-kit
- **State Management**: Zustand
- **Navigation**: React Navigation

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/forgot-password | Send reset email |
| POST | /api/auth/reset-password | Reset password |
| POST | /api/auth/logout | Logout |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/expenses | List expenses (paginated, filterable) |
| GET | /api/expenses/:id | Get single expense |
| POST | /api/expenses | Create expense |
| PUT | /api/expenses/:id | Update expense |
| DELETE | /api/expenses/:id | Delete expense |

### OCR
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ocr/scan | Upload image, extract transaction data |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/monthly?month=&year= | Monthly summary + charts data |
| GET | /api/analytics/yearly?year= | Yearly overview |
| GET | /api/analytics/insights | AI-generated spending insights |

### Budgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/budgets?month=&year= | Get budgets with spending |
| POST | /api/budgets | Create/update budget |
| DELETE | /api/budgets/:id | Delete budget |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/profile | Get profile |
| PUT | /api/users/profile | Update profile |
| PUT | /api/users/change-password | Change password |
| GET | /api/users/categories | Get all categories |

---

## Setup & Deployment

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Expo CLI (`npm install -g expo-cli`)
- For iOS: Xcode (Mac only)
- For Android: Android Studio
- Git

### Backend Setup

```bash
cd expense-tracker/backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your DB credentials, JWT secrets, SMTP settings

# Create PostgreSQL database
createdb expense_tracker
# Or using psql:
# psql -U postgres
# CREATE DATABASE expense_tracker;

# Run migrations
npm run migrate

# Start development server
npm run dev

# Start production
npm start
```

**Environment Variables (.env)**
```env
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_tracker
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=30d

# Email (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# File uploads
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# Frontend URL (for CORS) - add multiple URLs separated by comma
CLIENT_URL=http://localhost:8081,http://YOUR_IP:8081
```

### Mobile App Setup

```bash
cd expense-tracker/mobile

# Install dependencies
npm install

# For physical device testing:
# 1. Find your computer's IP address
#    Windows: ipconfig
#    Mac/Linux: ifconfig
# 2. Update API URL in src/services/api.ts
#    Change BASE_URL to: http://YOUR_IP:5000/api

# Start Expo development server
npx expo start

# Options:
# - Press 'w' to open in web browser
# - Press 'a' to open in Android emulator
# - Press 'i' to open in iOS simulator
# - Scan QR code with Expo Go app on your phone

# Build for production
npx eas build --platform android
npx eas build --platform ios
```

### Testing on Physical Device

1. **Install Expo Go** on your phone (iOS/Android)
2. **Ensure same WiFi**: Phone and computer must be on the same network
3. **Find your IP address**:
   ```bash
   # Windows
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   
   # Mac/Linux
   ifconfig
   # Look for inet address
   ```
4. **Update API URL** in `mobile/src/services/api.ts`:
   ```typescript
   const BASE_URL = 'http://YOUR_IP:5000/api';
   ```
5. **Update backend CORS** in `backend/.env`:
   ```env
   CLIENT_URL=http://localhost:8081,http://YOUR_IP:8081
   ```
6. **Restart both servers**
7. **Scan QR code** from terminal with Expo Go app

---

### Database Schema

```sql
users          - id, name, email, password_hash, currency, monthly_budget
categories     - id, name, icon, color (8 defaults seeded)
expenses       - id, user_id, category_id, amount, currency, description, merchant, date, source
budgets        - id, user_id, category_id, amount, month, year
refresh_tokens - id, user_id, token, expires_at
password_reset_tokens - id, user_id, token, expires_at, used
```

### Production Deployment (Docker)

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 5000
CMD ["node", "src/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: expense_tracker
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    env_file: ./backend/.env
    depends_on:
      - db

volumes:
  pgdata:
```

---

## Security Features

- JWT access tokens (7d) + refresh tokens (30d) with rotation
- bcrypt password hashing (cost factor 12)
- Rate limiting on all routes (100 req/15min, 10 auth req/15min)
- Helmet.js security headers
- Input validation on all endpoints
- SQL injection prevention via parameterized queries
- File upload validation (type + size limits)
- Password reset tokens expire in 1 hour and are single-use


---

## Troubleshooting

### Backend Issues

**Port already in use (EADDRINUSE)**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

**Database connection failed**
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Ensure database exists: `psql -l`

**Migration errors**
```bash
# Drop and recreate database
dropdb expense_tracker
createdb expense_tracker
npm run migrate
```

### Mobile App Issues

**Network Error / Cannot connect to backend**
- Ensure backend is running on port 5000
- Check API URL in `src/services/api.ts`
- Verify phone and computer are on same WiFi
- Check firewall settings (allow port 5000)
- Try using computer's IP instead of localhost

**Expo Go app not loading**
- Clear Expo cache: `npx expo start -c`
- Restart Expo server
- Reinstall dependencies: `rm -rf node_modules && npm install`

**Build errors**
```bash
# Clear all caches
npx expo start -c
rm -rf node_modules
npm install
```

**Storage issues on web**
- The app uses localStorage on web and SecureStore on native
- Clear browser cache if login issues persist

### Common Issues

**409 Conflict on registration**
- Email already exists in database
- Use different email or clear users table:
  ```sql
  TRUNCATE TABLE users, refresh_tokens CASCADE;
  ```

**Charts not displaying**
- Warnings about `onResponderTerminate` are normal on web
- Charts work perfectly on native devices

**Currency not updating**
- Reload the app after changing currency
- Check that user profile was updated in database

---

## App Screens

### Authentication
- **Login Screen**: Email/password authentication
- **Register Screen**: New user registration with validation
- **Forgot Password**: Password reset via email

### Main App
- **Home Screen**: Dashboard with spending overview, monthly budget progress, quick actions, and recent expenses
- **Analytics Screen**: Monthly/yearly charts, category breakdown, spending trends
- **Budget Screen**: Set and track category budgets with progress bars
- **Profile Screen**: User settings, currency selection, theme toggle, notifications

### Additional Screens
- **Add Expense**: Manual expense entry with category selection
- **Scan Receipt**: OCR-powered receipt scanning
- **Edit Profile**: Update name and monthly budget
- **Change Password**: Secure password update
- **Select Currency**: Choose from 8 supported currencies

---

## Supported Currencies

- USD - US Dollar ($)
- EUR - Euro (€)
- GBP - British Pound (£)
- INR - Indian Rupee (₹)
- JPY - Japanese Yen (¥)
- CAD - Canadian Dollar (C$)
- AUD - Australian Dollar (A$)
- ETB - Ethiopian Birr (Br)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

---

## License

MIT License - feel free to use this project for learning or commercial purposes.

---

## Author

Built with ❤️ by the Expense Tracker Team


---

## Auto-Track Payment Notifications

The app can automatically detect and track expenses from payment notifications on your phone.

### How It Works

1. **Enable Auto-Tracking**
   - Go to Profile → Auto-Track Payments
   - Toggle "Enable Auto-Tracking"
   - Grant notification permissions when prompted

2. **Choose Your Mode**
   - **Manual Mode**: Get a confirmation popup before saving each expense
   - **Auto-Save Mode**: Automatically save all detected payments without confirmation

3. **Automatic Detection**
   - App monitors notifications from banking apps and payment services
   - Detects payment keywords (debited, paid, UPI, etc.)
   - Extracts transaction details:
     - Amount (supports multiple currencies)
     - Merchant/vendor name
     - Transaction date
     - Transaction type (debit/credit)

### Supported Notifications

The auto-tracking feature works with:
- Bank SMS notifications
- UPI payment apps (PhonePe, Paytm, Google Pay)
- Banking apps (SBI, HDFC, ICICI, Axis, etc.)
- Card transaction alerts
- Any payment notification containing amount and merchant info

### Detection Keywords

The app looks for these keywords in notifications:
- Payment terms: debited, credited, paid, payment, transaction
- Actions: spent, withdrawn, purchase, bought, charged
- Systems: UPI, ATM, POS, card, bank
- Currencies: Rs, INR, USD, EUR, ETB, Birr, $, ₹, Br

### Example Notifications

✅ **Detected:**
- "Rs 500 debited from your account at Starbucks"
- "UPI payment of $25.50 to Amazon successful"
- "Your card ending 1234 was charged Br 1,200 at SuperMart"
- "Transaction alert: INR 350 paid to Uber"

❌ **Not Detected:**
- "Your OTP is 123456"
- "Account balance: Rs 5000"
- "Welcome to our bank"

### Privacy & Permissions

- The app only reads notification content, not notification history
- No notification data is sent to external servers
- All processing happens locally on your device
- You can disable auto-tracking anytime from settings

### Limitations

- Only works when app is installed (doesn't need to be open)
- Requires notification permissions
- Detection accuracy depends on notification format
- Only debit transactions are auto-saved (credits are ignored)
- Works best with standardized bank notification formats

---
