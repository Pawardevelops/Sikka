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
    showAddModal: boolean;
    openAddModal: () => void;
    closeAddModal: () => void;
    showAddTransactionModal: boolean;
    openAddTransactionModal: () => void;
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
    selectedSubscription: any | null; // Using any to avoid circular dependency if types not imported, but prefer generic or imported Type
    selectSubscription: (subscription: any) => void;
    closeSubscriptionDetail: () => void;
}

export const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function useNavigation() {
    const context = useContext(NavigationContext);
    if (!context) throw new Error('useNavigation must be used within NavigationProvider');
    return context;
}
