import Gio from 'gi://Gio';
Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

async function execCommunicate(argv, input = null, cancellable = null) {
    let cancelId = 0;
    let flags = Gio.SubprocessFlags.STDOUT_PIPE |
                Gio.SubprocessFlags.STDERR_PIPE;

    if (input !== null)
        flags |= Gio.SubprocessFlags.STDIN_PIPE;

    const proc = new Gio.Subprocess({argv, flags});
    proc.init(cancellable);

    if (cancellable instanceof Gio.Cancellable)
        cancelId = cancellable.connect(() => proc.force_exit());

    try {
        const [stdout, stderr] = await proc.communicate_utf8_async(input, null);

        const status = proc.get_exit_status();

        if (status !== 0) {
            throw new Gio.IOErrorEnum({
                code: Gio.IOErrorEnum.FAILED,
                message: stderr ? stderr.trim() : `Command '${argv}' failed with exit code ${status}`,
            });
        }

        return stdout.trim();
    } finally {
        if (cancelId > 0)
            cancellable.disconnect(cancelId);
    }
}

/**
 * Fetch the latest version tag from the GitHub API.
 *
 * @returns {Promise<string>} - The latest version tag or 'Unknown' on failure
 */
async function fetchLatestVersion() {
    const argv = [
        'sh', '-c', 'curl -s https://api.github.com/repos/dpejoh/Adwaita-colors/releases/latest | grep -o \'"tag_name": "[^"]*\' | sed \'s/"tag_name": "//\''
    ];

    try {
        const result = await execCommunicate(argv);
        return result.trim();
    } catch (error) {
        return `Error fetching version: ${error.message}`;
    }
}

export { fetchLatestVersion };
