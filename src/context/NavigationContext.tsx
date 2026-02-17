/**
 * Sikka - Navigation Context
 * Global navigation state management
 */

import { createContext, useContext } from 'react';
import { Account, Subscription } from '../types';

// ==================== NAVIGATION CONTEXT ====================
export interface NavigationContextType {
    selectedAccount: Account | null;
    selectAccount: (account: Account) => void;
    goBack: () => void;
    // Modals with Props
    showAddModal: boolean;
    accountToEdit: Account | null;
    openAddModal: (account?: Account) => void;
    closeAddModal: () => void;

    showAddTransactionModal: boolean;
    initialTransactionProps: { type?: 'income' | 'expense' | 'transfer', accountId?: string } | null;
    openAddTransactionModal: (props?: { type?: 'income' | 'expense' | 'transfer', accountId?: string }) => void;
    closeAddTransactionModal: () => void;

    showAllTransactions: boolean;
    openAllTransactions: () => void;
    closeAllTransactions: () => void;
    showNotifyCenter: boolean;
    openNotifyCenter: () => void;
    closeNotifyCenter: () => void;
    showAddSubscriptionModal: boolean;
    openAddSubscriptionModal: () => void;
    closeAddSubscriptionModal: () => void;

    // Subscription Editing
    selectedSubscription: Subscription | null;
    selectSubscription: (subscription: Subscription) => void;
    closeSubscriptionDetail: () => void;

    // Privacy Policy
    showPrivacyPolicy: boolean;
    openPrivacyPolicy: () => void;
    closePrivacyPolicy: () => void;

    // About Us
    showAboutUs: boolean;
    openAboutUs: () => void;
    closeAboutUs: () => void;
}

export const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function useNavigation() {
    const context = useContext(NavigationContext);
    if (!context) throw new Error('useNavigation must be used within NavigationProvider');
    return context;
}
