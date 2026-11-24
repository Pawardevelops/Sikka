/**
 * Sikka - Review
 * Designs: design-system/screens/Inbox-v2.html (deck),
 *          Review-v2.html (who was this?), Inbox-clear-v2.html (all clear)
 *
 * Captured payments wait here as a swipe deck: swipe right / ✓ to approve,
 * left / ✕ for "not mine", ✎ to name it, pick a category and a feeling.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView, PermissionsAndroid, ActivityIndicator } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { EASE, Float, Lottie, POP_SPRING, Wiggle, fadeIn, popIn } from '../motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/Typography';
import { useNavigation } from '../context/NavigationContext';
import { Icon } from '../components/Icon';
import { useTransactions, CATEGORY_ICONS } from '../context/TransactionsContext';
import { useAccounts } from '../context/AccountsContext';
import { useCurrency } from '../context/CurrencyContext';
import { Transaction, TransactionCategory } from '../types';
import { COLORS, SPACING, SHADOWS, SIKKA, CATEGORY_PALETTE, getCategoryColors, getPaletteKey, MOTION } from '../constants/theme';
import { Button, IconButton, CategoryTile, Sikku, MoodPicker } from '../components/ui';
import { CATEGORY_LABELS, formatTime } from '../components/TransactionRow';
import { SPEND_CATEGORIES } from '../components/AddTransactionModal';
import { useInboxScan } from '../hooks/useInboxScan';
import { ScanRangeSheet } from '../components/ScanRangeSheet';


const SWIPE_OUT = 120;

export default function NotifyActionCenterScreen() {
    const insets = useSafeAreaInsets();
    const { closeNotifyCenter } = useNavigation();
    const { transactions, todayTransactions, unparsedNotifications, approveTransaction, ignoreTransaction, editTransaction } = useTransactions();
    const { getAccount } = useAccounts();
    const { formatAmount } = useCurrency();

    const [smsAllowed, setSmsAllowed] = useState(true);
    const [editing, setEditing] = useState<Transaction | null>(null);
    const [showInbox, setShowInbox] = useState(false);
    const [reviewedCount, setReviewedCount] = useState(0);
    const deckRef = useRef<DeckHandle>(null);
    const inboxScan = useInboxScan();
    const scanSheet = (
        <ScanRangeSheet visible={inboxScan.pickerOpen} onClose={inboxScan.closePicker} onScan={inboxScan.scan} />
    );

    useEffect(() => {
        if (Platform.OS !== 'android') return;
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS).then(setSmsAllowed).catch(() => setSmsAllowed(false));
    }, []);

    const requestSms = async () => {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS, {
            title: 'Let Sikka read bank SMS',
            message: 'Sikka reads payment SMS from your bank to log spends for you. Messages never leave your phone.',
            buttonPositive: 'Allow',
            buttonNegative: 'Not now',
        });
        setSmsAllowed(result === PermissionsAndroid.RESULTS.GRANTED);
    };

    const pending = useMemo(
        () => transactions.filter((t) => t.status === 'pending' && !t.isDeleted).sort((a, b) => b.timestamp - a.timestamp),
        [transactions],
    );
    const total = pending.length + reviewedCount;
    const top = pending[0];

    /** How often this merchant was seen before (for "N times before"). */
    const seenBefore = (tx: Transaction) =>
        transactions.filter((t) => t.id !== tx.id && t.status !== 'pending' && t.merchant.toLowerCase() === tx.merchant.toLowerCase()).length;

    const approve = async (tx: Transaction, updates?: Partial<Transaction>) => {
        if (updates && Object.keys(updates).length) await editTransaction(tx.id, updates);
        await approveTransaction(tx.id, updates);
        setReviewedCount((n) => n + 1);
    };
    const notMine = async (tx: Transaction) => {
        await ignoreTransaction(tx.id);
        setReviewedCount((n) => n + 1);
    };
    const approveAll = async () => {
        for (const tx of pending) await approveTransaction(tx.id);
        setReviewedCount((n) => n + pending.length);
    };

    // ── Review one ("Who was this?") ──
    if (editing) {
        const index = pending.findIndex((t) => t.id === editing.id);
        return (
            <ReviewOne
                tx={editing}
                position={`${reviewedCount + Math.max(0, index) + 1} of ${Math.max(total, 1)}`}
                accountLabel={getAccount(editing.accountId)?.name}
                onBack={() => setEditing(null)}
                onApprove={async (updates) => {
                    await approve(editing, updates);
                    setEditing(null);
                }}
            />
        );
    }

    // ── All clear ──
    if (!top) {
        const todaySpent = Math.abs(todayTransactions.filter((t) => t.amount < 0 && t.category !== 'transfer').reduce((s, t) => s + t.amount, 0));
        const byCat: Record<string, number> = {};
        todayTransactions.filter((t) => t.amount < 0 && t.category !== 'transfer').forEach((t) => {
            byCat[t.category] = (byCat[t.category] || 0) + Math.abs(t.amount);
        });
        const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0];
        return (
            <>
            <AllClear
                insetsTop={insets.top}
                insetsBottom={insets.bottom}
                reviewed={reviewedCount}
                todaySpent={formatAmount(todaySpent)}
                topCategory={topCat ? CATEGORY_LABELS[topCat] : undefined}
                topPalette={topCat ? getPaletteKey(topCat) : 'groceries'}
                unread={unparsedNotifications.length}
                needsPermission={Platform.OS === 'android' && !smsAllowed}
                onPermission={requestSms}
                onInbox={() => setShowInbox(true)}
                onScan={inboxScan.start}
                scanning={inboxScan.scanning}
                scanMessage={inboxScan.message}
                showInbox={showInbox}
                inbox={unparsedNotifications}
                onCloseInbox={() => setShowInbox(false)}
                onHome={closeNotifyCenter}
            />
            {scanSheet}
            </>
        );
    }

    // ── Deck ──
    const reviewedSoFar = reviewedCount;
    return (
        <View style={[styles.container, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + SPACING.xxl }]}>
            <View style={styles.deckHeader}>
                <IconButton icon="chevron-left" label="Back" onPress={closeNotifyCenter} iconSize={26} />
                <Text style={styles.h1} accessibilityRole="header">Review</Text>
                {Platform.OS === 'android' && (
                    <IconButton
                        icon={inboxScan.scanning ? 'hourglass-empty' : 'sms'}
                        label="Check recent SMS"
                        onPress={inboxScan.start}
                    />
                )}
                {pending.length > 1 && (
                    <TouchableOpacity style={styles.approveAll} onPress={approveAll} accessibilityRole="button" activeOpacity={0.85}>
                        <Icon name="done-all" size={16} color={COLORS.brand} />
                        <Text style={styles.approveAllText}>Approve all {pending.length}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {!!inboxScan.message && (
                <Animated.View key={inboxScan.message} entering={fadeIn}>
                    <Text style={styles.scanMessage} accessibilityLiveRegion="polite">{inboxScan.message}</Text>
                </Animated.View>
            )}

            <View style={styles.progressRow}>
                <View style={styles.progress} accessibilityLabel={`${reviewedSoFar} of ${total} reviewed`}>
                    {Array.from({ length: Math.min(total, 12) }, (_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.progressSeg,
                                { backgroundColor: i < reviewedSoFar ? COLORS.night : i === reviewedSoFar ? SIKKA.signal : SIKKA.line },
                            ]}
                        />
                    ))}
                </View>
                <Text style={styles.left}>{pending.length} left</Text>
            </View>

            <Deck
                ref={deckRef}
                key={top.id}
                tx={top}
                account={getAccount(top.accountId)?.name}
                seen={seenBefore(top)}
                formatAmount={formatAmount}
                onApprove={() => approve(top)}
                onNotMine={() => notMine(top)}
            />

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionBtn, { width: 60, height: 60 }]}
                    onPress={() => deckRef.current?.fling(-1)}
                    accessibilityRole="button"
                    accessibilityLabel="Not mine"
                >
                    <Icon name="close" size={26} color={CATEGORY_PALETTE.shopping.fg} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { width: 52, height: 52 }]}
                    onPress={() => setEditing(top)}
                    accessibilityRole="button"
                    accessibilityLabel="Edit details"
                >
                    <Icon name="edit" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => deckRef.current?.fling(1)}
                    accessibilityRole="button"
                    accessibilityLabel="Approve"
                >
                    <Icon name="check" size={32} color={COLORS.brand} />
                </TouchableOpacity>
            </View>
            {scanSheet}
        </View>
    );
}

