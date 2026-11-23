import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { smsHandler } from './src/services/sms';

// Incoming SMS are delivered by the native SmsReceiver to this headless task (Android only).
if (Platform.OS === 'android') {
    AppRegistry.registerHeadlessTask('SikkaSmsReceived', () => smsHandler);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
