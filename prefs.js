import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AccentColorExtensionPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Adwaita-Colors Installation'),
        });
        page.add(group);

        const descriptionLabel = new Gtk.Label({
            label: _("This extension needs Adwaita-Colors icons installed."),
            xalign: 0,
        });
        descriptionLabel.add_css_class('dim-label');
        group.add(descriptionLabel);

        const row = new Adw.ActionRow({
            title: _('Adwaita-Colors'),
            subtitle: _('Auto-installs icon themes'),
        });

        // Add Download button
        const downloadButton = new Gtk.Button({
            label: _('Download'),
            valign: Gtk.Align.CENTER,
        });
        downloadButton.connect('clicked', () => {
            this.handleDownload(window);
        });
        row.add_suffix(downloadButton);

        // Label to display the current version
        const versionLabel = new Gtk.Label({
            label: this.getCurrentVersionLabel(window),
            xalign: 0,
            use_markup: true,
        });
        row.add_suffix(versionLabel);

        group.add(row);
    }

    handleDownload(window) {
        const iconsDir = `${GLib.get_home_dir()}/.local/share/icons`;
        const repoUrl = 'https://github.com/dpejoh/Adwaita-colors/archive/refs/heads/main.zip';
        const tempZipFile = GLib.get_tmp_dir() + '/adwaita-colors.zip';

        GLib.mkdir_with_parents(iconsDir, 0o755);

        const [success, pid] = GLib.spawn_async(null, ['wget', '-O', tempZipFile, repoUrl], null, GLib.SpawnFlags.SEARCH_PATH, null);

        if (success) {
            GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, async () => {
                await this.extractZip(tempZipFile, iconsDir);
                const latestVersion = this.fetchLatestVersion(); // Get the latest version
                if (latestVersion) {
                    window._settings.set_string('current-version', latestVersion);
                } else {
                    window._settings.set_string('current-version', "latestVersion failed");
                }
                this.getCurrentVersionLabel(window);  // Update label after change
            });
        } else {
            this.showErrorMessage("Error downloading the file.");
        }
    }

    fetchLatestVersion() {
        const command = `sh -c "curl -s https://api.github.com/repos/dpejoh/Adwaita-colors/releases/latest | grep -o '\\"tag_name\\": \\"[^\\"]*' | sed 's/\\"tag_name\\": \\"//'"`
        const [res, out] = GLib.spawn_command_line_sync(command);

        if (res && out) {
            return out.toString().trim();
        } else {
            this.showErrorMessage("Failed to fetch the latest version.");
            return 'Unknown';
        }
    }

    extractZip(tempZipFile, iconsDir) {
        return new Promise((resolve, reject) => {
            const tempDir = GLib.get_tmp_dir() + '/adwaita-colors';
            const [unzipSuccess, unzipPid] = GLib.spawn_async(null, ['unzip', tempZipFile, '-d', tempDir], null, GLib.SpawnFlags.SEARCH_PATH, null);

            if (unzipSuccess) {
                GLib.child_watch_add(GLib.PRIORITY_DEFAULT, unzipPid, () => {
                    const moveCommand = `mv ${tempDir}/*/* ${iconsDir}/`;
                    GLib.spawn_async(null, ['sh', '-c', moveCommand], null, GLib.SpawnFlags.SEARCH_PATH, null);
                    GLib.spawn_async(null, ['rm', tempZipFile], null, GLib.SpawnFlags.SEARCH_PATH, null);

                    this.showSuccessMessage("Adwaita-Colors installation complete.");
                    resolve();
                });
            } else {
                this.showErrorMessage("Error extracting the ZIP file.");
                reject();
            }
        });
    }

    // Method to get the current version label
    getCurrentVersionLabel(window) {
        const currentVersion = window._settings.get_string('current-version') || 'Not installed';
        return `<b>Current Version:</b> ${currentVersion}`;
    }

    showSuccessMessage(message) {
        console.log(message); // Replace with your UI message logic
    }

    showErrorMessage(message) {
        console.log(message); // Replace with your UI message logic
    }
}

