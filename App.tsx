/**
 * Sikka - Personal Finance Tracker
 * Clean architecture with separated concerns
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, BackHandler } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { riseIn } from './src/motion';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
  Urbanist_800ExtraBold,
} from '@expo-google-fonts/urbanist';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Context
import { CurrencyProvider } from './src/context/CurrencyContext';
import { AccountsProvider, useAccounts } from './src/context/AccountsContext';
import { TransactionsProvider, useTransactions } from './src/context/TransactionsContext';
import { SubscriptionsProvider, useSubscriptions } from './src/context/SubscriptionsContext';
import { SecurityProvider, useSecurity } from './src/context/SecurityContext';
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext';
import { NavigationContext, useNavigation, Route } from './src/context/NavigationContext';
import { PrefsProvider } from './src/context/PrefsContext';
import { ToastProvider } from './src/components/ui';
import { RouteScreen } from './src/screens/RouteScreen';
import { GoogleDriveService } from './src/services/GoogleDriveService';
import { AppLifecycleProvider } from './src/context/AppLifecycleContext';

// Types
import { TabType, Account, TransactionCategory, Subscription, Transaction as TransactionType } from './src/types';

// Theme
import { COLORS } from './src/constants/theme';

// Re-export for backward compatibility
export { useNavigation };

// Components
import { TabBar, SplashScreen, AddAccountModal } from './src/components';
import { AddTransactionModal } from './src/components/AddTransactionModal';
import { AddSubscriptionModal } from './src/components/AddSubscriptionModal';
import { EditSubscriptionModal } from './src/components/EditSubscriptionModal';
import { EditTransactionModal } from './src/components/EditTransactionModal';
import { BiometricLockScreen } from './src/components/BiometricLockScreen';
import { useSmsCapture } from './src/hooks/useSmsCapture';

// Screens
import { DashboardScreen, AssetsScreen, StatsScreen, SettingsScreen, AccountDetailScreen, NotifyActionCenterScreen, PrivacyPolicyScreen, AboutUsScreen } from './src/screens';
import { AllTransactionsScreen } from './src/screens/AllTransactionsScreen';
import {
  WelcomeScreen,
  ProfileSetupScreen,
  AccountSetupScreen,
  SecuritySetupScreen,
} from './src/screens/onboarding';
import { AutoCaptureScreen } from './src/screens/onboarding/AutoCaptureScreen';
import { ModelPickScreen } from './src/screens/onboarding/ModelPickScreen';
import { FirstLookScreen } from './src/screens/onboarding/FirstLookScreen';

// ==================== ONBOARDING FLOW ====================
function OnboardingFlow() {
  const { currentStep } = useOnboarding();

  switch (currentStep) {
    case 1:
      return <WelcomeScreen />;
    case 2:
      return <ProfileSetupScreen />;
    case 3:
      return <AutoCaptureScreen />;
    case 4:
      return <ModelPickScreen />;
    case 5:
      return <FirstLookScreen />;
    case 6:
      return <AccountSetupScreen />;
    case 7:
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

  // Transaction Editing
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionType | null>(null);

  // Pushed v3 screens (see NavigationContext Route)
  const [stack, setStack] = useState<Route[]>([]);
  const openScreen = useCallback((route: Route) => setStack((s) => [...s, route]), []);
  const closeScreen = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const replaceScreen = useCallback((route: Route) => setStack((s) => [...s.slice(0, -1), route]), []);
  const topRoute = stack[stack.length - 1];

  // Navigation Overlays
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);

  const { addAccount, deleteAccount, updateAccount } = useAccounts();
  const { addTransaction, editTransaction, deleteTransaction, transactions } = useTransactions();
  const pendingReviewCount = transactions.filter(t => t.status === 'pending' && !t.isDeleted).length;
  useSmsCapture();
  const { addSubscription } = useSubscriptions();

  // Screen transitions: remounting the container on a screen change replays `sk-rise`.
  const screenKey = [
    activeTab,
    stack.length,
    topRoute?.name ?? '',
    selectedAccount?.id ?? '',
    showAllTransactions,
    showNotifyCenter,
    showPrivacyPolicy,
    showAboutUs,
  ].join('|');

  // Handle Android Back Button
  useEffect(() => {
    const backAction = () => {
      if (stack.length > 0) {
        closeScreen();
        return true;
      }
      if (showPrivacyPolicy) {
        closePrivacyPolicy();
        return true;
      }
      if (showAboutUs) {
        closeAboutUs();
        return true;
      }
      if (showNotifyCenter) {
        closeNotifyCenter();
        return true;
      }
      if (showAllTransactions) {
        closeAllTransactions();
        return true;
      }
      if (selectedAccount) {
        goBack();
        return true;
      }
      return false; // Let default behavior happen (exit app)
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [stack.length, closeScreen, showPrivacyPolicy, showAboutUs, showNotifyCenter, showAllTransactions, selectedAccount]);

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

  const selectTransaction = (tx: TransactionType) => setSelectedTransaction(tx);
  const closeTransactionDetail = () => setSelectedTransaction(null);



  const openPrivacyPolicy = () => setShowPrivacyPolicy(true);
  const closePrivacyPolicy = () => setShowPrivacyPolicy(false);

  const openAboutUs = () => setShowAboutUs(true);
  const closeAboutUs = () => setShowAboutUs(false);

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



  const renderScreen = () => {
    if (topRoute) return <RouteScreen route={topRoute} />;

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

  const showTabBar = !topRoute && !selectedAccount && !showAllTransactions && !showNotifyCenter && !showPrivacyPolicy && !showAboutUs;

  return (
    <NavigationContext.Provider value={{
      openScreen,
      closeScreen,
      replaceScreen,
      goToTab: setActiveTab,
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
      // Transaction Editing
      selectedTransaction,
      selectTransaction,
      closeTransactionDetail,
    }}>
      <ToastProvider bottomOffset={showTabBar ? 110 : 24}>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Animated.View key={screenKey} entering={riseIn()} style={styles.screenContainer}>
          {renderScreen()}
        </Animated.View>
        {showTabBar && (
          <TabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            reviewCount={pendingReviewCount}
            onReview={openNotifyCenter}
            onAdd={() => openAddTransactionModal()}
          />
        )}

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
        <EditTransactionModal
          visible={!!selectedTransaction}
          transaction={selectedTransaction}
          onClose={closeTransactionDetail}
          onEdit={editTransaction}
          onDelete={deleteTransaction}
        />
      </View>
      </ToastProvider>
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
        <StatusBar style="dark" />
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

  // Sikka design-system typefaces (see src/constants/theme.ts FONT_FAMILY)
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
    Urbanist_800ExtraBold,
  });



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

  // Splash covers font loading too; on a font error we fall back to system fonts.
  const hideSplash = useCallback(() => setShowSplash(false), []);

  if (showSplash || !isDbReady || (!fontsLoaded && !fontError)) {
    return <SplashScreen onFinish={hideSplash} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <AppLifecycleProvider onReset={resetApp}>
        <View style={{ flex: 1 }} key={appKey}>
          <PrefsProvider>
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
          </PrefsProvider>
        </View>
      </AppLifecycleProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
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
