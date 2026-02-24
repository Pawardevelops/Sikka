import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

/**
 * InvestmentHolding — Satellite table for investment/crypto accounts (1:N with Account)
 *
 * One investment account can hold MULTIPLE tickers (e.g., a Demat with AAPL + GOOG).
 * Each row = one position in one asset.
 */
export default class InvestmentHolding extends Model {
    static table = 'investment_holdings';

    static associations: Associations = {
        accounts: { type: 'belongs_to', key: 'account_id' },
    };

    @field('account_id') accountId!: string;
    @field('ticker') ticker!: string;              // e.g. "AAPL", "BTC", "ETH"
    @field('quantity') quantity!: number;           // Units owned
    @field('avg_buy_price') avgBuyPrice!: number;  // Average cost per unit
    @field('current_price') currentPrice!: number; // Latest market price per unit

    @readonly @date('created_at') createdAt!: number;
    @readonly @date('updated_at') updatedAt!: number;
}
