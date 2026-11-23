/**
 * Sikka - Subscription form (shared by Add and Edit)
 * Design language: design-system/screens/Subscription-v2.html + Add-account-v2.html
 */

import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput } from './Typography';
import { Icon } from './Icon';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getCategoryColors, ACCOUNT_ICONS } from '../constants/theme';
import { SUBSCRIPTION_ICONS, SUBSCRIPTION_COLORS } from '../context/SubscriptionsContext';
import { useAccounts } from '../context/AccountsContext';
import { useCurrency } from '../context/CurrencyContext';
import { Subscription, SubscriptionRole, SplitMember, PaymentMode } from '../types';
import { Segmented, Toggle, IconButton } from './ui';

export interface SubscriptionDraft {
    name: string;
    icon: string;
    iconColor: string;
    category: string;
    billingCycle: 'monthly' | 'yearly';
    dueDate: string;
    role: SubscriptionRole;
    totalAmount: string;
    myShareInput: string;
    isSplit: boolean;
    splitMembers: SplitMember[];
    payTo: string;
    paymentSourceId: string;
    paymentMode: PaymentMode;
}

export function toDraft(sub?: Subscription | null): SubscriptionDraft {
    return {
        name: sub?.name ?? '',
        icon: sub?.icon ?? 'movie',
        iconColor: sub?.iconColor ?? SUBSCRIPTION_COLORS[0],
        category: sub?.category ?? 'Entertainment',
        billingCycle: sub?.billingCycle ?? 'monthly',
        dueDate: String(sub?.dueDate ?? 1),
        role: sub?.role ?? 'admin',
        totalAmount: sub?.totalAmount ? String(sub.totalAmount) : '',
        myShareInput: sub ? String(sub.myShare ?? sub.amount ?? '') : '',
        isSplit: sub?.isSplit ?? false,
        splitMembers: sub?.splitMembers ?? [],
        payTo: sub?.payTo ?? '',
        paymentSourceId: sub?.paymentSourceId ?? '',
        paymentMode: sub?.paymentMode ?? 'ask_every_time',
    };
}

export function myShareOf(d: SubscriptionDraft) {
    if (d.role === 'member') return parseFloat(d.myShareInput) || 0;
    const total = parseFloat(d.totalAmount) || 0;
    if (!d.isSplit) return total;
    return Math.max(0, total - d.splitMembers.reduce((s, m) => s + m.amount, 0));
}

export function isDraftValid(d: SubscriptionDraft) {
    if (!d.name.trim()) return false;
    return d.role === 'admin' ? (parseFloat(d.totalAmount) || 0) > 0 : myShareOf(d) > 0;
}

export function toPayload(d: SubscriptionDraft) {
    const share = myShareOf(d);
    const admin = d.role === 'admin';
    return {
        name: d.name.trim(),
        icon: d.icon,
        iconColor: d.iconColor,
        category: d.category,
        billingCycle: d.billingCycle,
        dueDate: Math.min(31, Math.max(1, parseInt(d.dueDate, 10) || 1)),
        role: d.role,
        totalAmount: admin ? parseFloat(d.totalAmount) || 0 : 0,
        myShare: share,
        isSplit: admin && d.isSplit,
        splitMembers: admin && d.isSplit ? d.splitMembers : [],
        payTo: admin ? undefined : d.payTo,
        paymentSourceId: d.paymentSourceId || undefined,
        paymentMode: d.paymentMode,
        amount: share, // legacy alias
    };
}

