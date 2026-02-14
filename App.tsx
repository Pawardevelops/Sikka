/**
 * Sikka - Personal Finance Tracker
 * Clean architecture with separated concerns
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Context
import { CurrencyProvider } from './src/context/CurrencyContext';
import { AccountsProvider, useAccounts } from './src/context/AccountsContext';
import { TransactionsProvider, useTransactions } from './src/context/TransactionsContext';
import { SubscriptionsProvider, useSubscriptions, OnSubscriptionPaidDetails } from './src/context/SubscriptionsContext';
import { SecurityProvider, useSecurity } from './src/context/SecurityContext';
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext';
import { NavigationContext, useNavigation } from './src/context/NavigationContext';

// Types
import { TabType, Account, TransactionCategory, Subscription } from './src/types';

// Theme
import { COLORS } from './src/constants/theme';

// Re-export for backward compatibility
export { useNavigation };

// Components
import { TabBar, SplashScreen, AddAccountModal } from './src/components';
import { AddTransactionModal } from './src/components/AddTransactionModal';
import { AddSubscriptionModal } from './src/components/AddSubscriptionModal';
import { EditSubscriptionModal } from './src/components/EditSubscriptionModal';
import { BiometricLockScreen } from './src/components/BiometricLockScreen';

// Screens
import { DashboardScreen, AssetsScreen, StatsScreen, SettingsScreen, AccountDetailScreen, NotifyActionCenterScreen, PrivacyPolicyScreen } from './src/screens';
import { AllTransactionsScreen } from './src/screens/AllTransactionsScreen';
import {
  WelcomeScreen,
  ProfileSetupScreen,
  AccountSetupScreen,
  NotificationPermissionScreen,
  SecuritySetupScreen,
} from './src/screens/onboarding';

// ==================== ONBOARDING FLOW ====================
function OnboardingFlow() {
  const { currentStep } = useOnboarding();

  switch (currentStep) {
    case 1:
      return <WelcomeScreen />;
    case 2:
      return <ProfileSetupScreen />;
    case 3:
      return <AccountSetupScreen />;
    case 4:
      return <NotificationPermissionScreen />;
    case 5:
      return <SecuritySetupScreen />;
    default:
      return <WelcomeScreen />;
  }
}

// ==================== MAIN APP CONTENT ====================
function MainApp() {
  const [activeTab, setActiveTab] = useState<TabType>('dash');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showNotifyCenter, setShowNotifyCenter] = useState(false);
  const [showAddSubscriptionModal, setShowAddSubscriptionModal] = useState(false);

  // Subscription Editing
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  // Privacy Policy
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const { addAccount, deleteAccount } = useAccounts();
  const { addTransaction } = useTransactions();
  const { addSubscription } = useSubscriptions();

  // Animate screen transitions
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab, selectedAccount, showAllTransactions, showNotifyCenter]);

  // Navigation Handlers
  const selectAccount = (account: Account) => setSelectedAccount(account);
  const goBack = () => setSelectedAccount(null);

  const openAddModal = () => setShowAddModal(true);
  const closeAddModal = () => setShowAddModal(false);

  const openAddTransactionModal = () => setShowAddTransactionModal(true);
  const closeAddTransactionModal = () => setShowAddTransactionModal(false);

  const openAllTransactions = () => setShowAllTransactions(true);
  const closeAllTransactions = () => setShowAllTransactions(false);

  const openNotifyCenter = () => setShowNotifyCenter(true);
  const closeNotifyCenter = () => setShowNotifyCenter(false);

  const openAddSubscriptionModal = () => setShowAddSubscriptionModal(true);
  const closeAddSubscriptionModal = () => setShowAddSubscriptionModal(false);

  const selectSubscription = (sub: Subscription) => setSelectedSubscription(sub);
  const closeSubscriptionDetail = () => setSelectedSubscription(null);

  const openPrivacyPolicy = () => setShowPrivacyPolicy(true);
  const closePrivacyPolicy = () => setShowPrivacyPolicy(false);

  // Data Handlers
  const handleAddAccount = (accountData: { name: string; type: any; icon: string; balance: number; color: string }) => {
    addAccount(accountData);
  };

  const handleDeleteAccount = (accountId: string) => {
    deleteAccount(accountId);
    goBack();
  };

  const handleAddTransaction = (transactionData: {
    accountId: string;
    merchant: string;
    category: TransactionCategory;
    amount: number;
    notes?: string;
    isAuto: boolean;
    isImpulse?: boolean;
    type?: 'credit' | 'debit';
  }) => {
    addTransaction({
      ...transactionData,
      type: transactionData.type || 'debit',
    });
  };

  const renderScreen = () => {
    // If showing notify center
    if (showNotifyCenter) {
      return <NotifyActionCenterScreen />;
    }

    // If showing all transactions
    if (showAllTransactions) {
      return <AllTransactionsScreen onBack={closeAllTransactions} />;
    }

    if (showPrivacyPolicy) {
      return <PrivacyPolicyScreen />;
    }

    // If an account is selected, show account detail
    if (selectedAccount) {
      return (
        <AccountDetailScreen
          account={selectedAccount}
          onBack={goBack}
          onDelete={handleDeleteAccount}
        />
      );
    }

    switch (activeTab) {
      case 'dash':
        return <DashboardScreen />;
      case 'assets':
        return <AssetsScreen />;
      case 'stats':
        return <StatsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  const showTabBar = !selectedAccount && !showAllTransactions && !showNotifyCenter && !showPrivacyPolicy;

  return (
    <NavigationContext.Provider value={{
      selectedAccount,
      selectAccount,
      goBack,
      showAddModal,
      openAddModal,
      closeAddModal,
      showAddTransactionModal,
      openAddTransactionModal,
      closeAddTransactionModal,
      showAllTransactions,
      openAllTransactions,
      closeAllTransactions,
      showNotifyCenter,
      openNotifyCenter,
      closeNotifyCenter,
      showAddSubscriptionModal,
      openAddSubscriptionModal,
      closeAddSubscriptionModal,
      selectedSubscription,
      selectSubscription,
      closeSubscriptionDetail,
      // Privacy Policy
      showPrivacyPolicy,
      openPrivacyPolicy,
      closePrivacyPolicy,
    }}>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Animated.View style={[
          styles.screenContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}>
          {renderScreen()}
        </Animated.View>
        {showTabBar && <TabBar activeTab={activeTab} onTabChange={setActiveTab} />}

        {/* Modals */}
        <AddAccountModal
          visible={showAddModal}
          onClose={closeAddModal}
          onAdd={handleAddAccount}
        />
        <AddTransactionModal
          visible={showAddTransactionModal}
          onClose={closeAddTransactionModal}
          onAdd={handleAddTransaction}
        />
        <AddSubscriptionModal
          visible={showAddSubscriptionModal}
          onClose={closeAddSubscriptionModal}
          onAdd={addSubscription}
        />
        <EditSubscriptionModal
          visible={!!selectedSubscription}
          subscription={selectedSubscription}
          onClose={closeSubscriptionDetail}
        />
      </View>
    </NavigationContext.Provider>
  );
}

