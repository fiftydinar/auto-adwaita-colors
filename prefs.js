import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { fetchLatestVersion, downloadZip } from './utils.js'; // Adjust path as needed

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

        const downloadButton = new Gtk.Button({
            label: _('Download'),
            valign: Gtk.Align.CENTER,
        });

        const versionLabel = new Gtk.Label({
            label: this.getCurrentVersionLabel(window),
            xalign: 0,
            use_markup: true,
        });

        const fetchResultLabel = new Gtk.Label({
            label: _("Fetching version..."),
            xalign: 0,
        });

        row.add_suffix(downloadButton);
        row.add_suffix(versionLabel);
        group.add(row);
        group.add(fetchResultLabel);

        // Progress bar for visual feedback
        const progressBar = new Gtk.ProgressBar({
            visible: false, // Initially hidden
        });
        group.add(progressBar);

        // Fetch the latest version
        this.updateVersionLabel(fetchResultLabel);

        // Handle download
        downloadButton.connect('clicked', () => {
            this.handleDownload(window, versionLabel, progressBar);
        });
    }

    async handleDownload(window, versionLabel, progressBar) {
        const iconsDir = `${GLib.get_home_dir()}/.local/share/icons`;
        const repoUrl = 'https://github.com/dpejoh/Adwaita-colors/archive/refs/heads/main.zip';
        const tempZipFile = GLib.get_tmp_dir() + '/adwaita-colors.zip';

        try {
            progressBar.set_visible(true);
            progressBar.set_fraction(0.0);
            progressBar.set_text(_("Downloading..."));
            progressBar.set_show_text(true);

            await downloadZip(repoUrl, tempZipFile); // Implement or adjust your download logic
            progressBar.set_fraction(0.5);

            await this.extractZip(tempZipFile, iconsDir);
            progressBar.set_fraction(1.0);
            progressBar.set_text(_("Completed!"));

            const latestVersion = await fetchLatestVersion();
            if (latestVersion) {
                window._settings.set_string('current-version', latestVersion);
                versionLabel.set_label(this.getCurrentVersionLabel(window));
            }
        } catch (error) {
            logError(error, 'Download failed');
        } finally {
            progressBar.set_visible(false);
        }
    }

    async updateVersionLabel(fetchResultLabel) {
        const result = await fetchLatestVersion();

        fetchResultLabel.set_label(result);
        if (result && !result.startsWith("Error")) {
            fetchResultLabel.set_label(`Latest version: ${result}`);
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

    getCurrentVersionLabel(window) {
        const currentVersion = window._settings.get_string('current-version') || 'NA';
        return `<b>Current Version:</b> ${currentVersion}`;
    }

    showErrorMessage(message) {
        const dialog = new Gtk.MessageDialog({
            modal: true,
            message_type: Gtk.MessageType.ERROR,
            buttons: Gtk.ButtonsType.OK,
            text: message,
        });
        dialog.run();
        dialog.destroy();
    }

    showSuccessMessage(message) {
        console.log(message); // Replace with your UI message logic
    }
}