// ─── Deck: stacked pastel cards + swipeable top card ─────────────────
type DeckHandle = { fling: (dir: 1 | -1) => void };

const Deck = forwardRef<DeckHandle, {
    tx: Transaction;
    account?: string;
    seen: number;
    formatAmount: (n: number, force?: boolean) => string;
    onApprove: () => void | Promise<void>;
    onNotMine: () => void | Promise<void>;
}>(function Deck({ tx, account, seen, formatAmount, onApprove, onNotMine }, ref) {
    const x = useSharedValue(0);
    const y = useSharedValue(0);
    const enter = useSharedValue(0.96);
    const leaving = useSharedValue(false);

    useEffect(() => {
        // Next card scales up from 0.96 as it takes the top spot.
        enter.value = withSpring(1, POP_SPRING);
    }, [enter]);

    const mounted = useRef(true);
    useEffect(() => () => { mounted.current = false; }, []);

    // On success the parent swaps in the next card (new key) and this one unmounts.
    // If the card is still here afterwards (save failed), bring it back.
    const settle = async (dir: 1 | -1) => {
        try {
            await (dir > 0 ? onApprove() : onNotMine());
        } catch (e) {
            console.warn('[Sikka] Review action failed:', e);
        }
        setTimeout(() => {
            if (!mounted.current) return;
            leaving.value = false;
            x.value = withSpring(0, POP_SPRING);
            y.value = withSpring(0, POP_SPRING);
        }, MOTION.durSlow);
    };

    const fling = (dir: 1 | -1) => {
        'worklet';
        if (leaving.value) return;
        leaving.value = true;
        y.value = withTiming(-40, { duration: MOTION.durBase, easing: EASE.in });
        x.value = withTiming(dir * 500, { duration: MOTION.durBase, easing: EASE.in }, (done) => {
            if (done) runOnJS(settle)(dir);
        });
    };

    useImperativeHandle(ref, () => ({ fling: (dir) => fling(dir) }));

    const pan = Gesture.Pan()
        .activeOffsetX([-8, 8])
        .failOffsetY([-12, 12])
        .onUpdate((e) => {
            if (leaving.value) return;
            x.value = e.translationX;
            y.value = e.translationY * 0.3;
        })
        .onEnd((e) => {
            if (e.translationX > SWIPE_OUT || e.velocityX > 900) fling(1);
            else if (e.translationX < -SWIPE_OUT || e.velocityX < -900) fling(-1);
            else {
                x.value = withSpring(0, POP_SPRING);
                y.value = withSpring(0, POP_SPRING);
            }
        });

    const cardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: x.value },
            { translateY: y.value },
            { rotate: `${interpolate(x.value, [-300, 0, 300], [-18, 0, 18])}deg` },
            { scale: enter.value },
        ],
    }));

    const pair = getCategoryColors(tx.category);
    const isIn = tx.amount > 0;

    return (
        <View style={styles.deck}>
            <View style={[styles.deckBack, { backgroundColor: CATEGORY_PALETTE.fun.bg, transform: [{ rotate: '-4deg' }] }]} />
            <View style={[styles.deckMid, { backgroundColor: CATEGORY_PALETTE.transport.bg, transform: [{ rotate: '3deg' }] }]} />
            <GestureDetector gesture={pan}>
            <Animated.View style={[styles.card, cardStyle]}>
                <View style={[styles.cardHead, { backgroundColor: pair.bg }]}>
                    <View style={styles.cardIcon}>
                        <Icon name={(CATEGORY_ICONS[tx.category] || 'receipt-long') as any} size={26} color={pair.fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.looks, { color: pair.fg }]}>LOOKS LIKE</Text>
                        <Text style={styles.looksCat}>{CATEGORY_LABELS[tx.category] ?? tx.category}</Text>
                    </View>
                    {seen > 0 && (
                        <View style={styles.seen}>
                            <Text style={[styles.seenText, { color: pair.fg }]}>{seen} {seen === 1 ? 'time' : 'times'} before</Text>
                        </View>
                    )}
                </View>
                <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.merchant} numberOfLines={2}>{tx.merchant}</Text>
                            <Text style={styles.via}>{account ?? 'Account'} · via {tx.isAuto ? 'SMS' : 'you'}</Text>
                        </View>
                        <Text style={[styles.bigAmount, isIn && { color: COLORS.primary }]}>
                            {isIn ? '+' : ''}{formatAmount(Math.abs(tx.amount), true)}
                        </Text>
                    </View>
                    <View style={styles.when}>
                        <Icon name="schedule" size={18} color={CATEGORY_PALETTE.transport.fg} />
                        <Text style={styles.whenText}>
                            {new Date(tx.timestamp).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(tx.timestamp)}
                        </Text>
                    </View>
                    {!!tx.notes && <Text style={styles.sms} numberOfLines={3}>{tx.notes}</Text>}
                    <View style={styles.hints}>
                        <Text style={[styles.hint, { color: CATEGORY_PALETTE.shopping.fg }]}>← Not mine</Text>
                        <Wiggle>
                            <Text style={[styles.hint, { color: COLORS.primary }]}>Approve →</Text>
                        </Wiggle>
                    </View>
                </View>
            </Animated.View>
            </GestureDetector>
        </View>
    );
});

