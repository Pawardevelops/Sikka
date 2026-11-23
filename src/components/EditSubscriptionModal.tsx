/**
 * Sikka - Subscription detail + edit
 * Design: design-system/screens/Subscription-v2.html
 *
 * Detail: peach hero with the bill cycle (Bill due → You pay → Collect → Settled),
 * your share / to collect, members (tap to mark paid), pause / delete / restore.
 * Edit: the shared SubscriptionForm.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Typography';
import { Icon } from './Icon';
import { CustomModal } from './CustomModal';
import { COLORS, SPACING, SHADOWS, SIKKA, CATEGORY_PALETTE, CHART_COLORS } from '../constants/theme';
import { useSubscriptions } from '../context/SubscriptionsContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAccounts } from '../context/AccountsContext';
import { Subscription } from '../types';
import { Button, IconButton } from './ui';
import { SubscriptionForm, toDraft, toPayload, isDraftValid, SubscriptionDraft } from './SubscriptionForm';

interface EditSubscriptionModalProps {
    visible: boolean;
    subscription: Subscription | null;
    onClose: () => void;
}

type Confirm = null | 'pause' | 'delete';

export function EditSubscriptionModal({ visible, subscription, onClose }: EditSubscriptionModalProps) {
    const insets = useSafeAreaInsets();
    const { updateSubscription, pauseSubscription, reactivateSubscription, archiveSubscription, markAsPaid, markAsUnpaid } = useSubscriptions();
    const { formatAmount } = useCurrency();
    const { getAccount } = useAccounts();
    const [mode, setMode] = useState<'detail' | 'edit'>('detail');
    const [draft, setDraft] = useState<SubscriptionDraft>(toDraft(subscription));
    const [confirm, setConfirm] = useState<Confirm>(null);
    const [members, setMembers] = useState(subscription?.splitMembers ?? []);

    useEffect(() => {
        if (visible && subscription) {
            setMode('detail');
            setDraft(toDraft(subscription));
            setMembers(subscription.splitMembers ?? []);
        }
    }, [visible, subscription]);

    if (!subscription) return null;

    const s = subscription;
    const isActive = s.status === 'active';
    const isPaused = s.status === 'paused';
    const isArchived = s.status === 'archived';
    const admin = s.role === 'admin';
    const split = admin && s.isSplit && members.length > 0;
    const pendingMembers = members.filter((m) => m.status !== 'paid');
    const toCollect = pendingMembers.reduce((sum, m) => sum + m.amount, 0);
    const billAmount = admin ? s.totalAmount || s.myShare : s.myShare;
    const source = s.paymentSourceId ? getAccount(s.paymentSourceId) : undefined;

    // Cycle stepper
    const steps = split
        ? [
            { label: 'Bill due', done: true },
            { label: 'You pay', done: s.isPaid, now: !s.isPaid },
            { label: 'Collect', done: s.isPaid && pendingMembers.length === 0, now: s.isPaid && pendingMembers.length > 0 },
            { label: 'Settled', done: s.isPaid && pendingMembers.length === 0 },
        ]
        : [
            { label: 'Bill due', done: true },
            { label: admin ? 'You pay' : `Pay ${s.payTo || 'them'}`, done: s.isPaid, now: !s.isPaid },
            { label: 'Settled', done: s.isPaid },
        ];

    const toggleMember = async (i: number) => {
        const next = members.map((m, j) => (j === i ? { ...m, status: m.status === 'paid' ? 'pending' : 'paid' } as const : m));
        setMembers(next);
        await updateSubscription(s.id, { splitMembers: next });
    };

    const saveEdit = async () => {
        if (!isDraftValid(draft)) return;
        await updateSubscription(s.id, toPayload(draft));
        onClose();
    };

    const run = async (fn: () => Promise<void>) => {
        await fn();
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={mode === 'edit' ? () => setMode('detail') : onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[styles.container, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + SPACING.lg }]}
            >
                {mode === 'edit' ? (
                    <>
                        <View style={styles.header}>
                            <IconButton icon="close" label="Cancel editing" onPress={() => setMode('detail')} />
                            <Text style={styles.editTitle} accessibilityRole="header">Edit subscription</Text>
                        </View>
                        <ScrollView contentContainerStyle={{ paddingBottom: SPACING.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <SubscriptionForm draft={draft} onChange={setDraft} />
                        </ScrollView>
                        <Button label="Save changes" icon="check" onPress={saveEdit} disabled={!isDraftValid(draft)} />
                    </>
                ) : (
                    <>
                        <View style={styles.header}>
                            <IconButton icon="chevron-left" label="Back" onPress={onClose} iconSize={26} />
                            <View style={{ flex: 1 }} />
                            {!isArchived && (
                                <TouchableOpacity style={styles.editBtn} onPress={() => setMode('edit')} accessibilityRole="button">
                                    <Text style={styles.editText}>Edit</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                            {(isPaused || isArchived) && (
                                <View style={styles.banner}>
                                    <Icon name={isPaused ? 'pause-circle-outline' : 'delete-outline'} size={20} color={COLORS.text} />
                                    <Text style={styles.bannerText}>{isPaused ? 'Paused. No reminders until you resume.' : 'Deleted. Restore it to track it again.'}</Text>
                                </View>
                            )}

                            <View style={styles.hero}>
                                <View style={styles.heroBlob} pointerEvents="none" />
                                <View style={styles.heroTop}>
                                    <View style={styles.initial}><Icon name={s.icon as any} size={28} color={SIKKA.signal} /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.heroName} accessibilityRole="header" numberOfLines={2}>{s.name}</Text>
                                        <Text style={styles.heroMeta}>
                                            {formatAmount(billAmount, true)} / {s.billingCycle === 'yearly' ? 'year' : 'month'} · {admin ? "you're admin" : 'you chip in'}
                                        </Text>
                                    </View>
                                </View>
                                {isActive && (
                                    <View style={styles.stepper} accessibilityLabel={`Cycle: ${steps.map((x) => `${x.label} ${x.done ? 'done' : x.now ? 'now' : 'next'}`).join(', ')}`}>
                                        {steps.map((st, i) => (
                                            <React.Fragment key={st.label}>
                                                {i > 0 && <View style={[styles.link, { backgroundColor: steps[i - 1].done ? (st.now ? SIKKA.signal : COLORS.night) : SIKKA.line }]} />}
                                                <View style={styles.step}>
                                                    <View style={[styles.dot, st.done ? styles.dotDone : st.now ? styles.dotNow : styles.dotTodo]}>
                                                        {st.done && <Icon name="check" size={16} color={COLORS.brand} />}
                                                    </View>
                                                    <Text style={[styles.stepLabel, st.now && { color: CATEGORY_PALETTE.dining.fg }, !st.done && !st.now && { color: COLORS.textSecondary }]} numberOfLines={1}>
                                                        {st.label}
                                                    </Text>
                                                </View>
                                            </React.Fragment>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.tiles}>
                                <View style={[styles.tile, { backgroundColor: COLORS.brand }]}>
                                    <Text style={[styles.tileOver, { color: CATEGORY_PALETTE.groceries.fg }]}>YOUR SHARE</Text>
                                    <Text style={styles.tileValue}>{formatAmount(s.myShare ?? s.amount ?? 0, true)}</Text>
                                </View>
                                {split ? (
                                    <View style={[styles.tile, { backgroundColor: CATEGORY_PALETTE.bills.bg }]}>
                                        <Text style={[styles.tileOver, { color: CATEGORY_PALETTE.bills.fg }]}>TO COLLECT</Text>
                                        <Text style={styles.tileValue}>{formatAmount(toCollect, true)}</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.tile, { backgroundColor: CATEGORY_PALETTE.transport.bg }]}>
                                        <Text style={[styles.tileOver, { color: CATEGORY_PALETTE.transport.fg }]}>DUE DAY</Text>
                                        <Text style={styles.tileValue}>{s.dueDate}</Text>
                                    </View>
                                )}
                            </View>

                            {source && (
                                <View style={styles.sourceRow}>
                                    <Icon name="account-balance" size={18} color={COLORS.textSecondary} />
                                    <Text style={styles.sourceText}>
                                        Paid from {source.name} · {s.paymentMode === 'default' ? 'recorded automatically' : 'Sikka will remind you'}
                                    </Text>
                                </View>
                            )}

                            {split && (
                                <>
                                    <View style={styles.sectionHead}>
                                        <Text style={styles.sectionTitle}>Members</Text>
                                        <Text style={styles.sectionMeta}>{members.length - pendingMembers.length} of {members.length} paid</Text>
                                    </View>
                                    {members.map((m, i) => {
                                        const paid = m.status === 'paid';
                                        return (
                                            <View key={`${m.name}-${i}`} style={styles.member}>
                                                <View style={[styles.avatar, { backgroundColor: CHART_COLORS[(i + 1) % CHART_COLORS.length] }]}>
                                                    <Text style={styles.avatarText}>{m.name.slice(0, 2).toUpperCase()}</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.memberName}>{m.name}</Text>
                                                    <Text style={[styles.memberMeta, { color: paid ? COLORS.primary : CATEGORY_PALETTE.dining.fg }]}>
                                                        {paid ? 'Paid' : `Owes ${formatAmount(m.amount, true)}`}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => toggleMember(i)}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={paid ? `Mark ${m.name} as not paid` : `Mark ${m.name} as paid`}
                                                    style={paid ? styles.paidDot : styles.markBtn}
                                                >
                                                    {paid ? <Icon name="check" size={18} color={COLORS.onBrand} /> : <Text style={styles.markText}>Got it</Text>}
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </>
                            )}

                            <View style={styles.quiet}>
                                {isActive && (
                                    <TouchableOpacity style={styles.quietBtn} onPress={() => setConfirm('pause')} accessibilityRole="button">
                                        <Icon name="pause" size={18} color={COLORS.text} />
                                        <Text style={styles.quietText}>Pause</Text>
                                    </TouchableOpacity>
                                )}
                                {!isArchived && (
                                    <TouchableOpacity style={styles.quietBtn} onPress={() => setConfirm('delete')} accessibilityRole="button">
                                        <Icon name="delete-outline" size={18} color={COLORS.error} />
                                        <Text style={[styles.quietText, { color: COLORS.error }]}>Delete</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>

                        {isActive ? (
                            s.isPaid ? (
                                <Button label="Mark as not paid" variant="outline" icon={null} onPress={() => run(() => markAsUnpaid(s.id))} />
                            ) : (
                                <Button label={`Mark ${formatAmount(s.myShare ?? s.amount ?? 0, true)} paid`} icon="check" onPress={() => run(() => markAsPaid(s.id))} />
                            )
                        ) : (
                            <Button label={isPaused ? 'Resume subscription' : 'Restore subscription'} icon={isPaused ? 'play-arrow' : 'restore'} onPress={() => run(() => reactivateSubscription(s.id))} />
                        )}
                    </>
                )}

                <CustomModal
                    visible={confirm === 'pause'}
                    title="Pause this subscription?"
                    message="Sikka stops reminding you but keeps its history."
                    type="info"
                    icon="pause"
                    onClose={() => setConfirm(null)}
                    actions={[
                        { text: 'Keep it on', onPress: () => setConfirm(null), style: 'cancel' },
                        { text: 'Pause', onPress: () => { setConfirm(null); run(() => pauseSubscription(s.id)); }, style: 'primary' },
                    ]}
                />
                <CustomModal
                    visible={confirm === 'delete'}
                    title="Delete this subscription?"
                    message="It moves to the deleted list. You can restore it later."
                    type="error"
                    icon="delete"
                    onClose={() => setConfirm(null)}
                    actions={[
                        { text: 'Keep it', onPress: () => setConfirm(null), style: 'cancel' },
                        { text: 'Delete', onPress: () => { setConfirm(null); run(() => archiveSubscription(s.id)); }, style: 'destructive' },
                    ]}
                />
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 48 },
    editTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
    editBtn: { height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', ...SHADOWS.sm },
    editText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    scroll: { gap: SPACING.md, paddingBottom: SPACING.lg },

    banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surfaceSunk, borderRadius: 20, padding: 14 },
    bannerText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },

    hero: { backgroundColor: CATEGORY_PALETTE.dining.bg, borderRadius: 32, padding: 18, gap: 14, overflow: 'hidden' },
    heroBlob: { position: 'absolute', right: -30, top: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.35)' },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    initial: { width: 58, height: 58, borderRadius: 20, backgroundColor: COLORS.night, alignItems: 'center', justifyContent: 'center' },
    heroName: { fontSize: 26, fontWeight: '800', color: COLORS.text },
    heroMeta: { fontSize: 13, fontWeight: '700', color: CATEGORY_PALETTE.dining.fg },
    stepper: { backgroundColor: COLORS.surface, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'flex-start' },
    step: { flex: 1, alignItems: 'center', gap: 4 },
    dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dotDone: { backgroundColor: COLORS.night },
    dotNow: { backgroundColor: SIKKA.signal, borderWidth: 5, borderColor: '#FFE3D4', width: 40, height: 40, borderRadius: 20, marginTop: -4, marginBottom: -4 },
    dotTodo: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#BDB5A6' },
    stepLabel: { fontSize: 11, fontWeight: '800', color: COLORS.text },
    link: { width: 14, height: 3, borderRadius: 2, marginTop: 15 },

    tiles: { flexDirection: 'row', gap: 10 },
    tile: { flex: 1, borderRadius: 24, padding: 14 },
    tileOver: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
    tileValue: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 2 },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: 4 },
    sourceText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },

    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, marginTop: SPACING.xs },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    sectionMeta: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary },
    member: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 12, ...SHADOWS.sm },
    avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 13, fontWeight: '800', color: COLORS.onBrand },
    memberName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    memberMeta: { fontSize: 12, fontWeight: '700' },
    markBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: CATEGORY_PALETTE.dining.bg, justifyContent: 'center' },
    markText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
    paidDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },

    quiet: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, marginTop: SPACING.sm },
    quietBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 8 },
    quietText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
});
