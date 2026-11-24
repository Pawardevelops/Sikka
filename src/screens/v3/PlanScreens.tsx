/**
 * Assets (v3 canvas section 06): accounts + what goes out every month.
 *   Assets hub · Add a payment plan · Plan detail · Pause or change ·
 *   Coming up (next 14 days) · Needs attention · AI found an autopay
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Text, TextInput } from '../../components/Typography';
import { Icon, IconName } from '../../components/Icon';
import { Button, Chip, Segmented, Toggle, ConfirmSheet, useToast } from '../../components/ui';
import { useSafeTop } from '../../components/SafeScreen';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getCategoryColors, ACCOUNT_ICONS, SIKKA } from '../../constants/theme';
import { useNavigation } from '../../context/NavigationContext';
import { useAccounts } from '../../context/AccountsContext';
import { useSubscriptions } from '../../context/SubscriptionsContext';
import { useTransactions } from '../../context/TransactionsContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Account, PlanKind, PlanVia } from '../../types';
import database from '../../database';
import UnparsedMessage from '../../database/models/UnparsedMessage';
import { Q } from '@nozbe/watermelondb';
import {
    KIND_LABEL, VIA_LABEL, isLive, nextDue, monthlyCost, upcoming, shortfalls, findIssues, findNewMandates,
    readMandate, pastDebitsFor, BANK_APPS, Issue, FoundMandate,
} from '../../services/plans';
import { ignoreSms, ignoredSmsIds } from '../../services/sms/learned';
import { bankName, looksLikePreDebit } from '../../services/sms/extract';
import { Frame, frameStyles } from './Frame';

const DAY = 86_400_000;
const d = (date: Date | number) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const KIND_ICON: Record<PlanKind, IconName> = { sip: 'trending-up', subscription: 'subscriptions', emi: 'two-wheeler', insurance: 'health-and-safety', autopay: 'autorenew' };
const KIND_PALETTE: Record<PlanKind, keyof typeof CATEGORY_PALETTE> = { sip: 'groceries', subscription: 'fun', emi: 'transport', insurance: 'health', autopay: 'bills' };

/** Bank SMS from the last 60 days (for failed debits and new mandates). */
function useRecentSms(days = 60) {
    const [msgs, setMsgs] = useState<{ id: string; body: string; sender: string; timestamp: number }[]>([]);
    useEffect(() => {
        database
            .get<UnparsedMessage>('unparsed_messages')
            .query(Q.where('timestamp', Q.gt(Date.now() - days * DAY)))
            .fetch()
            .then((r) => setMsgs(r.map((m) => ({ id: m.id, body: m.body, sender: m.sender, timestamp: m.timestamp }))))
            .catch(() => undefined);
    }, [days]);
    return msgs;
}

function usePlanData() {
    const { activeAccounts } = useAccounts();
    const { subscriptions } = useSubscriptions();
    const { activeTransactions } = useTransactions();
    const msgs = useRecentSms();
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    useEffect(() => { ignoredSmsIds().then(setDismissed); }, [msgs.length]);
    const plans = subscriptions.filter((s) => s.status !== 'archived');
    const live = plans.filter(isLive);
    const next = upcoming(live, activeAccounts, 14);
    const shorts = shortfalls(next, activeAccounts);
    const issues = findIssues(plans, activeTransactions, msgs, activeAccounts);
    const found = findNewMandates(msgs, subscriptions, dismissed);
    return { accounts: activeAccounts, plans, live, next, shorts, issues, found, msgs, txs: activeTransactions };
}

