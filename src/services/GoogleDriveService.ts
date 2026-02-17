import {
    GoogleSignin,
    statusCodes,
    User,
} from '@react-native-google-signin/google-signin';

// Scope for hidden app data folder
const SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];

export const GoogleDriveService = {
    /**
     * Configure Google Sign-In. Call this early in the app lifecycle.
     */
    configure: () => {
        GoogleSignin.configure({
            scopes: SCOPES,
            // webClientId is optional for Android but required if you need server-side access
            // iosClientId is required for iOS
        });
    },

    /**
     * Sign In the user
     */
    signIn: async (): Promise<User | null> => {
        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();
            if (response && response.data) {
                return response.data;
            }
            return response as unknown as User; // Fallback for older versions or if response IS the user
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log('User cancelled the login flow');
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log('Sign in is in progress already');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                console.log('Play services not available or outdated');
            } else {
                console.error('Some other error happened during sign in', error);
            }
            return null;
        }
    },

    /**
     * Sign Out
     */
    signOut: async () => {
        try {
            await GoogleSignin.signOut();
        } catch (error) {
            console.error(error);
        }
    },

    /**
     * Get current user if already signed in
     */
    getCurrentUser: async () => {
        try {
            const currentUser = await GoogleSignin.getCurrentUser();
            return currentUser;
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    /**
     * Get fresh access token for Drive API calls
     */
    getAccessToken: async () => {
        try {
            const tokens = await GoogleSignin.getTokens();
            return tokens.accessToken;
        } catch (error) {
            console.error('Error getting access token:', error);
            return null;
        }
    },

    /**
     * List files in the App Data Folder
     */
    listFiles: async (accessToken: string) => {
        try {
            const response = await fetch(
                'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id, name, createdTime, size)',
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            const responseText = await response.text();

            if (!response.ok) {
                throw new Error(`Google Drive API Error (List): ${response.status} ${response.statusText} - ${responseText}`);
            }

            try {
                const result = JSON.parse(responseText);
                return result.files || [];
            } catch (e) {
                throw new Error(`Invalid JSON response from Drive API (List): ${responseText.substring(0, 100)}...`);
            }
        } catch (error) {
            console.error('Error listing files:', error);
            throw error;
        }
    },

    /**
     * Upload a file to App Data Folder
     * @param accessToken Valid OAuth token
     * @param content String content (encrypted JSON)
     * @param filename Name of the file (e.g., 'sikka_backup.enc')
     * @param existingFileId Optional ID to update existing file instead of creating new
     */
    uploadFile: async (accessToken: string, content: string, filename: string, existingFileId?: string) => {
        const metadata: any = {
            name: filename,
            mimeType: 'application/json', // or application/octet-stream for encrypted
        };

        if (!existingFileId) {
            metadata.parents = ['appDataFolder'];
        }

        const boundary = 'foo_bar_baz';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelim = `\r\n--${boundary}--`;

        const body =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: text/plain\r\n\r\n' +
            content +
            closeDelim;

        const method = existingFileId ? 'PATCH' : 'POST';
        const url = existingFileId
            ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                    'Content-Length': body.length.toString(),
                },
                body: body,
            });

            const responseText = await response.text();

            if (!response.ok) {
                throw new Error(`Google Drive API Error (Upload): ${response.status} ${response.statusText} - ${responseText}`);
            }

            try {
                return JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Invalid JSON response from Drive API: ${responseText.substring(0, 100)}...`);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    },

    /**
     * Download file content
     */
    downloadFile: async (accessToken: string, fileId: string) => {
        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Google Drive API Error (Download): ${response.status} ${response.statusText} - ${errorText}`);
            }

            const text = await response.text();
            return text;
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    },
};
