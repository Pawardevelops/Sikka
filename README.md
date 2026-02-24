# 🪙 Sikka — Personal Finance Tracker

**Sikka** (Hindi for "coin") is an open-source, privacy-first personal finance app built with React Native and Expo. It runs entirely on-device using WatermelonDB — your financial data never leaves your phone.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🏦 **Multi-Account** | Bank, Cash, Wallet, Savings, Credit Card, Investment, Crypto |
| 💳 **Credit Card Management** | Utilization tracking, bill payments, due date reminders |
| 📊 **Investment Tracking** | Holdings with P&L, portfolio value, per-holding returns |
| 🔁 **Subscriptions** | Split billing, admin/member roles, payment lifecycle |
| 📱 **Auto-Detect Transactions** | Parse bank SMS/notifications automatically |
| 🔒 **Biometric Lock** | Fingerprint/face auth with Expo Local Authentication |
| ☁️ **Google Drive Backup** | Encrypted backup & restore via Google Sign-In |
| 🎨 **Dark Theme** | Premium dark UI with glassmorphism and micro-animations |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) ~54 + React Native 0.81 |
| Database | [WatermelonDB](https://nozbe.github.io/WatermelonDB/) (SQLite under the hood) |
| Language | TypeScript 5.9 |
| Auth | Google Sign-In + Expo Secure Store |
| Security | Biometric (Expo Local Authentication) + AES encryption |
| State | React Context API (9 providers) |
| Navigation | State-based (no React Navigation router — pure state) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** or **yarn**
- **Android Studio** with SDK 34+ (for Android dev)
- **JDK 17** (for Android builds)

### 1. Clone & Install

```bash
git clone https://github.com/Pawardevelops/Sikka.git
cd Sikka
npm install
```

### 2. Run in Development

```bash
# Start Metro bundler
npm start

# In another terminal, run on Android
npm run android
```

> **Note:** This project uses a [custom dev client](https://docs.expo.dev/develop/development-builds/introduction/) (not Expo Go) because of native modules like WatermelonDB and the notification listener. You must build the dev client first:
>
> ```bash
> npx expo run:android
> ```

### 3. Build APK (Release)

```bash
# Debug APK
npm run android:dev

# Release APK (signed)
npm run android:apk

# Release AAB (for Play Store)
npm run android:aab

# Clean build artifacts
npm run android:clean
```

> See [docs/building.md](docs/building.md) for keystore setup and release signing.

---

## 📁 Project Structure

```
Sikka/
├── App.tsx                  # Root component, provider nesting, navigation
├── index.ts                 # Entry point
├── app.json                 # Expo configuration
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AddAccountModal.tsx
│   │   ├── AddTransactionModal.tsx
│   │   ├── PayBillModal.tsx
│   │   ├── FloatingActionButton.tsx
│   │   ├── NetWorthCard.tsx
│   │   ├── TabBar.tsx
│   │   └── ...
│   ├── constants/
│   │   └── theme.ts         # Colors, spacing, typography, shadows
│   ├── context/             # State management (9 React Context providers)
│   │   ├── AccountsContext.tsx
│   │   ├── TransactionsContext.tsx
│   │   ├── SubscriptionsContext.tsx
│   │   ├── CurrencyContext.tsx
│   │   ├── SecurityContext.tsx
│   │   ├── OnboardingContext.tsx
│   │   ├── SettingsContext.tsx
│   │   └── NavigationContext.tsx
│   ├── database/            # WatermelonDB setup
│   │   ├── index.ts         # Database instance + adapter
│   │   ├── schema.ts        # All 15 table definitions
│   │   ├── seed.ts          # Initial categories + sentiments
│   │   └── models/          # 15 WatermelonDB Model classes
│   ├── screens/             # Full-page screens
│   │   ├── DashboardScreen.tsx
│   │   ├── AccountDetailScreen.tsx
│   │   ├── AssetsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── ...
│   ├── services/            # Background services
│   │   ├── NotificationService.ts
│   │   ├── BackupService.ts
│   │   ├── GoogleDriveService.ts
│   │   └── BackgroundBackup.ts
│   ├── types/               # TypeScript type definitions
│   │   ├── index.ts         # Core interfaces
│   │   └── accountTypes.ts  # Account strategies + computations
│   └── hooks/               # Custom React hooks
├── android/                 # Native Android project
├── plugins/                 # Expo config plugins
└── docs/                    # Architecture documentation
```

---

## 📖 Architecture Documentation

Detailed architecture docs live in the [`docs/`](docs/) folder:

| Document | Covers |
|---|---|
| [Accounts Architecture](docs/accounts-architecture.md) | Account types, satellite tables, net worth strategy, credit card flow |
| [Transactions Architecture](docs/transactions-architecture.md) | CRUD, balance updates, transfers, CC settlement, SMS parsing |
| [Database Schema](docs/database-schema.md) | All 15 WatermelonDB tables, relationships, schema design |
| [Subscriptions Architecture](docs/subscriptions-architecture.md) | Lifecycle, billing, split members, payment sync |
| [State & Navigation](docs/state-and-navigation.md) | Context providers, provider nesting, screen routing |

---

## 🤝 Contributing

1. **Fork** the repository
2. Create a **feature branch**: `git checkout -b feat/my-feature`
3. **Commit** with descriptive messages: `git commit -m "feat: add budget alerts"`
4. **Push** and open a **Pull Request**

### Code Conventions

- **TypeScript** — all files are `.ts` / `.tsx` 
- **Functional components** — no class components
- **React Context** for state — no Redux/MobX
- **SOLID principles** — strategy pattern for account types, interface segregation

---

## 📄 License

This project is open-source. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ by Team SIKKA</a>
</p>
