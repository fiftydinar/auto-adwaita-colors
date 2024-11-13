import St from 'gi://St';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const INTERFACE_SCHEMA = 'org.gnome.desktop.interface';
const ACCENT_COLOR = 'accent-color';
const ICON_THEME = 'icon-theme';

export default class AccentColorExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._accentColorChangedId = null;
    }

    enable() {
        this.settingsSchema = new Gio.Settings({ schema: INTERFACE_SCHEMA });

			  // Connect to the accent-color setting change event and store the ID
        this._accentColorChangedId = this.settingsSchema.connect(
            'changed::' + ACCENT_COLOR,
            this._onAccentColorChanged.bind(this)
        );

        // Get the initial accent color and apply the corresponding icon theme
        let accentColor = this.settingsSchema.get_string(ACCENT_COLOR);
        this._setIconTheme(accentColor);
    }

    disable() {
        // Reset the icon-theme when the extension is disabled
        this.settingsSchema.set_string(ICON_THEME, 'Adwaita');

        // Disconnect the signal using the stored ID
        if (this._accentColorChangedId !== null) {
            this.settingsSchema.disconnect(this._accentColorChangedId);
            this._accentColorChangedId = null;
        }

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
}