// ==================== APP WITH SECURITY ====================
function SecureApp() {
  const { biometricEnabled, isAuthenticated, isLoading: securityLoading } = useSecurity();
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboarding();

  // Show loading while checking security/onboarding settings
  if (securityLoading || onboardingLoading) {
    return null; // SplashScreen is still showing
  }

  // Show onboarding if not complete
  if (!isOnboardingComplete) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <OnboardingFlow />
      </View>
    );
  }

  // Show lock screen if biometric is enabled but not authenticated
  if (biometricEnabled && !isAuthenticated) {
    return <BiometricLockScreen />;
  }

  // Show main app
  return <MainApp />;
}


// ==================== TRANSACTIONS WITH BALANCE SYNC ====================
function TransactionsWithBalanceSync({ children }: { children: React.ReactNode }) {
  const { getAccount, updateAccount } = useAccounts();

  const handleUpdateAccountBalance = useCallback(
    (accountId: string, delta: number) => {
      const account = getAccount(accountId);
      if (account) {
        updateAccount(accountId, { balance: account.balance + delta });
      }
    },
    [getAccount, updateAccount]
  );

  return (
    <TransactionsProvider onUpdateAccountBalance={handleUpdateAccountBalance}>
      {children}
    </TransactionsProvider>
  );
}

// ==================== SUBSCRIPTIONS WITH TRANSACTION SYNC ====================
function SubscriptionsWithTransactionSync({ children }: { children: React.ReactNode }) {
  const { addTransaction } = useTransactions();

  // Safely map string category to TransactionCategory
  const mapCategory = (cat: string): TransactionCategory => {
    const valid: TransactionCategory[] = [
      'groceries', 'dining', 'transport', 'shopping', 'entertainment',
      'utilities', 'health', 'income', 'transfer', 'other'
    ];
    const normalized = cat.toLowerCase();
    return valid.includes(normalized as any)
      ? (normalized as TransactionCategory)
      : 'utilities'; // Default for subscriptions
  };

  const handleSubscriptionPaid = useCallback((details: OnSubscriptionPaidDetails) => {
    addTransaction({
      accountId: details.paymentSourceId || 'unknown',
      merchant: details.name,
      amount: -details.amount,
      timestamp: Date.now(),
      category: mapCategory(details.category),
      type: 'debit',
      notes: 'Subscription Payment',
      isAuto: true,
      status: 'approved',
    });
  }, [addTransaction]);

  return (
    <SubscriptionsProvider onSubscriptionPaid={handleSubscriptionPaid}>
      {children}
    </SubscriptionsProvider>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      <OnboardingProvider>
        <CurrencyProvider>
          <AccountsProvider>
            <TransactionsWithBalanceSync>
              <SubscriptionsWithTransactionSync>
                <SecurityProvider>
                  <SecureApp />
                </SecurityProvider>
              </SubscriptionsWithTransactionSync>
            </TransactionsWithBalanceSync>
          </AccountsProvider>
        </CurrencyProvider>
      </OnboardingProvider>
    </SafeAreaProvider>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenContainer: {
    flex: 1,
  },
});