// ─── Assets hub ───────────────────────────────────────────────────────
export function AssetsHub() {
    const { openScreen, selectAccount, openAddModal } = useNavigation();
    const { formatAmount } = useCurrency();
    const safeTop = useSafeTop();
    const { accounts, live, next, shorts, issues, found } = usePlanData();
    const inAccounts = accounts.filter((a) => a.type !== 'credit').reduce((s, a) => s + a.balance, 0);
    const monthly = live.reduce((s, p) => s + monthlyCost(p), 0);
    const hasCard = accounts.some((a) => a.type === 'credit');
    const groups: { title: string; kinds: PlanKind[]; palette: keyof typeof CATEGORY_PALETTE; icon: IconName }[] = [
        { title: 'SIPs', kinds: ['sip'], palette: 'groceries', icon: 'trending-up' },
        { title: 'EMI · Insurance', kinds: ['emi', 'insurance'], palette: 'transport', icon: 'two-wheeler' },
        { title: 'Subscriptions', kinds: ['subscription', 'autopay'], palette: 'fun', icon: 'subscriptions' },
    ];
    const failed = issues.filter((i) => i.kind === 'failed');

    return (
        <ScrollView style={{ backgroundColor: COLORS.background }} contentContainerStyle={[styles.scroll, { paddingTop: safeTop + SPACING.sm }]} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">Assets</Text>
                <TouchableOpacity style={styles.add} onPress={() => openScreen({ name: 'planEdit' })} accessibilityRole="button" accessibilityLabel="Add a payment plan">
                    <Icon name="add" size={20} color={COLORS.onNight} />
                    <Text style={styles.addText}>Add</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.hero}>
                <View style={styles.heroHead}>
                    <Text style={styles.heroOver}>IN YOUR ACCOUNTS</Text>
                    <TouchableOpacity onPress={() => openAddModal()} accessibilityRole="button" style={styles.heroAdd}>
                        <Text style={styles.heroAddText}>+ Account</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.heroValue} adjustsFontSizeToFit numberOfLines={1}>{formatAmount(inAccounts, true)}</Text>
                <View style={{ gap: 6 }}>
                    {accounts.map((a) => (
                        <AccountLine
                            key={a.id}
                            account={a}
                            note={
                                shorts[a.id]
                                    ? `short for ${d(shorts[a.id].by)}`
                                    : a.type === 'credit'
                                        ? a.creditCardDetails?.dueDate ? `due ${a.creditCardDetails.dueDate}${['st', 'nd', 'rd'][((a.creditCardDetails.dueDate + 90) % 100 - 10) % 10 - 1] ?? 'th'}` : 'card'
                                        : a.type
                            }
                            warn={!!shorts[a.id]}
                            onPress={() => selectAccount(a)}
                            formatAmount={formatAmount}
                        />
                    ))}
                </View>
            </View>

            <View style={styles.goes}>
                <Text style={frameStyles.over}>GOES OUT EVERY MONTH</Text>
                <Text style={styles.goesValue}>{formatAmount(Math.round(monthly), true)}</Text>
                {hasCard && <Text style={frameStyles.muted}>+ card autopay (varies)</Text>}
                {issues.length > 0 && (
                    <TouchableOpacity style={styles.attention} onPress={() => openScreen({ name: 'issues' })} accessibilityRole="button">
                        <Icon name="error-outline" size={20} color={COLORS.error} />
                        <Text style={styles.attentionText}>
                            {issues.length} need attention{failed.length ? ` · ${failed.length} failed ${failed[0].plan.kind === 'sip' ? 'SIP' : 'debit'}` : ''}
                        </Text>
                        <Icon name="chevron-right" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                )}
                <View style={{ gap: SPACING.sm }}>
                    {groups.map((g) => {
                        const list = live.filter((p) => g.kinds.includes(p.kind ?? 'subscription'));
                        const pair = CATEGORY_PALETTE[g.palette];
                        return (
                            <TouchableOpacity
                                key={g.title}
                                style={[styles.group, { backgroundColor: pair.bg }]}
                                onPress={() => (list[0] ? openScreen({ name: 'plan', id: list[0].id }) : openScreen({ name: 'planEdit', kind: g.kinds[0] }))}
                                accessibilityRole="button"
                                activeOpacity={0.85}
                            >
                                <View style={styles.groupIcon}><Icon name={g.icon} size={20} color={pair.fg} /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.groupTitle}>{g.title}</Text>
                                    <Text style={[styles.groupSub, { color: pair.fg }]}>{list.length ? `${list.length} active` : 'Add one'}</Text>
                                </View>
                                <Text style={styles.groupValue}>{formatAmount(Math.round(list.reduce((s, p) => s + monthlyCost(p), 0)), true)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={{ gap: SPACING.sm }}>
                <View style={styles.rowHead}>
                    <Text style={styles.h2}>Next 14 days · {next.length} {next.length === 1 ? 'debit' : 'debits'}</Text>
                    <TouchableOpacity onPress={() => openScreen({ name: 'due' })} accessibilityRole="button" hitSlop={10}><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
                </View>
                {next.length === 0 && <Text style={frameStyles.muted}>Nothing due. Add SIPs, EMIs and subscriptions to see what goes out next.</Text>}
                {next.slice(0, 3).map((u, i) => <DueRow key={i} u={u} accounts={accounts} shorts={shorts} formatAmount={formatAmount} onPress={() => u.plan ? openScreen({ name: 'plan', id: u.plan.id }) : u.card && selectAccount(u.card)} />)}
            </View>

            {found.length > 0 && (
                <TouchableOpacity style={styles.found} onPress={() => openScreen({ name: 'planFound', messageId: found[0].messageId })} accessibilityRole="button" activeOpacity={0.85}>
                    <View style={styles.foundIcon}><Icon name="auto-awesome" size={20} color={COLORS.onBrand} /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.groupTitle}>AI found {found.length} new {found.length === 1 ? 'autopay' : 'autopays'}</Text>
                        <Text style={frameStyles.muted}>in your SMS · {found[0].name} {formatAmount(found[0].amount, true)}</Text>
                    </View>
                    <Icon name="chevron-right" size={22} color={COLORS.text} />
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

function AccountLine({ account: a, note, warn, onPress, formatAmount }: { account: Account; note: string; warn: boolean; onPress: () => void; formatAmount: (n: number, b?: boolean) => string }) {
    const pair = getCategoryColors(a.type);
    return (
        <TouchableOpacity style={styles.accLine} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${a.name}, ${formatAmount(a.balance, true)}${warn ? `, ${note}` : ''}`}>
            <View style={[styles.accIcon, { backgroundColor: pair.bg }]}><Icon name={(ACCOUNT_ICONS[a.type] || 'account-balance') as IconName} size={16} color={pair.fg} /></View>
            <Text style={styles.accName} numberOfLines={1}>{a.name}{a.last4 ? ` ··${a.last4}` : ''}</Text>
            <Text style={[styles.accNote, warn && { color: COLORS.error, fontWeight: '800' }]}>{note}</Text>
            <Text style={styles.accValue}>{a.type === 'credit' && a.balance !== 0 ? '−' : ''}{formatAmount(Math.abs(a.balance), true)}</Text>
        </TouchableOpacity>
    );
}

function DueRow({ u, accounts, shorts, formatAmount, onPress }: { u: ReturnType<typeof upcoming>[number]; accounts: Account[]; shorts: ReturnType<typeof shortfalls>; formatAmount: (n: number, b?: boolean) => string; onPress?: () => void }) {
    const acc = accounts.find((a) => a.id === u.accountId);
    const days = Math.round((new Date(u.date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
    const short = u.accountId && shorts[u.accountId] && shorts[u.accountId].by.getTime() >= u.date.getTime() ? shorts[u.accountId] : null;
    const name = u.plan?.name ?? `${u.card?.name} bill`;
    const sub = u.plan
        ? `${acc ? `${bankName(acc.smsSender) || acc.name}${acc.last4 ? ` ··${acc.last4}` : ''}` : 'No account'} · ${u.plan.via ? VIA_LABEL[u.plan.via].replace(' (NACH)', '') : KIND_LABEL[u.plan.kind ?? 'subscription']}${u.moved ? ` · moves to ${u.date.toLocaleDateString('en-IN', { weekday: 'short' })}` : ''}`
        : 'Card bill · autopay or pay by hand';
    return (
        <TouchableOpacity style={styles.due} onPress={onPress} disabled={!onPress} accessibilityRole="button" activeOpacity={0.85}>
            <View style={styles.dueDate}>
                <Text style={styles.dueDay}>{days === 0 ? 'TODAY' : days === 1 ? 'TMRW' : u.date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</Text>
                <Text style={styles.dueNum}>{d(u.date)}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.dueName} numberOfLines={1}>{name}</Text>
                <Text style={[styles.dueSub, short && { color: COLORS.error, fontWeight: '800' }]} numberOfLines={1}>
                    {short ? `${acc?.name} short by ${formatAmount(short.short, true)}` : sub}
                </Text>
            </View>
            <Text style={styles.dueAmount}>{formatAmount(u.amount, true)}</Text>
        </TouchableOpacity>
    );
}

// ─── Add / edit a payment plan ────────────────────────────────────────
export function PlanEditScreen({ id, kind: kindParam, foundMessageId, linkPast }: { id?: string; kind?: string; foundMessageId?: string; linkPast?: boolean }) {
    const { closeScreen, replaceScreen } = useNavigation();
    const { activeAccounts } = useAccounts();
    const { subscriptions, addSubscription, updateSubscription } = useSubscriptions();
    const { activeTransactions, editTransaction } = useTransactions();
    const toast = useToast();
    const existing = subscriptions.find((s) => s.id === id);
    const banks = activeAccounts.filter((a) => a.type !== 'investment' && a.type !== 'bitcoin');
    const [kind, setKind] = useState<PlanKind>(existing?.kind ?? (kindParam as PlanKind) ?? 'sip');
    const [name, setName] = useState(existing?.name ?? '');
    const [amount, setAmount] = useState(existing ? String(existing.totalAmount) : '');
    const [varies, setVaries] = useState(!!existing?.amountVaries);
    const [day, setDay] = useState(String(existing?.dueDate ?? new Date().getDate()));
    const [cycle, setCycle] = useState<'monthly' | 'yearly'>(existing?.billingCycle ?? 'monthly');
    const [from, setFrom] = useState(existing?.paymentSourceId ?? banks[0]?.id);
    const [via, setVia] = useState<PlanVia>(existing?.via ?? (kindParam === 'subscription' ? 'upi_autopay' : 'nach'));
    const [limit, setLimit] = useState(existing?.mandateLimit ? String(existing.mandateLimit) : '');
    const [ends, setEnds] = useState<'never' | 'count'>(existing?.paymentsLeft ? 'count' : 'never');
    const [left, setLeft] = useState(existing?.paymentsLeft ? String(existing.paymentsLeft) : '12');
    const [remind, setRemind] = useState(existing?.remind ?? true);

    useEffect(() => {
        if (!foundMessageId || existing) return;
        database.get<UnparsedMessage>('unparsed_messages').find(foundMessageId).then((m) => {
            const f = readMandate({ id: m.id, body: m.body, timestamp: m.timestamp });
            if (!f) return;
            setKind('subscription');
            setName(f.name);
            setAmount(String(f.amount));
            setCycle(f.cycle);
            setVia(f.via);
            const acc = activeAccounts.find((a) => a.last4 && a.last4 === f.last4);
            if (acc) setFrom(acc.id);
        }).catch(() => undefined);
    }, [foundMessageId]);

    const n = parseFloat(amount.replace(/[^0-9.]/g, ''));
    const valid = name.trim().length > 0 && Number.isFinite(n) && n > 0 && Number(day) >= 1 && Number(day) <= 31;

    const save = async () => {
        const pair = getCategoryColors(KIND_PALETTE[kind] === 'fun' ? 'entertainment' : 'bills');
        const fields = {
            name: name.trim(),
            totalAmount: n,
            myShare: existing?.isSplit ? existing.myShare : n,
            dueDate: Math.min(31, Math.max(1, Number(day))),
            billingCycle: cycle,
            paymentSourceId: from,
            kind,
            via,
            amountVaries: varies,
            mandateLimit: limit ? Number(limit.replace(/[^0-9]/g, '')) : undefined,
            paymentsLeft: ends === 'count' ? Number(left) || undefined : undefined,
            remind,
            payeeMatch: name.trim().toLowerCase().split(' ')[0],
            foundInSms: !!foundMessageId || existing?.foundInSms,
        };
        if (existing) {
            await updateSubscription(existing.id, fields);
            toast.show({ message: `${fields.name} updated`, icon: 'check' });
            closeScreen();
        } else {
            const newId = await addSubscription({
                ...fields,
                icon: KIND_ICON[kind],
                iconColor: pair.bg,
                category: kind === 'subscription' ? 'entertainment' : kind === 'sip' ? 'transfer' : 'utilities',
                role: 'admin',
                isSplit: false,
                splitMembers: [],
                paymentMode: 'default',
                startDate: Date.now(),
            });
            // Past debits to the same payee become this plan's payments (not "Other" spends).
            if (newId && linkPast) {
                for (const t of pastDebitsFor(fields.name, n, activeTransactions)) {
                    await editTransaction(t.id, { planId: newId, category: kind === 'subscription' ? 'entertainment' : t.category });
                }
            }
            toast.show({ message: `${fields.name} added. Its bank debits link to this plan.`, icon: 'event-repeat' });
            if (foundMessageId) replaceScreen({ name: 'due' });
            else closeScreen();
        }
    };

    return (
        <Frame title={existing ? `Edit ${existing.name}` : 'Add a payment plan'} big bottom={<Button label="Save plan" icon="check" onPress={save} disabled={!valid} />}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
                {(Object.keys(KIND_LABEL) as PlanKind[]).map((k) => (
                    <Chip key={k} label={KIND_LABEL[k]} icon={KIND_ICON[k]} selected={kind === k} tone={kind === k ? 'night' : 'surface'} onPress={() => setKind(k)} />
                ))}
            </ScrollView>

            <Field label="NAME">
                <TextInput value={name} onChangeText={setName} placeholder={kind === 'sip' ? 'Parag Parikh Flexi Cap' : kind === 'emi' ? 'Bike EMI' : 'Netflix'} style={styles.input} accessibilityLabel="Name" />
            </Field>

            <Field label="AMOUNT">
                <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="₹5,000" style={styles.input} accessibilityLabel="Amount in rupees" />
                <Segmented label="Amount fixed or varies" tone="sunk" options={[{ value: 'fixed', label: 'Fixed amount' }, { value: 'varies', label: 'Varies' }]} value={varies ? 'varies' : 'fixed'} onChange={(v) => setVaries(v === 'varies')} />
            </Field>

            <Field label="REPEATS">
                <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
                    <Segmented label="Repeats" tone="sunk" style={{ flex: 1.4 }} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} value={cycle} onChange={setCycle} />
                    <Text style={frameStyles.muted}>on the</Text>
                    <TextInput value={day} onChangeText={(t) => setDay(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" style={[styles.input, { width: 64, textAlign: 'center' }]} accessibilityLabel="Day of month" />
                </View>
            </Field>

            <Field label="PAID FROM">
                <View style={styles.chips}>
                    {banks.map((a) => (
                        <Chip key={a.id} label={`${a.name}${a.last4 ? ` ··${a.last4}` : ''}`} selected={from === a.id} tone={from === a.id ? 'night' : 'surface'} onPress={() => setFrom(a.id)} />
                    ))}
                </View>
            </Field>

            <Field label="HOW">
                <View style={styles.chips}>
                    {(Object.keys(VIA_LABEL) as PlanVia[]).map((v) => (
                        <Chip key={v} label={VIA_LABEL[v]} selected={via === v} tone={via === v ? 'night' : 'surface'} onPress={() => setVia(v)} />
                    ))}
                </View>
                {(via === 'nach' || via === 'upi_autopay') && (
                    <TextInput value={limit} onChangeText={setLimit} keyboardType="number-pad" placeholder="Mandate limit, e.g. ₹10,000 (optional)" style={styles.input} accessibilityLabel="Mandate limit" />
                )}
            </Field>

            <Field label="ENDS">
                <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
                    <Segmented label="Ends" tone="sunk" style={{ flex: 1 }} options={[{ value: 'never', label: 'Never' }, { value: 'count', label: 'After N' }]} value={ends} onChange={setEnds} />
                    {ends === 'count' && (
                        <TextInput value={left} onChangeText={(t) => setLeft(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={[styles.input, { width: 72, textAlign: 'center' }]} accessibilityLabel="Payments left" />
                    )}
                </View>
            </Field>

            <View style={styles.switch}>
                <Text style={[frameStyles.body, { flex: 1, fontWeight: '700' }]}>Remind me 1 day before · check balance</Text>
                <Toggle label="Remind me 1 day before" value={remind} onValueChange={setRemind} />
            </View>
            <Text style={frameStyles.muted}>Sikka links the bank SMS for each debit to this plan, so it is not counted twice as a new expense.</Text>
        </Frame>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={{ gap: SPACING.sm }}>
            <Text style={frameStyles.over}>{label}</Text>
            {children}
        </View>
    );
}

// ─── Plan detail ──────────────────────────────────────────────────────
export function PlanDetailScreen({ id }: { id: string }) {
    const { openScreen, selectSubscription } = useNavigation();
    const { subscriptions } = useSubscriptions();
    const { formatAmount } = useCurrency();
    const { accounts, txs, next, shorts, msgs } = usePlanData();
    const plan = subscriptions.find((s) => s.id === id);
    if (!plan) return <Frame title="Plan"><Text>This plan was removed.</Text></Frame>;
    const acc = accounts.find((a) => a.id === plan.paymentSourceId);
    const linked = txs.filter((t) => t.planId === plan.id).sort((a, b) => b.timestamp - a.timestamp);
    const putIn = linked.reduce((s, t) => s + Math.abs(t.amount), 0);
    const due = nextDue(plan);
    const short = acc && shorts[acc.id] && next.some((u) => u.plan?.id === plan.id) ? shorts[acc.id] : null;
    const failed = findIssues([plan], txs, msgs, accounts).filter((i) => i.kind === 'failed');
    const status = plan.stoppedAt ? 'Stopped' : plan.pausedUntil && plan.pausedUntil > Date.now() ? `Paused till ${d(plan.pausedUntil)}` : plan.status === 'paused' ? 'Paused' : 'Active';

    return (
        <Frame title={plan.name} right={<Chip label="Edit" tone="surface" onPress={() => openScreen({ name: 'planEdit', id: plan.id })} />}>
            <View style={[styles.detailHero, { backgroundColor: CATEGORY_PALETTE[KIND_PALETTE[plan.kind ?? 'subscription']].bg }]}>
                <View style={styles.detailTop}>
                    <Chip label={KIND_LABEL[plan.kind ?? 'subscription']} tone="night" />
                    <Text style={styles.status}>{status}</Text>
                </View>
                <Text style={styles.detailName}>{plan.name}</Text>
                <Text style={styles.detailSub}>{formatAmount(plan.amount, true)} · {plan.billingCycle} on the {plan.dueDate}{plan.amountVaries ? ' · varies' : ''}</Text>
            </View>

            <View style={styles.stats3}>
                <Stat label={plan.kind === 'sip' ? 'PUT IN' : 'PAID'} value={formatAmount(putIn, true)} />
                <Stat label="PAYMENTS" value={plan.paymentsLeft ? `${linked.length} · ${plan.paymentsLeft} left` : String(linked.length)} />
                <Stat label="NEXT" value={due ? d(due.date) : '—'} />
            </View>
            {plan.kind === 'sip' && <Text style={frameStyles.muted}>Sikka counts what you put in, not market value.</Text>}

            <View style={styles.fromCard}>
                <Icon name="account-balance" size={22} color={COLORS.text} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.groupTitle}>{acc ? `${acc.name}${acc.last4 ? ` ··${acc.last4}` : ''}` : 'No account set'}</Text>
                    <Text style={frameStyles.muted}>{plan.via ? VIA_LABEL[plan.via] : 'How it is paid not set'}{plan.mandateLimit ? ` · limit ${formatAmount(plan.mandateLimit, true)}` : ''}{plan.endDate ? ` · till ${d(plan.endDate)}` : ' · till cancelled'}</Text>
                </View>
                {short && <View style={styles.shortChip}><Text style={styles.shortText}>Short {formatAmount(short.short, true)}</Text></View>}
            </View>

            <View style={styles.actions4}>
                <Action icon="pause" label="Pause" onPress={() => openScreen({ name: 'planChange', id: plan.id })} />
                <Action icon="tune" label="Change" onPress={() => openScreen({ name: 'planEdit', id: plan.id })} />
                {plan.kind === 'subscription' ? (
                    <Action icon="group" label="Split" onPress={() => selectSubscription(plan)} />
                ) : (
                    <Action icon="account-balance" label="Account" onPress={() => openScreen({ name: 'planEdit', id: plan.id })} />
                )}
                <Action icon="block" label="Stop" danger onPress={() => openScreen({ name: 'planChange', id: plan.id })} />
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>HISTORY</Text>
                {due && (
                    <HistoryRow date={d(due.date)} title="Next" sub={short ? `${acc?.name} balance is low` : due.moved ? `Moves to ${due.date.toLocaleDateString('en-IN', { weekday: 'long' })}` : 'Scheduled'} amount={formatAmount(plan.amount, true)} tone={short ? 'warn' : 'next'} />
                )}
                {failed.map((f, i) => <HistoryRow key={`f${i}`} date={f.at ? d(f.at) : ''} title="Missed" sub={f.text.split('.')[0]} amount={formatAmount(0, true)} tone="bad" />)}
                {linked.map((t) => (
                    <HistoryRow key={t.id} date={d(t.timestamp)} title={t.smsBody ? 'Paid' : 'Paid by hand'} sub={t.smsBody ? `Matched SMS · ${t.smsSender ?? 'bank'}` : 'You paid it yourself, marked in Sikka'} amount={formatAmount(Math.abs(t.amount), true)} tone="ok" />
                ))}
                {!linked.length && !due && <Text style={frameStyles.muted}>No payments yet.</Text>}
            </View>
        </Frame>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.stat}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        </View>
    );
}

function Action({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
    return (
        <TouchableOpacity style={styles.action} onPress={onPress} accessibilityRole="button" activeOpacity={0.85}>
            <Icon name={icon} size={22} color={danger ? COLORS.error : COLORS.text} />
            <Text style={[styles.actionText, danger && { color: COLORS.error }]}>{label}</Text>
        </TouchableOpacity>
    );
}

function HistoryRow({ date, title, sub, amount, tone }: { date: string; title: string; sub: string; amount: string; tone: 'ok' | 'bad' | 'next' | 'warn' }) {
    const color = tone === 'ok' ? COLORS.primary : tone === 'bad' ? COLORS.error : tone === 'warn' ? COLORS.warning : COLORS.textSecondary;
    return (
        <View style={styles.history}>
            <Text style={styles.historyDate}>{date}</Text>
            <View style={{ flex: 1 }}>
                <Text style={[styles.historyTitle, { color }]}>{title}</Text>
                <Text style={frameStyles.muted} numberOfLines={2}>{sub}</Text>
            </View>
            <Text style={styles.historyAmount}>{amount}</Text>
        </View>
    );
}

// ─── Pause or change ──────────────────────────────────────────────────
export function PlanChangeScreen({ id }: { id: string }) {
    const { closeScreen } = useNavigation();
    const { subscriptions, updateSubscription, archiveSubscription } = useSubscriptions();
    const { accounts, next, shorts } = usePlanData();
    const { formatAmount } = useCurrency();
    const toast = useToast();
    const plan = subscriptions.find((s) => s.id === id);
    const [mode, setMode] = useState<'pause' | 'stop'>('pause');
    const [months, setMonths] = useState(1);
    const [confirmedInApp, setConfirmedInApp] = useState(false);
    const [stopConfirm, setStopConfirm] = useState(false);
    if (!plan) return <Frame title="Pause or change"><View /></Frame>;
    const acc = accounts.find((a) => a.id === plan.paymentSourceId);
    const bank = acc ? bankName(acc.smsSender) || acc.name.split(' ')[0] : '';
    const app = BANK_APPS[bank];
    const due = nextDue(plan);
    const skipped: Date[] = [];
    if (due) for (let i = 0; i < months; i++) skipped.push(new Date(due.scheduled.getFullYear(), due.scheduled.getMonth() + i, due.scheduled.getDate()));
    const resume = due ? new Date(due.scheduled.getFullYear(), due.scheduled.getMonth() + months, due.scheduled.getDate()) : null;
    const short = acc && shorts[acc.id] && next.some((u) => u.plan?.id === plan.id) ? shorts[acc.id] : null;

    const openBank = async () => {
        const target = app?.url;
        if (target && (await Linking.canOpenURL(target).catch(() => false))) Linking.openURL(target);
        else if (app?.store) Linking.openURL(app.store);
    };

    const pause = async () => {
        if (!resume) return;
        await updateSubscription(plan.id, { pausedUntil: resume.getTime() - DAY });
        toast.show({ message: `${plan.name} paused till ${d(resume)}`, icon: 'pause' });
        closeScreen();
    };
    const stop = async () => {
        setStopConfirm(false);
        await updateSubscription(plan.id, { stoppedAt: Date.now() });
        await archiveSubscription(plan.id);
        toast.show({ message: `${plan.name} stopped. If the bank still debits it, Sikka will flag it.` });
        closeScreen();
    };

    return (
        <Frame
            title="Pause or change"
            bottom={
                mode === 'pause'
                    ? <Button label={`Pause ${months} ${months === 1 ? 'month' : 'months'}`} icon="pause" onPress={pause} disabled={!confirmedInApp} />
                    : <Button label={`Stop ${plan.name}`} icon="block" onPress={() => setStopConfirm(true)} disabled={!confirmedInApp} />
            }
        >
            <View style={styles.fromCard}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.groupTitle}>{plan.name}</Text>
                    <Text style={frameStyles.muted}>{formatAmount(plan.amount, true)} · {plan.dueDate} of every month{acc ? ` · ${acc.name}${acc.last4 ? ` ··${acc.last4}` : ''}` : ''}</Text>
                </View>
            </View>
            <Segmented label="Pause or stop" options={[{ value: 'pause', label: 'Pause' }, { value: 'stop', label: 'Stop' }]} value={mode} onChange={setMode} />

            {mode === 'pause' && (
                <View style={{ gap: SPACING.sm }}>
                    <Text style={frameStyles.over}>PAUSE FOR</Text>
                    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                        {[1, 2, 3].map((m) => (
                            <TouchableOpacity key={m} onPress={() => setMonths(m)} accessibilityRole="radio" accessibilityState={{ checked: months === m }} style={[styles.month, months === m && styles.monthOn]}>
                                <Text style={[styles.monthN, months === m && { color: COLORS.onNight }]}>{m}</Text>
                                <Text style={[frameStyles.muted, months === m && { color: '#D9D3C7' }]}>{m === 1 ? 'month' : 'months'}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {skipped.length > 0 && resume && (
                        <View style={styles.fromCard}>
                            <View style={{ flex: 1, gap: 4 }}>
                                <Text style={frameStyles.body}><Text style={{ fontWeight: '800' }}>Skip</Text> {skipped.map(d).join(' · ')}</Text>
                                <Text style={frameStyles.body}><Text style={{ fontWeight: '800' }}>Resume</Text> {d(resume)} · {formatAmount(plan.amount, true)}</Text>
                                {short && <Text style={[frameStyles.muted, { color: COLORS.primary, fontWeight: '700' }]}>Fixes the "short by {formatAmount(short.short, true)}" warning for {d(short.by)}.</Text>}
                            </View>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.bankNote}>
                <Text style={styles.groupTitle}>Sikka only keeps the record.</Text>
                <Text style={frameStyles.body}>
                    Also {mode === 'pause' ? 'pause' : 'cancel'} it in your {plan.kind === 'sip' ? 'fund or bank' : 'bank or UPI'} app, or the mandate will still debit.
                </Text>
                <Button label={`Open ${app?.name ?? bank ?? 'bank'} app ↗`} variant="soft" icon={null} onPress={openBank} />
                <TouchableOpacity style={styles.checkRow} onPress={() => setConfirmedInApp(!confirmedInApp)} accessibilityRole="checkbox" accessibilityState={{ checked: confirmedInApp }}>
                    <View style={[styles.check, confirmedInApp && styles.checkOn]}>{confirmedInApp && <Icon name="check" size={16} color={COLORS.brand} />}</View>
                    <Text style={[frameStyles.body, { fontWeight: '700' }]}>I've {mode === 'pause' ? 'paused' : 'cancelled'} it in the app</Text>
                </TouchableOpacity>
            </View>

            <ConfirmSheet
                visible={stopConfirm}
                destructive
                title={`Stop ${plan.name}?`}
                body="It leaves your monthly total. Past payments stay. If the bank debits it again, Sikka shows it in Needs attention."
                confirmLabel="Stop plan"
                onConfirm={stop}
                onCancel={() => setStopConfirm(false)}
            />
        </Frame>
    );
}

// ─── Coming up ────────────────────────────────────────────────────────
export function DueScreen() {
    const { openScreen, selectAccount } = useNavigation();
    const { formatAmount } = useCurrency();
    const { accounts, next, shorts, msgs, live } = usePlanData();
    const total = next.reduce((s, u) => s + u.amount, 0);
    const preDebit = msgs.filter((m) => looksLikePreDebit(m.body) && m.timestamp > Date.now() - 2 * DAY).sort((a, b) => b.timestamp - a.timestamp)[0];
    const shortList = Object.entries(shorts);

    return (
        <Frame title="Coming up" big>
            {preDebit && (
                <View style={styles.preDebit}>
                    <Text style={styles.preOver}>SIKKA · FROM A PRE-DEBIT SMS</Text>
                    <Text style={styles.groupTitle}>{preDebit.body.slice(0, 120)}</Text>
                </View>
            )}

            {shortList.map(([accId, s]) => {
                const acc = accounts.find((a) => a.id === accId);
                const sip = live.find((p) => p.paymentSourceId === accId && p.kind === 'sip');
                return (
                    <View key={accId} style={styles.shortCard}>
                        <View style={styles.detailTop}>
                            <Text style={styles.groupTitle}>{acc?.name}{acc?.last4 ? ` ··${acc.last4}` : ''} · till {d(s.by)}</Text>
                            <View style={styles.shortChip}><Text style={styles.shortText}>Short {formatAmount(s.short, true)}</Text></View>
                        </View>
                        <Text style={frameStyles.body}>Balance {formatAmount(s.balance, true)} · Due {formatAmount(s.due, true)}</Text>
                        <View style={styles.chips}>
                            {sip && <Chip label="Skip SIP this month" tone="surface" onPress={() => openScreen({ name: 'planChange', id: sip.id })} />}
                            {acc && <Chip label="Open account" tone="night" onPress={() => selectAccount(acc)} />}
                        </View>
                    </View>
                );
            })}

            <Text style={frameStyles.over}>NEXT 14 DAYS · {formatAmount(total, true)}</Text>
            {next.length === 0 && <Text style={frameStyles.muted}>Nothing due in the next 14 days.</Text>}
            {next.map((u, i) => (
                <DueRow key={i} u={u} accounts={accounts} shorts={shorts} formatAmount={formatAmount} onPress={() => (u.plan ? openScreen({ name: 'plan', id: u.plan.id }) : u.card && selectAccount(u.card))} />
            ))}
            {next.some((u) => u.card) && <Text style={frameStyles.muted}>Card autopay is counted at the bill amount, not the limit.</Text>}
        </Frame>
    );
}

// ─── Needs attention ──────────────────────────────────────────────────
export function IssuesScreen() {
    const { openScreen } = useNavigation();
    const { updateSubscription } = useSubscriptions();
    const { formatAmount } = useCurrency();
    const toast = useToast();
    const { issues } = usePlanData();
    const [done, setDone] = useState<Set<string>>(new Set());
    const shown = issues.filter((i) => !done.has(`${i.kind}|${i.plan.id}`));
    const resolve = (i: Issue, msg?: string) => {
        setDone((s) => new Set(s).add(`${i.kind}|${i.plan.id}`));
        if (msg) toast.show({ message: msg });
    };
    const LABEL: Record<Issue['kind'], { tag: string; palette: keyof typeof CATEGORY_PALETTE }> = {
        failed: { tag: 'Failed', palette: 'shopping' },
        price: { tag: 'Price up', palette: 'bills' },
        afterStop: { tag: 'After stop', palette: 'dining' },
        ending: { tag: 'Ending', palette: 'groceries' },
    };

    return (
        <Frame title="Needs attention" big>
            {shown.length === 0 && (
                <View style={styles.empty}>
                    <Icon name="check-circle" size={36} color={COLORS.primary} />
                    <Text style={frameStyles.body}>Nothing needs attention. Every plan was paid as expected.</Text>
                </View>
            )}
            {shown.map((i) => {
                const pair = CATEGORY_PALETTE[LABEL[i.kind].palette];
                return (
                    <View key={`${i.kind}|${i.plan.id}`} style={styles.issue}>
                        <View style={styles.detailTop}>
                            <Text style={styles.groupTitle} numberOfLines={1}>
                                {i.plan.name} · {i.kind === 'price' ? `${formatAmount(i.plan.amount, true)} → ${formatAmount(i.amount ?? 0, true)}` : i.kind === 'afterStop' ? `${formatAmount(i.amount ?? 0, true)} charged` : formatAmount(i.plan.amount, true)}
                            </Text>
                            <View style={[styles.tag, { backgroundColor: pair.bg }]}><Text style={[styles.tagText, { color: pair.fg }]}>{LABEL[i.kind].tag}</Text></View>
                        </View>
                        <Text style={frameStyles.body}>{i.text}</Text>
                        <View style={styles.chips}>
                            {i.kind === 'failed' && (
                                <>
                                    <Chip label="Mark paid" tone="night" onPress={() => resolve(i, 'Marked paid')} />
                                    <Chip label="Skip month" tone="surface" onPress={() => openScreen({ name: 'planChange', id: i.plan.id })} />
                                </>
                            )}
                            {i.kind === 'price' && (
                                <>
                                    <Chip label={`Use ${formatAmount(i.amount ?? 0, true)}`} tone="night" onPress={async () => { await updateSubscription(i.plan.id, { totalAmount: i.amount!, myShare: i.amount! }); resolve(i, `${i.plan.name} now ${formatAmount(i.amount ?? 0, true)}`); }} />
                                    <Chip label={`Keep ${formatAmount(i.plan.amount, true)}`} tone="surface" onPress={() => resolve(i)} />
                                </>
                            )}
                            {i.kind === 'afterStop' && (
                                <>
                                    <Chip label="How to revoke" tone="night" onPress={() => openScreen({ name: 'planChange', id: i.plan.id })} />
                                    <Chip label="It's fine" tone="surface" onPress={() => resolve(i)} />
                                </>
                            )}
                            {i.kind === 'ending' && <Chip label="Okay" tone="night" onPress={() => resolve(i)} />}
                        </View>
                    </View>
                );
            })}
        </Frame>
    );
}

// ─── AI found an autopay ──────────────────────────────────────────────
export function PlanFoundScreen({ messageId }: { messageId: string }) {
    const { replaceScreen, closeScreen } = useNavigation();
    const { activeAccounts } = useAccounts();
    const { activeTransactions } = useTransactions();
    const { formatAmount } = useCurrency();
    const [found, setFound] = useState<FoundMandate | null>(null);
    useEffect(() => {
        database.get<UnparsedMessage>('unparsed_messages').find(messageId).then((m) => setFound(readMandate({ id: m.id, body: m.body, timestamp: m.timestamp }))).catch(() => setFound(null));
    }, [messageId]);
    const past = useMemo(() => (found ? pastDebitsFor(found.name, found.amount, activeTransactions) : []), [found, activeTransactions]);
    const [linkPast, setLinkPast] = useState(true);
    if (!found) return <Frame title="New autopay found"><Text style={frameStyles.muted}>Reading the SMS…</Text></Frame>;
    const acc = activeAccounts.find((a) => a.last4 && a.last4 === found.last4);

    const add = async () => {
        replaceScreen({ name: 'planEdit', foundMessageId: messageId, kind: 'subscription', linkPast: linkPast && past.length > 0 });
    };
    const notIt = async () => {
        await ignoreSms(messageId);
        closeScreen();
    };

    return (
        <Frame
            title="New autopay found"
            big
            sub="The AI read this in your SMS."
            bottom={
                <>
                    <Button label="Add to Assets" icon="add" onPress={add} />
                    <Button label="Not a subscription" variant="soft" icon={null} onPress={notIt} />
                </>
            }
        >
            <View style={styles.smsCard}><Text style={frameStyles.body}>{found.body}</Text></View>
            <View style={styles.foundCard}>
                <Line k="NAME" v={found.name} />
                <Line k="TYPE" v="Subscription" />
                <Line k="AMOUNT" v={`${formatAmount(found.amount, true)} · ${found.cycle}`} />
                <Line k="FROM" v={acc ? `${acc.name} ··${acc.last4}` : found.last4 ? `A/c ··${found.last4}` : '—'} />
                <Line k="HOW" v={VIA_LABEL[found.via]} />
            </View>
            {past.length > 0 && (
                <View style={styles.switch}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.groupTitle}>Link {past.length} past {past.length === 1 ? 'debit' : 'debits'}</Text>
                        <Text style={frameStyles.muted}>{past.slice(0, 3).map((t) => d(t.timestamp)).join(' and ')} · {formatAmount(found.amount, true)} each · they move out of "Other"</Text>
                    </View>
                    <Toggle label="Link past debits" value={linkPast} onValueChange={setLinkPast} />
                </View>
            )}
        </Frame>
    );
}

function Line({ k, v }: { k: string; v: string }) {
    return (
        <View style={styles.line}>
            <Text style={styles.lineK}>{k}</Text>
            <Text style={styles.lineV}>{v}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 140, gap: SPACING.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, color: COLORS.text },
    add: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.night, borderRadius: 22, height: 44, paddingHorizontal: 16 },
    addText: { fontSize: 15, fontWeight: '800', color: COLORS.onNight },
    hero: { backgroundColor: COLORS.brand, borderRadius: 30, padding: SPACING.lg, gap: SPACING.sm },
    heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroOver: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: CATEGORY_PALETTE.groceries.fg },
    heroAdd: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, paddingHorizontal: 12, height: 32, justifyContent: 'center' },
    heroAddText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
    heroValue: { fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1, color: COLORS.onBrand },
    accLine: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 16, paddingHorizontal: 10, minHeight: 48 },
    accIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    accName: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
    accNote: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
    accValue: { fontSize: 16, fontWeight: '800', color: COLORS.text, minWidth: 80, textAlign: 'right' },
    goes: { backgroundColor: COLORS.surface, borderRadius: 30, padding: SPACING.lg, gap: SPACING.sm, ...SHADOWS.sm },
    goesValue: { fontSize: 34, fontWeight: '800', color: COLORS.text, letterSpacing: -0.8 },
    attention: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.errorMuted, borderRadius: 16, paddingHorizontal: 12, minHeight: 44 },
    attentionText: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.error },
    group: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: 20, padding: 12 },
    groupIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    groupTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    groupSub: { fontSize: 13, fontWeight: '700' },
    groupValue: { fontSize: 17, fontWeight: '800', color: COLORS.text },
    rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    h2: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    seeAll: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
    due: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 22, padding: 12, ...SHADOWS.sm },
    dueDate: { width: 58, height: 52, borderRadius: 16, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
    dueDay: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary },
    dueNum: { fontSize: 13, fontWeight: '800', color: COLORS.text },
    dueName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    dueSub: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    dueAmount: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    found: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: CATEGORY_PALETTE.fun.bg, borderRadius: 24, padding: SPACING.lg },
    foundIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: SIKKA.lime, alignItems: 'center', justifyContent: 'center' },

    input: { height: 52, borderRadius: 18, backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, fontSize: 17, fontWeight: '800', color: COLORS.text, ...SHADOWS.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    switch: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 22, padding: SPACING.lg },

    detailHero: { borderRadius: 30, padding: SPACING.xl, gap: 4 },
    detailTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
    status: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    detailName: { fontSize: 26, lineHeight: 30, fontWeight: '800', color: COLORS.text, marginTop: SPACING.sm },
    detailSub: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    stats3: { flexDirection: 'row', gap: SPACING.sm },
    stat: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, padding: 12, gap: 2, ...SHADOWS.sm },
    statLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
    statValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    fromCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 22, padding: SPACING.lg, ...SHADOWS.sm },
    shortChip: { backgroundColor: COLORS.errorMuted, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    shortText: { fontSize: 13, fontWeight: '800', color: COLORS.error },
    actions4: { flexDirection: 'row', gap: SPACING.sm },
    action: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, paddingVertical: 12, alignItems: 'center', gap: 4, ...SHADOWS.sm },
    actionText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
    history: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 18, padding: 12 },
    historyDate: { width: 52, fontSize: 13, fontWeight: '800', color: COLORS.textSecondary },
    historyTitle: { fontSize: 15, fontWeight: '800' },
    historyAmount: { fontSize: 15, fontWeight: '800', color: COLORS.text },

    month: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, paddingVertical: 12, alignItems: 'center' },
    monthOn: { backgroundColor: COLORS.night },
    monthN: { fontSize: 26, fontWeight: '800', color: COLORS.text },
    bankNote: { backgroundColor: CATEGORY_PALETTE.bills.bg, borderRadius: 26, padding: SPACING.lg, gap: SPACING.md },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 44 },
    check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: COLORS.night, alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: COLORS.night },

    preDebit: { backgroundColor: COLORS.night, borderRadius: 24, padding: SPACING.lg, gap: 6 },
    preOver: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: COLORS.brand },
    shortCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.lg, gap: SPACING.sm, borderWidth: 2, borderColor: COLORS.errorMuted },

    empty: { alignItems: 'center', gap: SPACING.md, padding: SPACING.xl },
    issue: { backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.lg, gap: SPACING.sm, ...SHADOWS.sm },
    tag: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
    tagText: { fontSize: 12, fontWeight: '800' },

    smsCard: { backgroundColor: COLORS.surface, borderRadius: 22, padding: SPACING.lg, ...SHADOWS.sm },
    foundCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.lg, gap: SPACING.sm, ...SHADOWS.sm },
    line: { flexDirection: 'row', gap: SPACING.md },
    lineK: { width: 72, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
    lineV: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text },
});