export function SubscriptionForm({ draft, onChange }: { draft: SubscriptionDraft; onChange: (d: SubscriptionDraft) => void }) {
    const { activeAccounts } = useAccounts();
    const { formatAmount } = useCurrency();
    const [memberName, setMemberName] = useState('');
    const [memberAmount, setMemberAmount] = useState('');
    const [showTip, setShowTip] = useState(false);
    const set = (patch: Partial<SubscriptionDraft>) => onChange({ ...draft, ...patch });
    const admin = draft.role === 'admin';

    const addMember = () => {
        const amount = parseFloat(memberAmount);
        if (!memberName.trim() || !amount || amount <= 0) return;
        set({ splitMembers: [...draft.splitMembers, { name: memberName.trim(), amount, status: 'pending' }] });
        setMemberName('');
        setMemberAmount('');
    };

    return (
        <View style={{ gap: 14 }}>
            {/* Name + icon */}
            <View style={styles.nameRow}>
                <View style={styles.iconTile}><Icon name={draft.icon as any} size={26} color={CATEGORY_PALETTE.fun.fg} /></View>
                <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={draft.name}
                    onChangeText={(name) => set({ name })}
                    placeholder="Netflix, Jio, Gym…"
                    accessibilityLabel="Name"
                />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
                {SUBSCRIPTION_ICONS.map((ic) => {
                    const on = draft.icon === ic;
                    return (
                        <TouchableOpacity
                            key={ic}
                            onPress={() => set({ icon: ic })}
                            style={[styles.iconOpt, on && styles.iconOptOn]}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: on }}
                            accessibilityLabel={ic.replace(/-/g, ' ')}
                        >
                            <Icon name={ic as any} size={20} color={on ? COLORS.brand : COLORS.text} />
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <Segmented
                label="Who pays the bill"
                value={draft.role}
                onChange={(role) => set({ role })}
                options={[
                    { value: 'admin', label: 'I pay the bill' },
                    { value: 'member', label: 'Someone else pays' },
                ]}
            />

            {/* Amount */}
            <View style={styles.amountCard}>
                <Text style={styles.amountOver}>{admin ? 'TOTAL BILL' : 'MY SHARE'}</Text>
                <View style={styles.amountRow}>
                    <Text style={styles.rupee}>₹</Text>
                    <TextInput
                        style={styles.amountInput}
                        value={admin ? draft.totalAmount : draft.myShareInput}
                        onChangeText={(v) => set(admin ? { totalAmount: v.replace(/[^0-9.]/g, '') } : { myShareInput: v.replace(/[^0-9.]/g, '') })}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        accessibilityLabel={admin ? 'Total bill amount' : 'My share'}
                    />
                </View>
            </View>

            {admin ? (
                <View style={styles.card}>
                    <View style={styles.rowBetween}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>Split the cost</Text>
                            <Text style={styles.cardMeta}>Track who owes you</Text>
                        </View>
                        <Toggle label="Split the cost" value={draft.isSplit} onValueChange={(isSplit) => set({ isSplit })} />
                    </View>
                    {draft.isSplit && (
                        <View style={{ gap: SPACING.sm, marginTop: SPACING.md }}>
                            {draft.splitMembers.map((m, i) => (
                                <View key={i} style={styles.member}>
                                    <View style={styles.memberAvatar}><Text style={styles.memberInitials}>{m.name.slice(0, 2).toUpperCase()}</Text></View>
                                    <Text style={styles.memberName}>{m.name}</Text>
                                    <Text style={styles.memberAmount}>{formatAmount(m.amount, true)}</Text>
                                    <IconButton
                                        icon="close"
                                        label={`Remove ${m.name}`}
                                        variant="ghost"
                                        size={36}
                                        iconSize={18}
                                        onPress={() => set({ splitMembers: draft.splitMembers.filter((_, j) => j !== i) })}
                                    />
                                </View>
                            ))}
                            <View style={styles.addMember}>
                                <TextInput style={[styles.input, styles.small, { flex: 1 }]} value={memberName} onChangeText={setMemberName} placeholder="Name" accessibilityLabel="Member name" />
                                <TextInput style={[styles.input, styles.small, { width: 96 }]} value={memberAmount} onChangeText={setMemberAmount} placeholder="₹" keyboardType="decimal-pad" accessibilityLabel="Member share" />
                                <IconButton icon="add" label="Add member" variant="lime" onPress={addMember} />
                            </View>
                            <Text style={styles.shareLine}>Your share: <Text style={styles.shareStrong}>{formatAmount(myShareOf(draft), true)}</Text></Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={{ gap: 6 }}>
                    <Text style={styles.label}>Pay to (optional)</Text>
                    <TextInput style={styles.input} value={draft.payTo} onChangeText={(payTo) => set({ payTo })} placeholder="Friend's name" accessibilityLabel="Pay to" />
                </View>
            )}

            {/* Billing */}
            <View style={styles.row2}>
                <View style={{ flex: 1.4, gap: 6 }}>
                    <Text style={styles.label}>Repeats</Text>
                    <Segmented
                        label="Repeats"
                        value={draft.billingCycle}
                        onChange={(billingCycle) => set({ billingCycle })}
                        options={[
                            { value: 'monthly', label: 'Monthly' },
                            { value: 'yearly', label: 'Yearly' },
                        ]}
                    />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.label}>Due day</Text>
                    <TextInput
                        style={styles.input}
                        value={draft.dueDate}
                        onChangeText={(v) => set({ dueDate: v.replace(/[^0-9]/g, '') })}
                        keyboardType="number-pad"
                        maxLength={2}
                        accessibilityLabel="Due day of month"
                    />
                </View>
            </View>

            {/* Paid from */}
            <Text style={styles.label}>Paid from</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
                {[{ id: '', name: 'Not set', type: '' } as any, ...activeAccounts.filter((a) => a.type !== 'investment' && a.type !== 'bitcoin')].map((a) => {
                    const on = draft.paymentSourceId === a.id;
                    const p = a.id ? getCategoryColors(a.type) : { bg: COLORS.surface, fg: COLORS.textSecondary };
                    return (
                        <TouchableOpacity
                            key={a.id || 'none'}
                            onPress={() => set({ paymentSourceId: a.id })}
                            style={[styles.accChip, { backgroundColor: p.bg }, on && styles.accChipOn]}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: on }}
                        >
                            {!!a.id && <Icon name={(ACCOUNT_ICONS[a.type] ?? 'account-balance') as any} size={16} color={p.fg} />}
                            <Text style={styles.accChipText}>{a.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {!!draft.paymentSourceId && (
                <View style={styles.card}>
                    <View style={styles.rowBetween}>
                        <TouchableOpacity style={styles.tipBtn} onPress={() => setShowTip(!showTip)} accessibilityRole="button" accessibilityState={{ expanded: showTip }}>
                            <Text style={styles.cardTitle}>Record it for me</Text>
                            <Icon name="info-outline" size={16} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <Toggle
                            label="Record it automatically on the due date"
                            value={draft.paymentMode === 'default'}
                            onValueChange={(v) => set({ paymentMode: v ? 'default' : 'ask_every_time' })}
                        />
                    </View>
                    {showTip && (
                        <Text style={styles.tip}>
                            On: Sikka records the payment from this account on the due date.{'\n'}Off: Sikka reminds you and you record it.
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    iconTile: { width: 58, height: 58, borderRadius: 20, backgroundColor: CATEGORY_PALETTE.fun.bg, alignItems: 'center', justifyContent: 'center' },
    iconOpt: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
    iconOptOn: { backgroundColor: COLORS.night },

    label: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, paddingLeft: 6 },
    input: { height: 54, borderRadius: 27, backgroundColor: COLORS.surface, paddingHorizontal: 20, fontSize: 16, fontWeight: '700', color: COLORS.text, ...SHADOWS.sm },
    small: { height: 48, borderRadius: 24, paddingHorizontal: 14, fontSize: 15 },
    row2: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },

    amountCard: { backgroundColor: CATEGORY_PALETTE.bills.bg, borderRadius: 28, padding: 18 },
    amountOver: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, color: CATEGORY_PALETTE.bills.fg },
    amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rupee: { fontSize: 32, fontWeight: '800', color: '#7A5600' },
    amountInput: { flex: 1, fontSize: 40, fontWeight: '800', color: COLORS.text, paddingVertical: 0 },

    card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.lg, ...SHADOWS.sm },
    cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    cardMeta: { fontSize: 13, color: COLORS.textSecondary },
    member: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: CATEGORY_PALETTE.groceries.bg, alignItems: 'center', justifyContent: 'center' },
    memberInitials: { fontSize: 12, fontWeight: '800', color: COLORS.text },
    memberName: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
    memberAmount: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    addMember: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    shareLine: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'right' },
    shareStrong: { fontWeight: '800', color: COLORS.text },

    accChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 22 },
    accChipOn: { borderWidth: 3, borderColor: COLORS.night },
    accChipText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    tipBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    tip: { marginTop: SPACING.sm, fontSize: 13, lineHeight: 19, color: COLORS.textSecondary },
});
