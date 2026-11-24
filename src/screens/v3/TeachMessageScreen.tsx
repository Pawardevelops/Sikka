/**
 * Teach a message (canvas "26 Teach a message").
 * A bank SMS Sikka couldn't read: tap the amount and the payee once, and Sikka
 * learns the format for that bank. Older messages in the same format can go to
 * Review in one tap.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Typography';
import { Icon } from '../../components/Icon';
import { Button, Segmented, Toggle, useToast } from '../../components/ui';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, SIKKA } from '../../constants/theme';
import { useNavigation } from '../../context/NavigationContext';
import { useTransactions } from '../../context/TransactionsContext';
import database from '../../database';
import UnparsedMessage from '../../database/models/UnparsedMessage';
import { unreadBankSms } from '../../services/sms';
import { tokenize, buildFormat, saveLearnedFormat, ignoreSms, TokenRole } from '../../services/sms/learned';
import { bankName } from '../../services/sms/extract';
import { parseWithPatterns } from '../../services/sms/patterns';
import { saveCapturedTransaction } from '../../services/sms/store';
import { Frame, frameStyles } from './Frame';

type Msg = { id: string; body: string; sender: string; timestamp: number };

const ROLE_STYLE: Record<TokenRole, { bg: string; fg: string; label: string }> = {
    amount: { bg: SIKKA.lime, fg: COLORS.onBrand, label: 'Amount' },
    payee: { bg: CATEGORY_PALETTE.transport.bg, fg: CATEGORY_PALETTE.transport.fg, label: 'Payee' },
    date: { bg: CATEGORY_PALETTE.bills.bg, fg: CATEGORY_PALETTE.bills.fg, label: 'Date' },
};

export function TeachMessageScreen({ messageId }: { messageId?: string }) {
    const { closeScreen } = useNavigation();
    const { refreshTransactions } = useTransactions();
    const toast = useToast();
    const [queue, setQueue] = useState<Msg[]>([]);
    const [index, setIndex] = useState(0);
    const [tool, setTool] = useState<TokenRole>('amount');
    const [roles, setRoles] = useState<Record<number, TokenRole>>({});
    const [direction, setDirection] = useState<'debit' | 'credit'>('debit');
    const [addOld, setAddOld] = useState(true);
    const [matches, setMatches] = useState<Msg[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            const list = (await unreadBankSms(Date.now() - 90 * 86_400_000, 50)).map((m) => ({ id: m.id, body: m.body, sender: m.sender, timestamp: m.timestamp }));
            if (messageId && !list.some((m) => m.id === messageId)) {
                try {
                    const m = await database.get<UnparsedMessage>('unparsed_messages').find(messageId);
                    list.unshift({ id: m.id, body: m.body, sender: m.sender, timestamp: m.timestamp });
                } catch { /* gone */ }
            }
            setQueue(list);
            setIndex(Math.max(0, list.findIndex((m) => m.id === messageId)));
        })();
    }, [messageId]);

    const msg = queue[index];
    const tokens = useMemo(() => (msg ? tokenize(msg.body) : []), [msg]);
    useEffect(() => {
        setRoles({});
        setTool('amount');
        setDirection(msg && /credited|received/i.test(msg.body) ? 'credit' : 'debit');
    }, [msg]);

    const format = useMemo(() => buildFormat(tokens, roles), [tokens, roles]);
    const amountText = Object.entries(roles).find(([, r]) => r === 'amount')?.[0];
    const payeeText = Object.entries(roles).filter(([, r]) => r === 'payee').map(([i]) => tokens[Number(i)]).join(' ');

    // How many older SMS share this format.
    useEffect(() => {
        if (!format || !msg) return setMatches([]);
        let re: RegExp;
        try {
            re = new RegExp(format.source, 'is');
        } catch {
            return setMatches([]);
        }
        setMatches(queue.filter((m) => m.id !== msg.id && m.sender === msg.sender && re.test(m.body)));
    }, [format, queue, msg]);

    const tap = (i: number) =>
        setRoles((r) => {
            const next = { ...r };
            if (next[i] === tool) delete next[i];
            else {
                if (tool === 'amount') Object.keys(next).forEach((k) => next[Number(k)] === 'amount' && delete next[Number(k)]);
                next[i] = tool;
            }
            return next;
        });

    const notPayment = async () => {
        if (!msg) return;
        await ignoreSms(msg.id);
        setQueue((q) => q.filter((m) => m.id !== msg.id));
        if (index + 1 >= queue.length) closeScreen();
    };

    const save = async () => {
        if (!format || !msg) return;
        setSaving(true);
        try {
            await saveLearnedFormat({ sender: msg.sender, source: format.source, direction, amountGroup: format.amountGroup });
            const toAdd = [msg, ...(addOld ? matches : [])];
            let added = 0;
            for (const m of toAdd) {
                const parsed = parseWithPatterns(m.body);
                if (!parsed) continue;
                const out = await saveCapturedTransaction({ ...parsed, direction }, m.sender, m.timestamp, m.body);
                if (out && out !== 'duplicate') added++;
            }
            await refreshTransactions();
            toast.show({ message: `Learned ${bankName(msg.sender)}. ${added} ${added === 1 ? 'payment' : 'payments'} added to Review.`, icon: 'school' });
            const learnedIds = new Set(toAdd.map((m) => m.id));
            const rest = queue.filter((m) => !learnedIds.has(m.id));
            setQueue(rest);
            if (!rest.length) closeScreen();
            else setIndex(Math.min(index, rest.length - 1));
        } finally {
            setSaving(false);
        }
    };

    if (!msg) {
        return (
            <Frame title="Teach a message" big sub="Nothing to teach. Every bank SMS was read.">
                <View />
            </Frame>
        );
    }

    return (
        <Frame
            title="Teach a message"
            right={<Text style={styles.position}>{index + 1} of {queue.length}</Text>}
            bottom={
                <>
                    <Button label={`Save rule for ${bankName(msg.sender)}`} onPress={save} disabled={!format} loading={saving} icon="check" />
                    <Button label="Not a payment" variant="soft" icon={null} onPress={notPayment} />
                </>
            }
        >
            <Text style={frameStyles.muted}>Sikku doesn't get this one. Tap the words.</Text>

            <Segmented
                label="What are you marking?"
                options={[
                    { value: 'amount', label: 'Amount' },
                    { value: 'payee', label: 'Payee' },
                    { value: 'date', label: 'Date?' },
                ]}
                value={tool}
                onChange={setTool}
            />

            <View style={styles.sms}>
                <View style={styles.smsHead}>
                    <Text style={styles.smsFrom}>{msg.sender}</Text>
                    <Text style={styles.smsTime}>
                        {new Date(msg.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </Text>
                </View>
                <View style={styles.tokens} accessibilityHint="Tap a word to mark it">
                    {tokens.map((t, i) => {
                        const role = roles[i];
                        const st = role ? ROLE_STYLE[role] : null;
                        return (
                            <TouchableOpacity
                                key={`${i}-${t}`}
                                onPress={() => tap(i)}
                                accessibilityRole="button"
                                accessibilityLabel={`${t}${role ? `, marked ${role}` : ''}`}
                                style={[styles.token, st && { backgroundColor: st.bg }]}
                                hitSlop={4}
                            >
                                <Text style={[styles.tokenText, st && { color: st.fg, fontWeight: '800' }]}>{t}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <Segmented
                label="Money"
                tone="sunk"
                options={[
                    { value: 'debit', label: 'Sent' },
                    { value: 'credit', label: 'Got' },
                ]}
                value={direction}
                onChange={setDirection}
            />

            <View style={styles.learned}>
                <Text style={frameStyles.over}>SIKKU LEARNED</Text>
                <Row label="Amount" value={amountText ? tokens[Number(amountText)] : 'Tap the amount'} done={!!amountText} />
                <Row label="Payee" value={payeeText || 'Tap the shop or person'} done={!!payeeText} />
                {matches.length > 0 && (
                    <View style={styles.also}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.alsoTitle}>Also fits {matches.length} old {matches.length === 1 ? 'message' : 'messages'}</Text>
                            <Text style={frameStyles.muted}>Add {matches.length === 1 ? 'it' : `those ${matches.length}`} to review. You'll swipe through them later.</Text>
                        </View>
                        <Toggle label={`Add ${matches.length} old messages to review`} value={addOld} onValueChange={setAddOld} />
                    </View>
                )}
            </View>
        </Frame>
    );
}

function Row({ label, value, done }: { label: string; value: string; done: boolean }) {
    return (
        <View style={styles.row}>
            <Icon name={done ? 'check-circle' : 'radio-button-unchecked'} size={20} color={done ? COLORS.primary : COLORS.textSecondary} />
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={[styles.rowValue, !done && { color: COLORS.textSecondary, fontWeight: '600' }]} numberOfLines={1}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    position: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary },
    sms: { backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, gap: SPACING.md, ...SHADOWS.sm },
    smsHead: { flexDirection: 'row', justifyContent: 'space-between' },
    smsFrom: { fontSize: 13, fontWeight: '800', color: COLORS.text, letterSpacing: 0.4 },
    smsTime: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    tokens: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    token: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: COLORS.surfaceSunk, minHeight: 36, justifyContent: 'center' },
    tokenText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
    learned: { backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, gap: SPACING.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    rowLabel: { width: 70, fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
    rowValue: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text },
    also: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: CATEGORY_PALETTE.bills.bg, borderRadius: 18, padding: 14 },
    alsoTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
});
