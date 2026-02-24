const { spawn } = require('child_process');
const path = require('path');

// Path to the keytool executable in Android Studio's bundled JDK
const keytoolPath = 'C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\keytool.exe';

console.log('Generating keystore using keytool at:', keytoolPath);

const args = [
  '-genkey', '-v',
  '-keystore', 'my-release-key.keystore',
  '-alias', 'my-key-alias',
  '-keyalg', 'RSA',
  '-keysize', '2048',
  '-validity', '10000'
];

// Spawn the process with shell: false to avoid quoting issues with spaces in the path
const child = spawn(keytoolPath, args, { stdio: 'inherit', shell: false });

child.on('error', (err) => {
  console.error('Failed to start keytool:', err);
  console.error('Make sure the path to keytool is correct.');
});

child.on('close', (code) => {
  if (code !== 0) {
    console.log(`keytool process exited with code ${code}`);
    process.exit(code);
  } else {
    console.log('Keystore generated successfully!');
  }
});
