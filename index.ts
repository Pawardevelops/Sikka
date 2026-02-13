import { registerRootComponent } from 'expo';
import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { notificationHandler } from './src/services/NotificationService';

// Register the Headless Task for Android Notifications (not available on web)
if (Platform.OS === 'android') {
    AppRegistry.registerHeadlessTask('RNAndroidNotificationListenerHeadlessJs', () => notificationHandler);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