// ─── Review one ───────────────────────────────────────────────────────
function ReviewOne({
    tx,
    position,
    accountLabel,
    onBack,
    onApprove,
}: {
    tx: Transaction;
    position: string;
    accountLabel?: string;
    onBack: () => void;
    onApprove: (updates: Partial<Transaction>) => void;
}) {
    const insets = useSafeAreaInsets();
    const { formatAmount } = useCurrency();
    const [name, setName] = useState(tx.merchant);
    const [category, setCategory] = useState<TransactionCategory>(tx.category);
    const [mood, setMood] = useState<string | undefined>(tx.sentimentIds?.[0]);
    const named = name.trim().length > 0;

    const steps = [
        { label: 'Captured', done: true, icon: 'chat-bubble-outline' },
        { label: 'Name it', done: named, now: !named, icon: 'edit' },
        { label: 'Feel', done: !!mood, now: named && !mood, icon: 'mood' },
        { label: 'Done', done: false, icon: 'check' },
    ];

    return (
        <View style={[styles.container, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + SPACING.xxl }]}>
            <View style={styles.deckHeader}>
                <IconButton icon="chevron-left" label="Back to deck" onPress={onBack} iconSize={26} />
                <Text style={styles.h2} accessibilityRole="header">Who was this?</Text>
                <Text style={styles.position}>{position}</Text>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: SPACING.md }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.storyCard}>
                    <View style={styles.storyBlob} pointerEvents="none" />
                    <View style={styles.storyTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.storyRaw} numberOfLines={1}>{tx.merchant}</Text>
                            <Text style={styles.storyMeta}>{formatTime(tx.timestamp)}{accountLabel ? ` · ${accountLabel}` : ''}</Text>
                        </View>
                        <Text style={styles.storyAmount}>{formatAmount(Math.abs(tx.amount), true)}</Text>
                    </View>
                    <View style={styles.stepper}>
                        {steps.map((s, i) => (
                            <React.Fragment key={s.label}>
                                {i > 0 && <View style={[styles.stepLink, { backgroundColor: steps[i - 1].done ? (s.now ? SIKKA.signal : COLORS.night) : SIKKA.line }]} />}
                                <View style={styles.step}>
                                    <View
                                        style={[
                                            styles.stepDot,
                                            s.done ? styles.stepDone : s.now ? styles.stepNow : styles.stepTodo,
                                        ]}
                                    >
                                        {s.done && <Icon name={s.icon as any} size={15} color={COLORS.brand} />}
                                    </View>
                                    <Text style={[styles.stepLabel, s.now && { color: CATEGORY_PALETTE.dining.fg }, !s.done && !s.now && { color: COLORS.textSecondary }]}>
                                        {s.label}
                                    </Text>
                                </View>
                            </React.Fragment>
                        ))}
                    </View>
                </View>

                <TextInput
                    style={styles.payee}
                    value={name}
                    onChangeText={setName}
                    placeholder="Who did you pay?"
                    accessibilityLabel="Payee name"
                />

                <View style={styles.catGrid} accessibilityRole="radiogroup" accessibilityLabel="Category">
                    {SPEND_CATEGORIES.map((c) => (
                        <CategoryTile
                            key={c}
                            label={CATEGORY_LABELS[c]}
                            icon={CATEGORY_ICONS[c] as any}
                            palette={getPaletteKey(c)}
                            selected={category === c}
                            onPress={() => setCategory(c)}
                            style={styles.catTile}
                        />
                    ))}
                </View>

                <Text style={styles.feelLabel}>How did it feel?</Text>
                <MoodPicker value={mood} onChange={setMood} />
            </ScrollView>

            <Button
                label="Approve & next card"
                disabled={!named}
                onPress={() =>
                    onApprove({
                        merchant: name.trim(),
                        category,
                        sentimentIds: mood ? [mood] : [],
                        isImpulse: mood === 'impulse',
                    })
                }
            />
        </View>
    );
}

