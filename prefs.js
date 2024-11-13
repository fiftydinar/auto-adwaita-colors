import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AccentColorExtensionPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Create the main preferences page
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        // Create a preferences group for Adwaita-Colors setup
        const group = new Adw.PreferencesGroup({
            title: _('Adwaita-Colors Installation'),
        });
        page.add(group);

        // Description label
        const descriptionLabel = new Gtk.Label({
            label: _("This extension needs Adwaita-Colors icons installed."),
            xalign: 0,
        });
        descriptionLabel.add_css_class('dim-label');
        group.add(descriptionLabel);

        // Create a row for the Adwaita-Colors block
        const row = new Adw.ActionRow({
            title: _('Adwaita-Colors'),
            subtitle: _('Auto-installs icon themes'),
        });

        // Add a button to the row with download functionality
        const downloadButton = new Gtk.Button({
            label: _('Download'),
            valign: Gtk.Align.CENTER,
        });

        // Connect the download button click action
        downloadButton.connect('clicked', () => {
            this.handleDownload();
        });

        row.add_suffix(downloadButton);
        group.add(row);
    }

    // Method to handle the download
    handleDownload() {
        const iconsDir = `${GLib.get_home_dir()}/.local/share/icons`;
        const repoUrl = 'https://github.com/dpejoh/Adwaita-colors/archive/refs/heads/main.zip';
        const tempZipFile = GLib.get_tmp_dir() + '/adwaita-colors.zip';

        // Ensure the icons directory exists
        GLib.mkdir_with_parents(iconsDir, 0o755);

        // Spawn the wget process asynchronously
        const [success, pid] = GLib.spawn_async(null, ['wget', '-O', tempZipFile, repoUrl], null, GLib.SpawnFlags.SEARCH_PATH, null);

        if (success) {
            // Wait for the download process to complete
            GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, () => {
                // Extracting ZIP file
                this.extractZip(tempZipFile, iconsDir);
            });
        } else {
            // Error downloading the file
            this.showErrorMessage("Error downloading the file.");
        }
    }

    // Method to extract the downloaded ZIP file
    extractZip(tempZipFile, iconsDir) {
        // Log: Extracting files to a temporary directory
        const tempDir = GLib.get_tmp_dir() + '/adwaita-colors';

        // Extract to the temporary directory
        const [unzipSuccess, unzipPid] = GLib.spawn_async(null, ['unzip', tempZipFile, '-d', tempDir], null, GLib.SpawnFlags.SEARCH_PATH, null);

        if (unzipSuccess) {
            // Wait for the unzip process to complete
            GLib.child_watch_add(GLib.PRIORITY_DEFAULT, unzipPid, () => {
                // Move all contents of the extracted directory to the icons directory
                const moveCommand = `mv ${tempDir}/*/* ${iconsDir}/`;
                GLib.spawn_async(null, ['sh', '-c', moveCommand], null, GLib.SpawnFlags.SEARCH_PATH, null);

                // Remove the temporary extracted directory
                const removeDirCommand = `rmdir ${tempDir}`;
                GLib.spawn_async(null, ['sh', '-c', removeDirCommand], null, GLib.SpawnFlags.SEARCH_PATH, null);

                // Remove the temporary ZIP file
                GLib.spawn_async(null, ['rm', tempZipFile], null, GLib.SpawnFlags.SEARCH_PATH, null);

                // Log: Process complete
                this.showSuccessMessage("Adwaita-Colors installation complete.");
            });
        } else {
            this.showErrorMessage("Error extracting the ZIP file.");
        }
    }

    // Method to show a success message
    showSuccessMessage(message) {
        // You can add your success message logic here, such as showing a notification
        // This can be replaced with a dialog or a status label in the UI
        console.log(message); // Placeholder for actual message display
    }

    // Method to show an error message
    showErrorMessage(message) {
        // You can add your error message logic here, such as showing a notification
        // This can be replaced with a dialog or a status label in the UI
        console.log(message); // Placeholder for actual message display
    }
}

