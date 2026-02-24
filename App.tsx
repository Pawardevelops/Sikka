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
import { SubscriptionsProvider, useSubscriptions } from './src/context/SubscriptionsContext';
import { SecurityProvider, useSecurity } from './src/context/SecurityContext';
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext';
import { NavigationContext, useNavigation } from './src/context/NavigationContext';
import { GoogleDriveService } from './src/services/GoogleDriveService';
import { AppLifecycleProvider } from './src/context/AppLifecycleContext';

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
import { DashboardScreen, AssetsScreen, StatsScreen, SettingsScreen, AccountDetailScreen, NotifyActionCenterScreen, PrivacyPolicyScreen, AboutUsScreen } from './src/screens';
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
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [initialTransactionProps, setInitialTransactionProps] = useState<{ type?: 'income' | 'expense' | 'transfer', accountId?: string } | null>(null);

  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showNotifyCenter, setShowNotifyCenter] = useState(false);
  const [showAddSubscriptionModal, setShowAddSubscriptionModal] = useState(false);

  // Subscription Editing
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  // Privacy Policy
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const { addAccount, deleteAccount, updateAccount } = useAccounts();
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

  const openAddModal = (account?: Account) => {
    setAccountToEdit(account || null);
    setShowAddModal(true);
  };
  const closeAddModal = () => {
    setShowAddModal(false);
    setAccountToEdit(null);
  };

  const openAddTransactionModal = (props?: { type?: 'income' | 'expense' | 'transfer', accountId?: string }) => {
    setInitialTransactionProps(props || null);
    setShowAddTransactionModal(true);
  };
  const closeAddTransactionModal = () => {
    setShowAddTransactionModal(false);
    setInitialTransactionProps(null);
  };

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
  const handleAddAccount = (
    accountData: { name: string; type: any; icon: string; balance: number; color: string },
    ccDetails?: { creditLimit: number; billingCycleDate: number; dueDate: number },
    holdings?: { ticker: string; quantity: number; avgBuyPrice: number; currentPrice: number }[],
  ) => {
    addAccount(accountData as any, ccDetails, holdings);
  };

  const handleUpdateAccount = (id: string, updates: Partial<Account>) => {
    updateAccount(id, updates);
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
    sentimentIds?: string[];
    type?: 'credit' | 'debit';
  }) => {
    addTransaction({
      ...transactionData,
      type: transactionData.type || 'debit',
    });
  };

  // About Us
  const [showAboutUs, setShowAboutUs] = useState(false);
  const openAboutUs = () => setShowAboutUs(true);
  const closeAboutUs = () => setShowAboutUs(false);

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

    if (showAboutUs) {
      return <AboutUsScreen />;
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

  const showTabBar = !selectedAccount && !showAllTransactions && !showNotifyCenter && !showPrivacyPolicy && !showAboutUs;

  return (
    <NavigationContext.Provider value={{
      selectedAccount,
      selectAccount,
      goBack,

      // Account Modal
      showAddModal,
      accountToEdit,
      openAddModal,
      closeAddModal,

      // Transaction Modal
      showAddTransactionModal,
      initialTransactionProps,
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
      // About Us
      showAboutUs,
      openAboutUs,
      closeAboutUs,
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
          accountToEdit={accountToEdit}
          onClose={closeAddModal}
          onAdd={handleAddAccount}
          onUpdate={handleUpdateAccount}
        />
        <AddTransactionModal
          visible={showAddTransactionModal}
          initialProps={initialTransactionProps}
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

import database from './src/database';
import { seedDatabase } from './src/database/seed';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isDbReady, setIsDbReady] = useState(false);
  const [appKey, setAppKey] = useState(0);



  const initDatabase = useCallback(async () => {
    try {
      await GoogleDriveService.configure();
      await seedDatabase(database);
    } catch (e) {
      console.error('Initialization failed:', e);
    } finally {
      setIsDbReady(true);
    }
  }, []);

  const resetApp = useCallback(() => {
    setIsDbReady(false);
    setAppKey(prev => prev + 1);
    initDatabase();
  }, [initDatabase]);

  useEffect(() => {
    initDatabase();
  }, [initDatabase]);

  if (showSplash || !isDbReady) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      <AppLifecycleProvider onReset={resetApp}>
        <View style={{ flex: 1 }} key={appKey}>
          <OnboardingProvider>
            <CurrencyProvider>
              <AccountsProvider>
                <TransactionsProvider>
                  <SubscriptionsProvider>
                    <SecurityProvider>
                      <SecureApp />
                    </SecurityProvider>
                  </SubscriptionsProvider>
                </TransactionsProvider>
              </AccountsProvider>
            </CurrencyProvider>
          </OnboardingProvider>
        </View>
      </AppLifecycleProvider>
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
