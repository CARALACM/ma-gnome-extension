import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class MusicAssistantPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'Connection Settings',
            description: 'Configure your Music Assistant server details'
        });
        page.add(group);

        // Server URL
        const serverUrlRow = new Adw.EntryRow({
            title: 'Server URL',
            text: settings.get_string('server-url')
        });
        group.add(serverUrlRow);
        settings.bind('server-url', serverUrlRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        // Player ID
        const playerIdRow = new Adw.EntryRow({
            title: 'Player ID',
            text: settings.get_string('player-id')
        });
        group.add(playerIdRow);
        settings.bind('player-id', playerIdRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        // Auth Token
        const authTokenRow = new Adw.PasswordEntryRow({
            title: 'Auth Token'
        });
        group.add(authTokenRow);
        settings.bind('auth-token', authTokenRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        const behaviorGroup = new Adw.PreferencesGroup({
            title: 'Behavior',
            description: 'Control how the extension looks and interacts with your system'
        });
        page.add(behaviorGroup);

        // Show Panel Title Toggle
        const showTitleRow = new Adw.SwitchRow({
            title: 'Show Song Title in Panel',
            subtitle: 'Toggle visibility of the scrolling track name in the top bar'
        });
        behaviorGroup.add(showTitleRow);
        settings.bind('show-panel-title', showTitleRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        // PWA Toggle
        const pwaRow = new Adw.SwitchRow({
            title: 'Open with Custom Command (PWA)',
            subtitle: 'If disabled, clicking the album art will open the URL in your default browser'
        });
        behaviorGroup.add(pwaRow);
        settings.bind('use-pwa-command', pwaRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        // Custom Command Entry
        const cmdRow = new Adw.EntryRow({
            title: 'Custom Command',
            text: settings.get_string('pwa-command')
        });
        behaviorGroup.add(cmdRow);
        settings.bind('pwa-command', cmdRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('use-pwa-command', cmdRow, 'sensitive', Gio.SettingsBindFlags.DEFAULT);
    }
}
