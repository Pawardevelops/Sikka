import { Database } from '@nozbe/watermelondb';
import Category from './models/Category';
import Sentiment from './models/Sentiment';

// Inline constants to avoid circular dependencies or missing files for now
const DEFAULT_CATEGORIES = [
    { name: 'Groceries', icon: 'local-grocery-store', color: '#10B981', type: 'expense' },
    { name: 'Dining', icon: 'restaurant', color: '#EF4444', type: 'expense' },
    { name: 'Transport', icon: 'directions-car', color: '#3B82F6', type: 'expense' },
    { name: 'Shopping', icon: 'shopping-bag', color: '#F59E0B', type: 'expense' },
    { name: 'Entertainment', icon: 'movie', color: '#8B5CF6', type: 'expense' },
    { name: 'Utilities', icon: 'lightbulb', color: '#FCD34D', type: 'expense' },
    { name: 'Health', icon: 'local-hospital', color: '#EF4444', type: 'expense' },
    { name: 'Income', icon: 'attach-money', color: '#10B981', type: 'income' },
    { name: 'Transfer', icon: 'swap-horiz', color: '#6B7280', type: 'expense' }, // or neutral
];

const DEFAULT_SENTIMENTS = [
    { name: 'Joy', icon: 'sentiment-very-satisfied', color: '#10B981', description: 'Worth it / Happy purchase' },
    { name: 'Regret', icon: 'sentiment-very-dissatisfied', color: '#EF4444', description: 'Waste / Should have avoided' },
    { name: 'Impulse', icon: 'bolt', color: '#F59E0B', description: 'Rash decision / Unplanned' },
    { name: 'Essential', icon: 'check-circle', color: '#3B82F6', description: 'Need / Utility' },
    { name: 'Growth', icon: 'trending-up', color: '#8B5CF6', description: 'Learning / Health / Self-improvement' },
];

export async function seedDatabase(database: Database) {
    // Check if categories exist
    const categoriesCount = await database.get('categories').query().fetchCount();

    if (categoriesCount === 0) {
        await database.write(async () => {
            // Seed Categories
            const categoriesCollection = database.get('categories');
            const batchCategories = DEFAULT_CATEGORIES.map(cat =>
                categoriesCollection.prepareCreate(record => {
                    const c = record as Category;
                    c.name = cat.name;
                    c.icon = cat.icon;
                    c.color = cat.color;
                    c.type = cat.type as 'expense' | 'income';
                })
            );

            await database.batch(...batchCategories);
        });
        console.log('Categories seeded!');
    }

    // Check/Repair Sentiments
    await repairSentiments(database);
}

export async function repairSentiments(database: Database) {
    const sentimentsCollection = database.get('sentiments');

    // Check if correct IDs exist
    // We check for 'joy' specifically as a marker
    try {
        const joy = await sentimentsCollection.find('joy');
        if (joy) {
            // Already correct
            return;
        }
    } catch (e) {
        // Not found, proceed to repair
    }

    console.log("Repairing sentiments...");

    await database.write(async () => {
        // 1. Delete all existing sentiments (they have wrong IDs)
        const allSentiments = await sentimentsCollection.query().fetch();
        const deleteOps = allSentiments.map(s => s.prepareDestroyPermanently());

        // 2. Create new sentiments with explicit IDs
        const createOps = DEFAULT_SENTIMENTS.map(sen =>
            sentimentsCollection.prepareCreate(record => {
                // forceful ID assignment
                (record as any)._raw.id = sen.name.toLowerCase();
                const s = record as Sentiment;
                s.name = sen.name;
                s.icon = sen.icon;
                s.color = sen.color;
                s.description = sen.description;
            })
        );

        await database.batch(...deleteOps, ...createOps);
    });
    console.log("Sentiments repaired!");
}
