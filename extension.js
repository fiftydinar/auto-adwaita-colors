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
        this.accentColorSettings = new Gio.Settings({ schema: INTERFACE_SCHEMA });
        this.iconThemeSettings = new Gio.Settings({ schema: INTERFACE_SCHEMA });
        this._onAccentColorChanged = this._onAccentColorChanged.bind(this);
    }

    enable() {
        // Connect to the accent-color setting change event
        this.accentColorSettings.connect('changed::' + ACCENT_COLOR, this._onAccentColorChanged);

        // Get the initial accent color and apply the corresponding icon theme
        let accentColor = this.accentColorSettings.get_string(ACCENT_COLOR);
        this._setIconTheme(accentColor);
    }

    disable() {
        // Optionally reset the icon-theme when the extension is disabled
        this.iconThemeSettings.set_string(ICON_THEME, '');

        // Disconnect the signal when disabling
        this.accentColorSettings.disconnect(this._onAccentColorChanged);
    }

    _onAccentColorChanged() {
        // When the accent color changes, get the new color and update the icon theme
        let accentColor = this.accentColorSettings.get_string(ACCENT_COLOR);
        this._setIconTheme(accentColor);
    }

    _setIconTheme(color) {
        if (color) {
            // Construct the new icon theme name
            let iconTheme = color === 'blue' ? 'Adwaita' : `Adwaita-${color}`;
            this.iconThemeSettings.set_string(ICON_THEME, iconTheme);
        }
    }
}

