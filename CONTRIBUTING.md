# Contributing to Sikka

First off, **thank you** for considering contributing to Sikka! 🪙

Whether you're fixing a bug, proposing a feature, or improving documentation — every contribution helps make personal finance tracking better for everyone.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Code Style & Conventions](#code-style--conventions)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to **pawardevelops@gmail.com**.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/pawardevelops/Sikka.git
   cd Sikka
   ```
3. **Create a branch** for your work:
   ```bash
   git checkout -b feat/my-feature
   ```

---

## Development Setup

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | >= 18 |
| JDK | 17 |
| Android Studio | SDK 34+ |
| npm | Latest |

### Install & Run

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Build and run the dev client (required — not Expo Go)
npm run android:dev
```

> **Note:** Sikka uses native libraries (WatermelonDB, notification listener) that require a custom dev build. This means **development requires Android Studio** to be installed along with SDK 34+. You cannot use Expo Go.

---

## How to Contribute

### 1. Check Existing Issues

Before starting work, check if an [issue](https://github.com/Pawardevelops/Sikka/issues) already exists for your idea or bug. If not, open one to discuss before writing code.

### 2. Work on Your Branch

- Keep changes focused — one feature or fix per PR
- Write clear, descriptive commit messages using **Conventional Commits**:

  | Prefix | Use |
  |---|---|
  | `feat:` | New feature |
  | `fix:` | Bug fix |
  | `docs:` | Documentation only |
  | `refactor:` | Code change that neither fixes a bug nor adds a feature |
  | `chore:` | Build, tooling, or dependency updates |
  | `test:` | Adding or fixing tests |

  **Example:** `feat: add monthly budget alerts`

### 3. Test Your Changes

- Ensure the app builds and runs without errors
- Test on a real Android device or emulator
- Verify that existing features still work correctly

---

## Pull Request Process

1. **Update your branch** with the latest `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. **Push** your branch and open a Pull Request against `main`
3. **Fill out** the PR template completely
4. **Wait for review** — maintainers will review and may request changes
5. Once approved, a maintainer will **merge** your PR

### PR Checklist

- [ ] My code follows the project's code style
- [ ] I have tested my changes on a device/emulator
- [ ] I have updated documentation if needed
- [ ] My commit messages follow Conventional Commits
- [ ] I have linked the related issue in the PR description

---

## Code Style & Conventions

| Convention | Guideline |
|---|---|
| **Language** | TypeScript (`.ts` / `.tsx`) — no plain JavaScript |
| **Components** | Functional components only — no class components |
| **State** | React Context API — no Redux or MobX |
| **Architecture** | SOLID principles, strategy pattern for account types |
| **Naming** | PascalCase for components, camelCase for functions/variables |
| **Files** | One component per file, filename matches component name |

---

## Reporting Bugs

Use the [Bug Report](https://github.com/Pawardevelops/Sikka/issues/new?template=bug_report.yml) issue template. Please include:

- Steps to reproduce the issue
- Expected vs. actual behavior
- Device model and Android version
- Screenshots or screen recordings if applicable

---

## Suggesting Features

Use the [Feature Request](https://github.com/Pawardevelops/Sikka/issues/new?template=feature_request.yml) issue template. Please include:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

---

## 💙 Thank You!

Every contribution, no matter how small, makes Sikka better. We appreciate your time and effort!