// ─── All clear ────────────────────────────────────────────────────────
function AllClear(props: {
    insetsTop: number;
    insetsBottom: number;
    reviewed: number;
    todaySpent: string;
    topCategory?: string;
    topPalette: keyof typeof CATEGORY_PALETTE;
    unread: number;
    onScan: () => void;
    scanning: boolean;
    scanMessage: string | null;
    needsPermission: boolean;
    onPermission: () => void;
    onInbox: () => void;
    showInbox: boolean;
    inbox: string[];
    onCloseInbox: () => void;
    onHome: () => void;
}) {
    const topPair = CATEGORY_PALETTE[props.topPalette];

    if (props.showInbox) {
        return (
            <View style={[styles.container, { paddingTop: props.insetsTop + SPACING.lg, paddingBottom: props.insetsBottom + SPACING.xxl }]}>
                <View style={styles.deckHeader}>
                    <IconButton icon="chevron-left" label="Back" onPress={props.onCloseInbox} iconSize={26} />
                    <Text style={styles.h2} accessibilityRole="header">Unread messages</Text>
                </View>
                <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: SPACING.lg }}>
                    <Text style={styles.inboxIntro}>Sikka saw these but couldn't read an amount. Teaching messages is coming soon.</Text>
                    {props.inbox.map((m, i) => (
                        <View key={i} style={styles.bubble}><Text style={styles.bubbleText}>{m}</Text></View>
                    ))}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: props.insetsTop + SPACING.lg, paddingBottom: props.insetsBottom + SPACING.xxl }]}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
                {CONFETTI.map((c, i) => (
                    <View key={i} style={[styles.confetti, c]} />
                ))}
            </View>

            <View style={styles.deckHeader}>
                <IconButton icon="chevron-left" label="Back" onPress={props.onHome} iconSize={26} />
            </View>

            <View style={styles.clearHero}>
                <Animated.View entering={popIn()}>
                    <Float>
                        <Sikku size={150} mood="celebrate" />
                    </Float>
                </Animated.View>
                {props.reviewed > 0 && (
                    <Lottie name="confetti-burst" size={280} style={styles.confettiBurst} />
                )}
                <Text style={styles.clearTitle} accessibilityRole="header">All clear!</Text>
                <Text style={styles.clearBody}>
                    {props.reviewed > 0
                        ? `${props.reviewed} ${props.reviewed === 1 ? 'payment' : 'payments'} sorted. Nothing to remember.`
                        : 'Nothing waiting for you. Payments Sikka catches show up here.'}
                </Text>
            </View>

            <View style={styles.statRow}>
                <View style={[styles.stat, styles.statWhite]}>
                    <Animated.View entering={popIn(4)}>
                        <Text style={styles.statValue}>{props.reviewed}</Text>
                    </Animated.View>
                    <Text style={styles.statLabel}>reviewed</Text>
                </View>
                <View style={[styles.stat, { backgroundColor: CATEGORY_PALETTE.bills.bg }]}>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{props.todaySpent}</Text>
                    <Text style={[styles.statLabel, { color: CATEGORY_PALETTE.bills.fg }]}>spent today</Text>
                </View>
                <View style={[styles.stat, { backgroundColor: topPair.bg }]}>
                    <Text style={[styles.statValue, { fontSize: 20 }]} numberOfLines={1} adjustsFontSizeToFit>{props.topCategory ?? '—'}</Text>
                    <Text style={[styles.statLabel, { color: topPair.fg }]}>top today</Text>
                </View>
            </View>

            {props.needsPermission && (
                <TouchableOpacity style={styles.permCard} onPress={props.onPermission} accessibilityRole="button" activeOpacity={0.85}>
                    <View style={styles.permIcon}><Icon name="notifications-active" size={22} color={CATEGORY_PALETTE.dining.fg} /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.permTitle}>Let Sikka read bank SMS</Text>
                        <Text style={styles.permBody}>Needed to catch payments automatically</Text>
                    </View>
                    <Icon name="chevron-right" size={22} color={COLORS.text} />
                </TouchableOpacity>
            )}

            {props.unread > 0 && (
                <TouchableOpacity style={styles.unread} onPress={props.onInbox} accessibilityRole="button" activeOpacity={0.85}>
                    <Icon name="mail-outline" size={20} color={COLORS.text} />
                    <Text style={styles.unreadText}>{props.unread} unread {props.unread === 1 ? 'message' : 'messages'}</Text>
                    <Icon name="chevron-right" size={20} color={COLORS.text} />
                </TouchableOpacity>
            )}

            {Platform.OS === 'android' && (
                <TouchableOpacity
                    style={styles.unread}
                    onPress={props.onScan}
                    disabled={props.scanning}
                    accessibilityRole="button"
                    accessibilityState={{ busy: props.scanning }}
                    activeOpacity={0.85}
                >
                    {props.scanning ? <ActivityIndicator size="small" color={COLORS.text} /> : <Icon name="sms" size={20} color={COLORS.text} />}
                    <Text style={styles.unreadText}>{props.scanning ? 'Checking recent SMS…' : 'Missed something? Check recent SMS'}</Text>
                    <Icon name="chevron-right" size={20} color={COLORS.text} />
                </TouchableOpacity>
            )}
            {!!props.scanMessage && (
                <Animated.View key={props.scanMessage} entering={fadeIn}>
                    <Text style={styles.scanMessage} accessibilityLiveRegion="polite">{props.scanMessage}</Text>
                </Animated.View>
            )}

            <Button label="Back to home" onPress={props.onHome} style={{ marginTop: 'auto' }} />
        </View>
    );
}

