/**
 * Model refinement (canvas section 05): teach once, then Sikka files payments.
 *   Name this sender → Rule saved → (next SMS) Auto-filed alert → Fix a tag
 *   Sikku is learning (how sure before auto-filing) → Saved rules → Rule detail
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, TextInput } from '../../components/Typography';
import { Icon } from '../../components/Icon';
import { Button, Chip, Segmented, ConfirmSheet, useToast } from '../../components/ui';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getPaletteKey, getCategoryColors, SIKKA } from '../../constants/theme';
import { useNavigation } from '../../context/NavigationContext';
import { useTransactions, CATEGORY_LABELS } from '../../context/TransactionsContext';
import { useAccounts } from '../../context/AccountsContext';
import { useCurrency } from '../../context/CurrencyContext';
import { usePrefs, Sureness } from '../../context/PrefsContext';
import { useRules } from '../../hooks/useRules';
import { TransactionCategory, Transaction } from '../../types';
import { SPEND_CATEGORIES } from '../../components/AddTransactionModal';
import { saveRule, updateRule, deleteRule, applyRuleToPast, pastMatches, RuleData, toRuleData, getRule } from '../../services/sms/rules';
import { bankName, findLast4, findPayee, prettyName } from '../../services/sms/extract';
import { getActiveModel } from '../../services/sms/modelManager';
import { Frame, frameStyles } from './Frame';

const catLabel = (c: string) => CATEGORY_LABELS[c as TransactionCategory] ?? c;

/** The SMS with the parts Sikka uses highlighted (account, payee). */
function SmsHighlight({ body, marks }: { body: string; marks: string[] }) {
    const parts = useMemo(() => {
        const valid = marks.filter(Boolean).map((m) => m.toLowerCase());
        if (!valid.length) return [{ t: body, on: false }];
        const re = new RegExp(`(${valid.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
        return body.split(re).map((t) => ({ t, on: valid.includes(t.toLowerCase()) }));
    }, [body, marks]);
    return (
        <Text style={styles.sms}>
            {parts.map((p, i) => (
                <Text key={i} style={p.on ? styles.smsMark : undefined}>{p.t}</Text>
            ))}
        </Text>
    );
}

function CategoryChips({ value, onChange }: { value: string; onChange: (c: TransactionCategory) => void }) {
    return (
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Category">
            {SPEND_CATEGORIES.map((c) => (
                <Chip key={c} label={catLabel(c)} palette={getPaletteKey(c)} selected={value === c} onPress={() => onChange(c)} />
            ))}
        </View>
    );
}

// ─── Name this sender ─────────────────────────────────────────────────
export function NameSenderScreen({ txId }: { txId: string }) {
    const { replaceScreen } = useNavigation();
    const { transactions, editTransaction, approveTransaction } = useTransactions();
    const { activeAccounts } = useAccounts();
    const tx = transactions.find((t) => t.id === txId);
    const payee = tx?.payee ?? findPayee(tx?.smsBody ?? '', tx?.merchant);
    const last4 = tx?.smsBody ? findLast4(tx.smsBody) : undefined;
    const guess = prettyName(payee || tx?.merchant);
    const [name, setName] = useState(tx && tx.merchant !== 'UNKNOWN' ? prettyName(tx.merchant) : guess);
    const [accountId, setAccountId] = useState(tx?.accountId);
    const [category, setCategory] = useState<TransactionCategory>(tx?.category ?? 'other');
    const [mode, setMode] = useState<'auto' | 'ask'>('auto');
    const [saving, setSaving] = useState(false);

    if (!tx) return <Frame title="Name this sender"><Text>Payment not found.</Text></Frame>;
    const suggestions = Array.from(new Set([guess, prettyName(tx.merchant)])).filter((s) => s && s !== 'Unknown' && s !== name);

    const save = async () => {
        setSaving(true);
        try {
            const rule = await saveRule({ sender: tx.smsSender ?? 'UNKNOWN', payee: payee ?? name, name: name.trim(), category, accountId, mode });
            await editTransaction(tx.id, { merchant: name.trim(), category, accountId, ruleId: rule.id });
            await approveTransaction(tx.id);
            replaceScreen({ name: 'ruleSaved', ruleId: rule.id, txId: tx.id });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Frame
            title="Name this sender"
            big
            sub="Sikku will use this for every similar SMS."
            bottom={<Button label="Save rule" icon="check" onPress={save} disabled={!name.trim()} loading={saving} />}
        >
            {!!tx.smsBody && (
                <View style={styles.smsCard}>
                    <Text style={styles.smsFrom}>{tx.smsSender}</Text>
                    <SmsHighlight body={tx.smsBody} marks={[last4 ? `XX${last4}` : '', payee ?? '']} />
                </View>
            )}

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>CALL IT</Text>
                <TextInput value={name} onChangeText={setName} style={styles.input} accessibilityLabel="Call it" autoCapitalize="words" />
                {suggestions.length > 0 && (
                    <View style={styles.chips}>{suggestions.map((s) => <Chip key={s} label={s} tone="ground" onPress={() => setName(s)} />)}</View>
                )}
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>ACCOUNT{last4 ? ` · FOUND FROM XX${last4}` : ''}</Text>
                <View style={styles.chips}>
                    {activeAccounts.map((a) => (
                        <Chip key={a.id} label={`${a.name}${a.last4 ? ` ··${a.last4}` : ''}`} selected={accountId === a.id} tone={accountId === a.id ? 'night' : 'surface'} onPress={() => setAccountId(a.id)} />
                    ))}
                </View>
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>CATEGORY</Text>
                <CategoryChips value={category} onChange={setCategory} />
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>NEXT TIME A SIMILAR SMS COMES</Text>
                <Segmented
                    label="Next time a similar SMS comes"
                    options={[
                        { value: 'auto', label: 'Auto-file' },
                        { value: 'ask', label: 'Ask me' },
                    ]}
                    value={mode}
                    onChange={setMode}
                />
                <Text style={frameStyles.muted}>
                    {mode === 'auto' ? 'Filed straight away, no review. You get an alert you can change.' : 'Named for you, but it still waits in Review.'}
                </Text>
            </View>
        </Frame>
    );
}

// ─── Rule saved ───────────────────────────────────────────────────────
export function RuleSavedScreen({ ruleId, txId }: { ruleId: string; txId?: string }) {
    const { closeScreen } = useNavigation();
    const { transactions, reopenTransaction, refreshTransactions } = useTransactions();
    const { getAccount } = useAccounts();
    const toast = useToast();
    const [rule, setRule] = useState<RuleData | null>(null);
    const [older, setOlder] = useState<number>(0);
    const [tagging, setTagging] = useState(false);
    const left = transactions.filter((t) => t.status === 'pending' && !t.isDeleted).length;

    useEffect(() => {
        getRule(ruleId).then(async (r) => {
            if (!r) return;
            const data = toRuleData(r);
            setRule(data);
            setOlder((await pastMatches(data, txId)).filter((t) => t.ruleId !== ruleId).length);
        });
    }, [ruleId, txId]);

    if (!rule) return <Frame title="Rule saved"><View /></Frame>;
    const account = rule.accountId ? getAccount(rule.accountId) : undefined;

    const undo = async () => {
        await deleteRule(rule.id);
        if (txId) await reopenTransaction(txId);
        closeScreen();
        toast.show({ message: `Rule for ${rule.name} removed. The payment is back in Review.` });
    };

    const tagOlder = async () => {
        setTagging(true);
        const n = await applyRuleToPast(rule, txId);
        await refreshTransactions();
        setTagging(false);
        setOlder(0);
        toast.show({ message: `${n} older ${rule.name} ${n === 1 ? 'payment' : 'payments'} tagged`, icon: 'done-all' });
    };

    return (
        <Frame
            title=""
            right={
                <TouchableOpacity onPress={undo} accessibilityRole="button" style={styles.pillBtn} hitSlop={8}>
                    <Text style={styles.pillBtnText}>Undo</Text>
                </TouchableOpacity>
            }
            bottom={<Button label={left ? `Next payment · ${left} left` : 'Done'} onPress={closeScreen} />}
        >
            <View style={styles.saved}>
                <View style={styles.savedIcon}><Icon name="school" size={30} color={COLORS.onBrand} /></View>
                <Text style={styles.savedTitle} accessibilityRole="header">Got it. {rule.name}{'\n'}is learned.</Text>
                <Text style={frameStyles.muted}>
                    {rule.mode === 'auto' ? `Next ${rule.name} SMS will be filed for you. It skips Review.` : `Next ${rule.name} SMS will be named for you and wait in Review.`}
                </Text>
            </View>

            <View style={styles.ruleCard}>
                <Text style={frameStyles.over}>THE RULE</Text>
                <RuleLine k="IF" v={`SMS from ${bankName(rule.sender)}`} />
                <RuleLine k="AND" v={`money goes to ${rule.payeeMatch}…`} />
                {account?.last4 && <RuleLine k="FROM" v={`A/c ··${account.last4}`} />}
                <View style={styles.arrow}><Icon name="south" size={20} color={COLORS.textSecondary} /></View>
                <View style={styles.chips}>
                    <Chip label={rule.name} tone="night" />
                    {account && <Chip label={account.name} palette="transport" />}
                    <Chip label={catLabel(rule.category)} palette={getPaletteKey(rule.category)} />
                    <Chip label={rule.mode === 'auto' ? 'Auto-file' : 'Ask me'} palette="groceries" />
                </View>
            </View>

            {older > 0 && (
                <View style={styles.older}>
                    <Text style={styles.olderNum}>{older}</Text>
                    <Text style={[frameStyles.body, { flex: 1 }]}>older {rule.name} {older === 1 ? 'payment matches' : 'payments match'} too. Tag them the same way?</Text>
                    <Chip label={tagging ? 'Tagging…' : `Tag ${older}`} tone="night" onPress={tagging ? undefined : tagOlder} />
                </View>
            )}
        </Frame>
    );
}

function RuleLine({ k, v }: { k: string; v: string }) {
    return (
        <View style={styles.ruleLine}>
            <Text style={styles.ruleKey}>{k}</Text>
            <Text style={styles.ruleVal}>{v}</Text>
        </View>
    );
}

// ─── Fix a tag ────────────────────────────────────────────────────────
type FixScope = 'one' | 'rule' | 'all';

export function FixTagScreen({ txId }: { txId: string }) {
    const { closeScreen } = useNavigation();
    const { transactions, editTransaction, refreshTransactions } = useTransactions();
    const { formatAmount } = useCurrency();
    const { prefs, update } = usePrefs();
    const toast = useToast();
    const tx = transactions.find((t) => t.id === txId);
    const [category, setCategory] = useState<TransactionCategory>(tx?.category ?? 'other');
    const [scope, setScope] = useState<FixScope>(tx?.ruleId ? 'rule' : 'one');
    const [rule, setRule] = useState<RuleData | null>(null);
    const [pastCount, setPastCount] = useState(0);
    const monthFixes = prefs.fixes.filter((t) => new Date(t).getMonth() === new Date().getMonth()).length;

    useEffect(() => {
        if (!tx?.ruleId) return;
        getRule(tx.ruleId).then(async (r) => {
            if (!r) return;
            const d = toRuleData(r);
            setRule(d);
            setPastCount((await pastMatches(d, tx.id)).length);
        });
    }, [tx?.ruleId, tx?.id]);

    if (!tx) return <Frame title="Fix a tag"><Text>Payment not found.</Text></Frame>;

    const save = async () => {
        await editTransaction(tx.id, { category });
        if (rule && scope !== 'one') {
            await updateRule(rule.id, { category });
            if (scope === 'all') await applyRuleToPast({ ...rule, category }, tx.id);
        }
        await refreshTransactions();
        update({ fixes: [...prefs.fixes, Date.now()].slice(-200) });
        toast.show({ message: `${tx.merchant} → ${catLabel(category)}`, icon: 'sell' });
        closeScreen();
    };

    const options: { value: FixScope; title: string; sub: string }[] = [
        { value: 'one', title: 'Only this payment', sub: rule ? 'The rule stays as it is' : 'Just this one' },
        ...(rule
            ? [
                { value: 'rule' as const, title: `${rule.name} from now on`, sub: `Updates the rule. Future SMS go to ${catLabel(category)}` },
                { value: 'all' as const, title: `All ${rule.name}, old and new`, sub: `Also re-tags ${pastCount} past ${pastCount === 1 ? 'payment' : 'payments'}` },
            ]
            : []),
    ];

    return (
        <Frame title="Fix this tag" big bottom={<Button label="Save fix" icon="check" onPress={save} />}>
            <View style={styles.txCard}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.txName}>{tx.merchant}</Text>
                    <Text style={frameStyles.muted}>
                        {new Date(tx.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                        {tx.autoFiled ? ' · auto-filed by rule' : ''}
                    </Text>
                </View>
                <Text style={styles.txAmount}>{formatAmount(Math.abs(tx.amount), true)}</Text>
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>CATEGORY</Text>
                <CategoryChips value={category} onChange={setCategory} />
            </View>

            <View style={{ gap: SPACING.sm }} accessibilityRole="radiogroup" accessibilityLabel="Apply this change to">
                <Text style={frameStyles.over}>APPLY THIS CHANGE TO</Text>
                {options.map((o) => {
                    const on = scope === o.value;
                    return (
                        <TouchableOpacity
                            key={o.value}
                            onPress={() => setScope(o.value)}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: on }}
                            style={[styles.option, on && styles.optionOn]}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>{o.title}</Text>
                                <Text style={frameStyles.muted}>{o.sub}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <Text style={frameStyles.muted}>Each fix teaches Sikku. {monthFixes + 1} {monthFixes ? 'fixes' : 'fix'} this month.</Text>
        </Frame>
    );
}

// ─── Sikku is learning ────────────────────────────────────────────────
export function ModelHealthScreen() {
    const { openScreen } = useNavigation();
    const { transactions } = useTransactions();
    const { prefs, update } = usePrefs();
    const rules = useRules();
    const [modelName, setModelName] = useState<string | null>(null);

    useEffect(() => {
        getActiveModel().then((m) => setModelName(m ? `${m.name} · on phone · ~${m.sizeMb} MB` : null)).catch(() => setModelName(null));
    }, []);

    const autoFiled = transactions.filter((t) => t.autoFiled && !t.isDeleted).length;
    const fixed = prefs.fixes.length;
    const right = autoFiled ? Math.max(0, Math.round(((autoFiled - fixed) / autoFiled) * 100)) : null;

    const SURE_COPY: Record<Sureness, string> = {
        more: 'Ask more: a rule files alone only after it was right 3 times. Everything else comes to review.',
        balanced: 'Balanced: only sure matches are filed alone; new senders and unsure ones come to review.',
        less: 'Ask less: rules file alone, and payees you approved before are named for you.',
    };

    return (
        <Frame title="Sikku is learning" big>
            <View style={styles.health}>
                <Text style={styles.healthOver}>FILED RIGHT</Text>
                <Text style={styles.healthValue}>{right === null ? '—' : `${right}%`}</Text>
                <Text style={styles.healthSub}>{right === null ? 'Name a sender in Review to start' : 'auto-filed payments you did not fix'}</Text>
            </View>
            <View style={styles.stats}>
                <Stat value={autoFiled} label="auto-filed" palette="groceries" />
                <Stat value={fixed} label="you fixed" palette="dining" />
                <Stat value={rules.length} label="rules" palette="transport" />
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>HOW SURE BEFORE AUTO-FILING?</Text>
                <Segmented
                    label="How sure before auto-filing?"
                    options={[
                        { value: 'more', label: 'Ask more' },
                        { value: 'balanced', label: 'Balanced' },
                        { value: 'less', label: 'Ask less' },
                    ]}
                    value={prefs.sureness}
                    onChange={(sureness) => update({ sureness })}
                />
                <Text style={frameStyles.muted}>{SURE_COPY[prefs.sureness]}</Text>
            </View>

            <LinkRow icon="rule" title="Saved rules" sub={`${rules.length} ${rules.length === 1 ? 'sender' : 'senders'} you named`} onPress={() => openScreen({ name: 'rules' })} />
            <LinkRow icon="memory" title="Reader model" sub={modelName ?? 'Built-in patterns only'} action="Change" onPress={() => openScreen({ name: 'modelPick' })} />
            <Text style={frameStyles.muted}>Learning happens on this phone. Your SMS and rules are never uploaded.</Text>
        </Frame>
    );
}

function Stat({ value, label, palette }: { value: number; label: string; palette: 'groceries' | 'dining' | 'transport' }) {
    const pair = CATEGORY_PALETTE[palette];
    return (
        <View style={[styles.stat, { backgroundColor: pair.bg }]}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={[styles.statLabel, { color: pair.fg }]}>{label}</Text>
        </View>
    );
}

export function LinkRow({ icon, title, sub, onPress, action }: { icon: any; title: string; sub?: string; onPress: () => void; action?: string }) {
    return (
        <TouchableOpacity style={styles.link} onPress={onPress} accessibilityRole="button" activeOpacity={0.85}>
            <View style={styles.linkIcon}><Icon name={icon} size={22} color={COLORS.text} /></View>
            <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>{title}</Text>
                {!!sub && <Text style={frameStyles.muted} numberOfLines={1}>{sub}</Text>}
            </View>
            {action ? <Text style={styles.linkAction}>{action}</Text> : <Icon name="chevron-right" size={22} color={COLORS.text} />}
        </TouchableOpacity>
    );
}

// ─── Saved rules ──────────────────────────────────────────────────────
export function SavedRulesScreen() {
    const { openScreen } = useNavigation();
    const { getAccount } = useAccounts();
    const rules = useRules();
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState<'all' | 'auto' | 'ask'>('all');
    const shown = rules.filter(
        (r) => (filter === 'all' || r.mode === filter) && (!q || `${r.name} ${r.payeeMatch} ${r.sender}`.toLowerCase().includes(q.toLowerCase())),
    );
    const autoN = rules.filter((r) => r.mode === 'auto').length;

    return (
        <Frame title="Saved rules" big>
            <TextInput value={q} onChangeText={setQ} placeholder="Search rules" style={styles.search} accessibilityLabel="Search rules" />
            <Segmented
                label="Filter rules"
                tone="sunk"
                options={[
                    { value: 'all', label: `All ${rules.length}` },
                    { value: 'auto', label: `Auto ${autoN}` },
                    { value: 'ask', label: `Ask me ${rules.length - autoN}` },
                ]}
                value={filter}
                onChange={setFilter}
            />
            {shown.length === 0 && (
                <View style={styles.empty}>
                    <Icon name="school" size={28} color={COLORS.textSecondary} />
                    <Text style={[frameStyles.muted, { textAlign: 'center' }]}>
                        {rules.length ? 'No rule matches that search.' : 'No rules yet. Rules are made when you name a sender in Review.'}
                    </Text>
                </View>
            )}
            {shown.map((r) => {
                const acc = r.accountId ? getAccount(r.accountId) : undefined;
                const pair = getCategoryColors(r.category);
                return (
                    <TouchableOpacity key={r.id} style={styles.ruleRow} onPress={() => openScreen({ name: 'rule', id: r.id })} accessibilityRole="button" activeOpacity={0.85}>
                        <View style={[styles.initials, { backgroundColor: pair.bg }]}><Text style={[styles.initialsText, { color: pair.fg }]}>{r.name.slice(0, 2).toUpperCase()}</Text></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.ruleName}>{r.name}</Text>
                            <Text style={frameStyles.muted} numberOfLines={1}>{acc ? `${acc.name}${acc.last4 ? ` ··${acc.last4}` : ''} · ` : ''}{catLabel(r.category)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                            <View style={[styles.mode, r.mode === 'auto' ? { backgroundColor: SIKKA.lime } : { backgroundColor: COLORS.surfaceSunk }]}>
                                <Text style={styles.modeText}>{r.mode === 'auto' ? 'Auto' : 'Ask'}</Text>
                            </View>
                            <Text style={styles.matches}>{r.matchCount} {r.matchCount === 1 ? 'match' : 'matches'}</Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
            {rules.length > 0 && <Text style={frameStyles.muted}>Rules are made when you name a sender in Review.</Text>}
        </Frame>
    );
}

// ─── Rule detail ──────────────────────────────────────────────────────
export function RuleDetailScreen({ id }: { id: string }) {
    const { closeScreen } = useNavigation();
    const { transactions } = useTransactions();
    const { getAccount } = useAccounts();
    const { formatAmount } = useCurrency();
    const toast = useToast();
    const rules = useRules();
    const rule = rules.find((r) => r.id === id);
    const [renaming, setRenaming] = useState(false);
    const [name, setName] = useState('');
    const [confirm, setConfirm] = useState(false);
    useEffect(() => { if (rule) setName(rule.name); }, [rule?.name]);

    if (!rule) return <Frame title="Rule"><View /></Frame>;
    const acc = rule.accountId ? getAccount(rule.accountId) : undefined;
    const matches: Transaction[] = transactions.filter((t) => t.ruleId === rule.id && !t.isDeleted).slice(0, 8);

    const remove = async () => {
        setConfirm(false);
        await deleteRule(rule.id);
        toast.show({ message: `${rule.name} rule deleted. New SMS go back to Review.` });
        closeScreen();
    };

    return (
        <Frame title={rule.name} big>
            <View style={styles.chips}>
                {acc && <Chip label={acc.name} palette="transport" />}
                <Chip label={catLabel(rule.category)} palette={getPaletteKey(rule.category)} />
                <Chip label="Rename" icon="edit" tone="ground" onPress={() => setRenaming(true)} />
            </View>
            {renaming && (
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                    <TextInput value={name} onChangeText={setName} style={[styles.input, { flex: 1 }]} accessibilityLabel="Rule name" autoFocus />
                    <Chip
                        label="Save"
                        tone="night"
                        onPress={async () => {
                            await updateRule(rule.id, { name: name.trim() || rule.name });
                            setRenaming(false);
                        }}
                    />
                </View>
            )}

            <View style={styles.ruleCard}>
                <Text style={frameStyles.over}>MATCHES WHEN</Text>
                <RuleLine k="SENDER" v={rule.sender} />
                <RuleLine k="PAID TO" v={`${rule.payeeMatch}*`} />
                {acc?.last4 && <RuleLine k="ACCOUNT" v={`XX${acc.last4}`} />}
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>WHEN IT MATCHES</Text>
                <Segmented
                    label="When it matches"
                    options={[
                        { value: 'auto', label: 'Auto-file' },
                        { value: 'ask', label: 'Ask me' },
                    ]}
                    value={rule.mode}
                    onChange={(mode) => updateRule(rule.id, { mode })}
                />
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>LAST MATCHES · {rule.matchCount} IN TOTAL</Text>
                {matches.length === 0 && <Text style={frameStyles.muted}>No payments yet.</Text>}
                {matches.map((t) => (
                    <View key={t.id} style={styles.matchRow}>
                        <Text style={styles.matchDate}>{new Date(t.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                        <Text style={[frameStyles.body, { flex: 1 }]}>{catLabel(t.category)}</Text>
                        <Text style={styles.matchAmount}>{formatAmount(Math.abs(t.amount), true)}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity onPress={() => setConfirm(true)} style={styles.deleteRule} accessibilityRole="button">
                <Icon name="delete-outline" size={20} color={COLORS.error} />
                <Text style={styles.deleteRuleText}>Delete rule · go back to asking</Text>
            </TouchableOpacity>
            <ConfirmSheet
                visible={confirm}
                destructive
                title={`Delete the ${rule.name} rule?`}
                body={`Past payments keep their names. New ${rule.name} SMS come to Review again.`}
                confirmLabel="Delete rule"
                onConfirm={remove}
                onCancel={() => setConfirm(false)}
            />
        </Frame>
    );
}

const styles = StyleSheet.create({
    smsCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.lg, gap: 6, ...SHADOWS.sm },
    smsFrom: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 0.4 },
    sms: { fontSize: 15, lineHeight: 22, color: COLORS.text, fontWeight: '600' },
    smsMark: { backgroundColor: SIKKA.lime, fontWeight: '800' },
    input: { height: 56, borderRadius: 20, backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, fontSize: 18, fontWeight: '800', color: COLORS.text, ...SHADOWS.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    pillBtn: { height: 44, paddingHorizontal: SPACING.lg, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', ...SHADOWS.sm },
    pillBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.text },

    saved: { alignItems: 'flex-start', gap: SPACING.sm },
    savedIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
    savedTitle: { fontSize: 32, lineHeight: 35, fontWeight: '800', color: COLORS.text, letterSpacing: -0.8 },
    ruleCard: { backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, gap: SPACING.sm, ...SHADOWS.sm },
    ruleLine: { flexDirection: 'row', gap: SPACING.md, alignItems: 'baseline' },
    ruleKey: { width: 64, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
    ruleVal: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text },
    arrow: { alignItems: 'center' },
    older: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: CATEGORY_PALETTE.bills.bg, borderRadius: 22, padding: SPACING.lg },
    olderNum: { fontSize: 32, fontWeight: '800', color: COLORS.text },

    txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.lg, ...SHADOWS.sm },
    txName: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    txAmount: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    option: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 22, padding: SPACING.lg },
    optionOn: { borderWidth: 3, borderColor: COLORS.night, padding: SPACING.lg - 3 },
    optionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#BDB5A6', alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: COLORS.night, backgroundColor: COLORS.night },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.brand },

    health: { backgroundColor: COLORS.brand, borderRadius: 30, padding: SPACING.xl, gap: 2 },
    healthOver: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: CATEGORY_PALETTE.groceries.fg },
    healthValue: { fontSize: 52, lineHeight: 56, fontWeight: '800', color: COLORS.onBrand, letterSpacing: -1.5 },
    healthSub: { fontSize: 14, fontWeight: '700', color: CATEGORY_PALETTE.groceries.fg },
    stats: { flexDirection: 'row', gap: SPACING.sm },
    stat: { flex: 1, borderRadius: 22, padding: 14 },
    statValue: { fontSize: 28, fontWeight: '800', color: COLORS.text },
    statLabel: { fontSize: 13, fontWeight: '800' },

    link: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 22, padding: SPACING.lg, ...SHADOWS.sm },
    linkIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.surfaceSunk, alignItems: 'center', justifyContent: 'center' },
    linkTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    linkAction: { fontSize: 15, fontWeight: '800', color: COLORS.primary },

    search: { height: 52, borderRadius: 26, backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, fontSize: 16, fontWeight: '600', color: COLORS.text, ...SHADOWS.sm },
    empty: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.xl },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 22, padding: 14, ...SHADOWS.sm },
    initials: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    initialsText: { fontSize: 15, fontWeight: '800' },
    ruleName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    mode: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
    modeText: { fontSize: 12, fontWeight: '800', color: COLORS.text },
    matches: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
    matchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 18, paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    matchDate: { width: 60, fontSize: 14, fontWeight: '800', color: COLORS.textSecondary },
    matchAmount: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    deleteRule: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, height: 52 },
    deleteRuleText: { fontSize: 15, fontWeight: '800', color: COLORS.error },
});
