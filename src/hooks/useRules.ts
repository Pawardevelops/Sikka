import { useEffect, useState } from 'react';
import database from '../database';
import SmsRule from '../database/models/SmsRule';
import { RuleData, toRuleData } from '../services/sms/rules';

/** Live list of taught rules, newest first. */
export function useRules(): RuleData[] {
    const [rules, setRules] = useState<RuleData[]>([]);
    useEffect(() => {
        const sub = database
            .get<SmsRule>('sms_rules')
            .query()
            .observeWithColumns(['name', 'category', 'mode', 'match_count', 'account_id', 'updated_at'])
            .subscribe((rs) => setRules(rs.map(toRuleData).sort((a, b) => b.createdAt - a.createdAt)));
        return () => sub.unsubscribe();
    }, []);
    return rules;
}
