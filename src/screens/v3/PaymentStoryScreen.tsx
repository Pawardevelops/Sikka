/**
 * Payment story (canvas "14 Transaction detail"): what happened to one payment,
 * from the bank SMS to approval. Edit opens the full form; Delete asks first and
 * can be undone for 5 seconds.
 */
import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Typography';
import { Icon, IconName } from '../../components/Icon';
import { Chip, ConfirmSheet, useToast } from '../../components/ui';
import { MoodFace, MOODS } from '../../components/ui/MoodFace';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getCategoryColors } from '../../constants/theme';
import { useNavigation } from '../../context/NavigationContext';
import { useTransactions, CATEGORY_LABELS, CATEGORY_ICONS } from '../../context/TransactionsContext';
import { useAccounts } from '../../context/AccountsContext';
import { useCurrency } from '../../context/CurrencyContext';
import { getSmsModel } from '../../services/sms/models';
import { Frame } from './Frame';

export function readByLabel(readBy?: string): { title: string; sub: string } {
    if (!readBy || readBy === 'you') return { title: 'Added by you', sub: 'Typed in Sikka' };
    if (readBy === 'rule') return { title: 'Filed by your rule', sub: 'Name, account and category from a sender you named' };
    const model = getSmsModel(readBy);
    if (model) return { title: 'Read by on-phone AI', sub: `${model.name} model found the payee and amount` };
    if (readBy.startsWith('TAUGHT_')) return { title: 'Read with a format you taught', sub: 'Amount and payee from your taught message' };
    return { title: 'Read by Sikka', sub: 'Known bank format · amount and payee found' };
}

