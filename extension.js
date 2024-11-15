import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { fetchLatestVersion } from './utils.js'; // Adjust path as needed

const INTERFACE_SCHEMA = 'org.gnome.desktop.interface';
const ACCENT_COLOR = 'accent-color';
const ICON_THEME = 'icon-theme';
const CHECK_INTERVAL = 3600; // Check every hour (in seconds)

let notificationSource = null;

const NotificationPolicy = GObject.registerClass(
class NotificationPolicy extends MessageTray.NotificationPolicy {
    get enable() { return true; }
    get enableSound() { return true; }
    get showBanners() { return true; }
    get forceExpanded() { return false; }
    get showInLockScreen() { return false; }
    get detailsInLockScreen() { return false; }
});

function getNotificationSource() {
    if (!notificationSource) {
        const notificationPolicy = new NotificationPolicy();

        notificationSource = new MessageTray.Source({
            // The source name (e.g. application name)
            title: _('Auto Adwaita Colors'),
            // An icon for the source, used a fallback by notifications
            icon: new Gio.ThemedIcon({name: 'dialog-information'}),
            // Same as `icon`, but takes a themed icon name
            iconName: 'dialog-information',
            // The notification policy
            policy: notificationPolicy,
        });

        // Reset the notification source if it's destroyed
        notificationSource.connect('destroy', _source => {
            notificationSource = null;
        });
        Main.messageTray.add(notificationSource);
    }

    return notificationSource;
}

export default class AccentColorExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._accentColorChangedId = null;
        this._updateCheckTimer = null;
    }

    enable() {
        this.settingsSchema = new Gio.Settings({ schema: INTERFACE_SCHEMA });
        this._settings = this.getSettings();

        // Connect to the accent-color setting change event and store the ID
        this._accentColorChangedId = this.settingsSchema.connect(
            'changed::' + ACCENT_COLOR,
            this._onAccentColorChanged.bind(this)
        );

        // Get the initial accent color and apply the corresponding icon theme
        let accentColor = this.settingsSchema.get_string(ACCENT_COLOR);
        this._setIconTheme(accentColor);

        // Start the periodic update check
        this._startUpdateCheck();
        this._checkForUpdates();
    }

    disable() {
        // Reset the icon-theme when the extension is disabled
        this.settingsSchema.set_string(ICON_THEME, 'Adwaita');

        // Disconnect the signal using the stored ID
        if (this._accentColorChangedId !== null) {
            this.settingsSchema.disconnect(this._accentColorChangedId);
            this._accentColorChangedId = null;
        }

        if (this._updateCheckTimer) {
            GLib.source_remove(this._updateCheckTimer);
            this._updateCheckTimer = null;
        }

		this._settings = null;
		this.settingsSchema = null;
    }

    _onAccentColorChanged() {
        // When the accent color changes, get the new color and update the icon theme
        let accentColor = this.settingsSchema.get_string(ACCENT_COLOR);
        this._setIconTheme(accentColor);
    }

    _setIconTheme(color) {
        if (color) {
            // Construct the new icon theme name
            let iconTheme = color === 'blue' ? 'Adwaita' : `Adwaita-${color}`;
            this.settingsSchema.set_string(ICON_THEME, iconTheme);
        }
    }

    _startUpdateCheck() {
        // Set up a periodic function to check for updates
        this._updateCheckTimer = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, CHECK_INTERVAL, () => {
                this._checkForUpdates().catch(error => {
                    logError(error, 'Periodic update check failed');
                });
                return GLib.SOURCE_CONTINUE; // Continue the timer
            }
        );
    }

    async _checkForUpdates() {
        try {
            const latestVersion = await fetchLatestVersion();
            if (latestVersion) {
                const currentVersion = this._settings.get_string('current-version');
                if (currentVersion !== latestVersion) {
                    this._notifyUpdate();
                } else {
                    this._notifyLatestVersion(latestVersion);
                }
            }
        } catch (error) {
            logError(error, 'Error checking for updates');
        }
    }

    _notifyUpdate() {
        const source = getNotificationSource();
        const notification = new MessageTray.Notification({
            source: source,
            title: _('Update Available'),
            body: _('A new version of Adwaita-Colors is available.'),
            gicon: new Gio.ThemedIcon({ name: 'dialog-information' }),
            iconName: 'dialog-information',
            urgency: MessageTray.Urgency.NORMAL,
        });

        notification.connect('activated', () => {
            this.openPreferences()
        });

        source.addNotification(notification);
    }

    _notifyLatestVersion(latestVersion) {
        const source = getNotificationSource();
        const notification = new MessageTray.Notification({
            source: source,
            title: _('Up to Date'),
            body: _('You are already on the latest version: ') + latestVersion,
            gicon: new Gio.ThemedIcon({ name: 'dialog-information' }),
            iconName: 'dialog-information',
            urgency: MessageTray.Urgency.LOW,
        });

        source.addNotification(notification);
    }
}