const CONFETTI = [
    { left: 40, top: 110, width: 14, height: 26, borderRadius: 5, backgroundColor: SIKKA.signal, transform: [{ rotate: '-24deg' }] },
    { left: 300, top: 100, width: 14, height: 26, borderRadius: 5, backgroundColor: CATEGORY_PALETTE.transport.bg, transform: [{ rotate: '30deg' }] },
    { left: 84, top: 240, width: 12, height: 12, borderRadius: 6, backgroundColor: CATEGORY_PALETTE.fun.bg },
    { left: 320, top: 220, width: 16, height: 16, borderRadius: 4, backgroundColor: CATEGORY_PALETTE.bills.bg, transform: [{ rotate: '18deg' }] },
    { left: 60, top: 320, width: 12, height: 24, borderRadius: 5, backgroundColor: CATEGORY_PALETTE.shopping.bg, transform: [{ rotate: '40deg' }] },
    { left: 300, top: 330, width: 12, height: 12, borderRadius: 6, backgroundColor: SIKKA.ink },
    { left: 250, top: 150, width: 10, height: 10, borderRadius: 5, backgroundColor: SIKKA.lime },
] as const;

const styles = StyleSheet.create({
    confettiBurst: { position: 'absolute', top: -60, alignSelf: 'center' },
    scanMessage: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.md },

    deckHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 48 },
    h1: { flex: 1, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, color: COLORS.text },
    h2: { flex: 1, fontSize: 24, fontWeight: '800', color: COLORS.text },
    position: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary },
    approveAll: {
        height: 42,
        paddingHorizontal: 14,
        borderRadius: 21,
        backgroundColor: COLORS.night,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    approveAllText: { fontSize: 14, fontWeight: '800', color: COLORS.brand },

    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    progress: { flex: 1, flexDirection: 'row', gap: 4 },
    progressSeg: { flex: 1, height: 8, borderRadius: 4 },
    left: { fontSize: 14, fontWeight: '800', color: COLORS.text },

    deck: { flex: 1, minHeight: 360, maxHeight: 460, marginTop: 6 },
    deckBack: { position: 'absolute', left: 30, right: 30, top: 0, bottom: 30, borderRadius: 34 },
    deckMid: { position: 'absolute', left: 16, right: 16, top: 10, bottom: 20, borderRadius: 34 },
    card: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 22,
        bottom: 0,
        borderRadius: 34,
        backgroundColor: COLORS.surface,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    cardHead: { padding: 18, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    cardIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    looks: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
    looksCat: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    seen: { backgroundColor: COLORS.surface, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
    seenText: { fontSize: 12, fontWeight: '800' },
    cardBody: { flex: 1, padding: 18, paddingTop: SPACING.lg, gap: SPACING.md },
    cardTop: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.md },
    merchant: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    via: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
    bigAmount: { fontSize: 44, lineHeight: 46, fontWeight: '800', letterSpacing: -1, color: COLORS.text },
    when: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EAF2FF', borderRadius: 24, padding: 14 },
    whenText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    sms: { backgroundColor: COLORS.background, borderRadius: 20, borderBottomLeftRadius: 6, padding: 12, fontSize: 13, lineHeight: 18, color: COLORS.text },
    hints: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between' },
    hint: { fontSize: 13, fontWeight: '800' },

    actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
    actionBtn: { borderRadius: 999, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.md },
    approveBtn: { width: 72, height: 72, backgroundColor: COLORS.night, borderWidth: 8, borderColor: 'rgba(198, 226, 107, 0.4)' },

    storyCard: { backgroundColor: CATEGORY_PALETTE.bills.bg, borderRadius: 32, padding: 18, gap: 14, overflow: 'hidden' },
    storyBlob: { position: 'absolute', right: -26, top: -26, width: 96, height: 96, borderRadius: 48, backgroundColor: '#FFD45C' },
    storyTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
    storyRaw: { fontSize: 13, fontWeight: '800', color: CATEGORY_PALETTE.bills.fg },
    storyMeta: { fontSize: 13, fontWeight: '600', color: CATEGORY_PALETTE.bills.fg, marginTop: 2 },
    storyAmount: { fontSize: 44, lineHeight: 46, fontWeight: '800', letterSpacing: -1, color: COLORS.text },
    stepper: { backgroundColor: COLORS.surface, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'flex-start' },
    step: { flex: 1, alignItems: 'center', gap: 4 },
    stepDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    stepDone: { backgroundColor: COLORS.night },
    stepNow: { backgroundColor: SIKKA.signal, borderWidth: 5, borderColor: '#FFE3D4', width: 40, height: 40, borderRadius: 20, marginTop: -4, marginBottom: -4 },
    stepTodo: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#BDB5A6' },
    stepLabel: { fontSize: 12, fontWeight: '800', color: COLORS.text },
    stepLink: { width: 16, height: 3, borderRadius: 2, marginTop: 15 },

    payee: { height: 56, borderRadius: 28, backgroundColor: COLORS.surface, paddingHorizontal: 20, fontSize: 17, fontWeight: '700', color: COLORS.text, ...SHADOWS.sm },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    catTile: { flexBasis: '22%', flexGrow: 1 },
    feelLabel: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary },

    clearHero: { alignItems: 'center', gap: 6, paddingTop: SPACING.lg },
    clearTitle: { fontSize: 40, fontWeight: '800', letterSpacing: -1, color: COLORS.text, marginTop: 14 },
    clearBody: { fontSize: 16, lineHeight: 22, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: SPACING.lg },
    confetti: { position: 'absolute' },
    statRow: { flexDirection: 'row', gap: 10, marginTop: SPACING.lg },
    stat: { flex: 1, borderRadius: 24, padding: 14 },
    statWhite: { backgroundColor: COLORS.surface, ...SHADOWS.md },
    statValue: { fontSize: 24, fontWeight: '800', color: COLORS.text },
    statLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: 2 },

    permCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: CATEGORY_PALETTE.dining.bg, borderRadius: 26, padding: 14 },
    permIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    permTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    permBody: { fontSize: 13, fontWeight: '600', color: CATEGORY_PALETTE.dining.fg },
    unread: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 999, paddingVertical: 12, paddingHorizontal: SPACING.lg, ...SHADOWS.sm },
    unreadText: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
    inboxIntro: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
    bubble: { backgroundColor: COLORS.surface, borderRadius: 20, borderBottomLeftRadius: 6, padding: 12, ...SHADOWS.sm },
    bubbleText: { fontSize: 14, lineHeight: 20, color: COLORS.text },
});
