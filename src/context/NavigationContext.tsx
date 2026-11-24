/**
 * Sikka - Navigation Context
 * Global navigation state management
 */

import { createContext, useContext } from 'react';
import { Account, Subscription, Transaction, TabType } from '../types';

// ==================== PUSHED SCREENS (v3) ====================
/** Screens opened on top of the tabs. Params stay small: ids, not records. */
export type Route =
    | { name: 'recap'; month?: number; year?: number }
    | { name: 'syncResult'; from: number; to: number; scanned: number; captured: number; unread: number; already: number }
    | { name: 'teach'; messageId?: string }
    | { name: 'captureSettings' }
    | { name: 'voiceSettings' }
    | { name: 'backup' }
    | { name: 'modelHealth' }
    | { name: 'modelPick' }
    | { name: 'rules' }
    | { name: 'rule'; id: string }
    | { name: 'nameSender'; txId: string }
    | { name: 'ruleSaved'; ruleId: string; txId?: string }
    | { name: 'fixTag'; txId: string }
    | { name: 'voiceNote'; txId: string }
    | { name: 'paymentStory'; txId: string }
    | { name: 'plan'; id: string }
    | { name: 'planEdit'; id?: string; kind?: string; foundMessageId?: string }
    | { name: 'planChange'; id: string }
    | { name: 'due' }
    | { name: 'issues' }
    | { name: 'planFound'; messageId: string }
    | { name: 'help'; topic?: string };

// ==================== NAVIGATION CONTEXT ====================
export interface NavigationContextType {
    /** Push a v3 screen on top of the current one. */
    openScreen: (route: Route) => void;
    /** Pop the top pushed screen. */
    closeScreen: () => void;
    /** Replace the top pushed screen (e.g. Name sender → Rule saved). */
    replaceScreen: (route: Route) => void;

    /** Switch the main tab (home, assets, stats, settings). */
    goToTab: (tab: TabType) => void;
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

    // Transaction Editing
    selectedTransaction: Transaction | null;
    selectTransaction: (transaction: Transaction) => void;
    closeTransactionDetail: () => void;

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