export function PaymentStoryScreen({ txId }: { txId: string }) {
    const { closeScreen, openScreen, selectTransaction } = useNavigation();
    const { transactions, deleteTransaction, restoreTransaction } = useTransactions();
    const { getAccount } = useAccounts();
    const { formatAmount } = useCurrency();
    const toast = useToast();
    const [confirm, setConfirm] = useState(false);
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return <Frame title="Payment"><Text>This payment was removed.</Text></Frame>;

    const account = getAccount(tx.accountId);
    const pair = getCategoryColors(tx.category);
    const mood = MOODS.find((m) => tx.sentimentIds?.includes(m.id));
    const when = new Date(tx.timestamp);
    const ref = tx.smsBody?.match(/ref(?:\s*no)?\.?\s*:?\s*(\d{4,})/i)?.[1];
    const read = readByLabel(tx.readBy);

    const remove = async () => {
        setConfirm(false);
        await deleteTransaction(tx.id);
        closeScreen();
        toast.show({
            message: `${tx.merchant} ${formatAmount(Math.abs(tx.amount), true)} deleted`,
            action: { label: 'Undo', onPress: () => void restoreTransaction(tx.id) },
        });
    };

    return (
        <Frame
            title="Payment story"
            right={
                <TouchableOpacity onPress={() => selectTransaction(tx)} accessibilityRole="button" style={styles.edit} hitSlop={8}>
                    <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
            }
        >
            <View style={[styles.hero, { backgroundColor: pair.bg }]}>
                <View style={styles.heroIcon}>
                    <Icon name={(CATEGORY_ICONS[tx.category] || 'receipt-long') as IconName} size={24} color={pair.fg} />
                </View>
                <Text style={styles.name} accessibilityRole="header">{tx.merchant}</Text>
                <Text style={[styles.when, { color: pair.fg }]}>
                    {when.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                    {when.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · {CATEGORY_LABELS[tx.category]}
                </Text>
                <Text style={styles.amount}>
                    {tx.amount < 0 ? '−' : '+'}{formatAmount(Math.abs(tx.amount), true)}
                </Text>
            </View>

            <View style={styles.facts}>
                <Fact label="FELT">
                    {mood ? <View style={styles.row}><MoodFace mood={mood.id} size={22} /><Text style={styles.factValue}>{mood.label}</Text></View> : <Text style={styles.factEmpty}>—</Text>}
                </Fact>
                <Fact label="FROM"><Text style={styles.factValue} numberOfLines={1}>{account?.name ?? '—'}{account?.last4 ? ` ··${account.last4}` : ''}</Text></Fact>
            </View>
            {!!tx.tags?.length && (
                <View style={styles.tags}>{tx.tags.map((t) => <Chip key={t} label={`#${t}`} tone="surface" />)}</View>
            )}

            <View style={styles.timeline}>
                <Text style={styles.timelineTitle}>Payment story</Text>
                {tx.smsBody ? (
                    <Step icon="sms" title="Caught from bank SMS" sub={`${when.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}${ref ? ` · UPI ref ··${ref.slice(-4)}` : ''}${tx.smsSender ? ` · ${tx.smsSender}` : ''}`} />
                ) : (
                    <Step icon="edit" title="Added by hand" sub={when.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} />
                )}
                {tx.smsBody && <Step icon="auto-awesome" title={read.title} sub={read.sub} />}
                {tx.planId && <Step icon="event-repeat" title="Linked to a payment plan" sub="Counted as that plan's payment, not a new expense" />}
                <TouchableOpacity onPress={() => openScreen({ name: 'voiceNote', txId: tx.id })} accessibilityRole="button" activeOpacity={0.85}>
                    <Step
                        icon="mic"
                        title={tx.notes ? 'Voice note' : 'Add a voice note'}
                        sub={tx.notes ? `"${tx.notes}"` : 'Say why you paid. It stays on this phone.'}
                        link
                    />
                </TouchableOpacity>
                <Step
                    icon={tx.status === 'pending' ? 'hourglass-empty' : 'check-circle'}
                    title={tx.status === 'pending' ? 'Waiting in Review' : tx.autoFiled ? 'Auto-filed' : 'Approved'}
                    sub={tx.autoFiled ? 'No review needed' : tx.status === 'pending' ? 'Swipe it in tonight’s review' : 'In your ledger'}
                    last
                />
            </View>

            {tx.autoFiled && (
                <TouchableOpacity style={styles.fix} onPress={() => openScreen({ name: 'fixTag', txId: tx.id })} accessibilityRole="button">
                    <Icon name="sell" size={20} color={COLORS.text} />
                    <Text style={styles.fixText}>Wrong category? Fix this tag</Text>
                    <Icon name="chevron-right" size={20} color={COLORS.text} />
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.delete} onPress={() => setConfirm(true)} accessibilityRole="button" accessibilityLabel="Delete payment. Asks to confirm, then can be undone for 5 seconds">
                <Icon name="delete-outline" size={20} color={COLORS.error} />
                <Text style={styles.deleteText}>Delete payment</Text>
            </TouchableOpacity>

            <ConfirmSheet
                visible={confirm}
                destructive
                title="Delete this payment?"
                body={`${tx.merchant} ${formatAmount(Math.abs(tx.amount), true)} leaves your ledger and ${account?.name ?? 'the account'} balance goes back.`}
                confirmLabel="Delete"
                onConfirm={remove}
                onCancel={() => setConfirm(false)}
            />
        </Frame>
    );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={styles.fact}>
            <Text style={styles.factLabel}>{label}</Text>
            {children}
        </View>
    );
}

function Step({ icon, title, sub, last, link }: { icon: IconName; title: string; sub: string; last?: boolean; link?: boolean }) {
    return (
        <View style={styles.step}>
            <View style={styles.stepRail}>
                <View style={styles.stepDot}><Icon name={icon} size={16} color={COLORS.brand} /></View>
                {!last && <View style={styles.stepLine} />}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : SPACING.lg }}>
                <Text style={styles.stepTitle}>{title}{link ? '  ›' : ''}</Text>
                <Text style={styles.stepSub}>{sub}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    edit: { height: 44, paddingHorizontal: SPACING.lg, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', ...SHADOWS.sm },
    editText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    hero: { borderRadius: 30, padding: SPACING.xl, gap: 4 },
    heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
    name: { fontSize: 28, lineHeight: 31, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
    when: { fontSize: 14, fontWeight: '700' },
    amount: { fontSize: 40, lineHeight: 44, fontWeight: '800', color: COLORS.text, letterSpacing: -1, marginTop: SPACING.sm },
    facts: { flexDirection: 'row', gap: SPACING.sm },
    fact: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, padding: 14, gap: 4, ...SHADOWS.sm },
    factLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
    factValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    factEmpty: { fontSize: 16, fontWeight: '800', color: COLORS.textSecondary },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    timeline: { backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, ...SHADOWS.sm },
    timelineTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
    step: { flexDirection: 'row', gap: SPACING.md },
    stepRail: { alignItems: 'center', width: 30 },
    stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.night, alignItems: 'center', justifyContent: 'center' },
    stepLine: { flex: 1, width: 2, backgroundColor: COLORS.border, marginVertical: 2 },
    stepTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    stepSub: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
    fix: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: CATEGORY_PALETTE.bills.bg, borderRadius: 22, padding: SPACING.lg },
    fixText: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
    delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, height: 52 },
    deleteText: { fontSize: 15, fontWeight: '800', color: COLORS.error },
});
