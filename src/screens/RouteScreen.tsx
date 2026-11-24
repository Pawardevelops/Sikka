/**
 * Renders the top pushed v3 screen. Each screen reads what it needs by id
 * from the contexts, so routes never hold stale records.
 */
import React from 'react';
import { Route, useNavigation } from '../context/NavigationContext';
import { SyncResultScreen } from './v3/SyncResultScreen';
import { TeachMessageScreen } from './v3/TeachMessageScreen';
import { VoiceNoteScreen } from './v3/VoiceNoteScreen';
import { PaymentStoryScreen } from './v3/PaymentStoryScreen';
import { ModelPickScreen } from './onboarding/ModelPickScreen';
import { CaptureSettingsScreen, VoiceSettingsScreen, BackupScreen } from './v3/SettingsScreens';
import { RecapScreen } from './v3/RecapScreen';
import { PlanEditScreen, PlanDetailScreen, PlanChangeScreen, DueScreen, IssuesScreen, PlanFoundScreen } from './v3/PlanScreens';
import { NameSenderScreen, RuleSavedScreen, FixTagScreen, ModelHealthScreen, SavedRulesScreen, RuleDetailScreen } from './v3/RuleScreens';

export function RouteScreen({ route }: { route: Route }): React.ReactElement | null {
    const { closeScreen } = useNavigation();
    switch (route.name) {
        case 'syncResult':
            return <SyncResultScreen {...route} />;
        case 'teach':
            return <TeachMessageScreen messageId={route.messageId} />;
        case 'voiceNote':
            return <VoiceNoteScreen txId={route.txId} />;
        case 'paymentStory':
            return <PaymentStoryScreen txId={route.txId} />;
        case 'modelPick':
            return <ModelPickScreen fromSettings onDone={closeScreen} />;
        case 'nameSender':
            return <NameSenderScreen txId={route.txId} />;
        case 'ruleSaved':
            return <RuleSavedScreen ruleId={route.ruleId} txId={route.txId} />;
        case 'fixTag':
            return <FixTagScreen txId={route.txId} />;
        case 'modelHealth':
            return <ModelHealthScreen />;
        case 'rules':
            return <SavedRulesScreen />;
        case 'rule':
            return <RuleDetailScreen id={route.id} />;
        case 'captureSettings':
            return <CaptureSettingsScreen />;
        case 'voiceSettings':
            return <VoiceSettingsScreen />;
        case 'backup':
            return <BackupScreen />;
        case 'recap':
            return <RecapScreen month={route.month} year={route.year} />;
        case 'plan':
            return <PlanDetailScreen id={route.id} />;
        case 'planEdit':
            return <PlanEditScreen id={route.id} kind={route.kind} foundMessageId={route.foundMessageId} linkPast={route.linkPast} />;
        case 'planChange':
            return <PlanChangeScreen id={route.id} />;
        case 'due':
            return <DueScreen />;
        case 'issues':
            return <IssuesScreen />;
        case 'planFound':
            return <PlanFoundScreen messageId={route.messageId} />;
        case 'help':
            return null;
        default:
            return null;
    }
}
