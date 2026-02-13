const commands = new CommandRegistry();
const terminal = new Terminal("terminal", commands, true, 60, 80);

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");
}

function runGenerator(genFn) {
    const gen = genFn();

    function step(nextFn, arg) {
        let result;
        try {
            result = nextFn.call(gen, arg);
        } catch (err) {
            return Promise.reject(err);
        }
        if (result.done) {
            return Promise.resolve(result.value);
        }
        return Promise.resolve(result.value).then(
            (value) => step(gen.next, value),
            (error) => step(gen.throw, error)
        );
    }

    return step(gen.next, undefined);
}

function terminalReadLine(prompt) {
    if (prompt) {
        terminal.print(escapeHtml(prompt));
    }
    return terminal.cin();
}

function u8ToBase64(u8) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < u8.length; i += chunkSize) {
        const chunk = u8.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

function base64ToU8(base64) {
    const binary = atob(base64);
    const u8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        u8[i] = binary.charCodeAt(i);
    }
    return u8;
}

async function run() {
    terminal.print("Loading story...<br>");

    const response = await fetch("zork.z3");
    if (!response.ok) {
        terminal.print("Failed to load story file.<br>");
        return;
    }

    const buffer = await response.arrayBuffer();
    const story = new Uint8Array(buffer);
    const game = new JSZM(story);

    game.print = function* (text) {
        const html = escapeHtml(text).replace(/\n/g, "<br>");
        terminal.print(html);
    };

    game.read = function* (maxlen) {
        const input = yield terminalReadLine("");
        return input.slice(0, maxlen);
    };

    game.save = function* (data) {
        const slot = (yield terminalReadLine("Save name? ")).trim();
        if (!slot) {
            terminal.print("<br>Save canceled.<br>");
            return false;
        }
        try {
            const key = "jszm_save_" + slot;
            const value = u8ToBase64(data);
            localStorage.setItem(key, value);
            terminal.print("<br>Saved.<br>");
            return true;
        } catch (err) {
            terminal.print("<br>Save failed.<br>");
            return false;
        }
    };

    game.restore = function* () {
        const slot = (yield terminalReadLine("Restore name? ")).trim();
        if (!slot) {
            terminal.print("<br>Restore canceled.<br>");
            return null;
        }
        try {
            const key = "jszm_save_" + slot;
            const value = localStorage.getItem(key);
            if (!value) {
                terminal.print("<br>No save found.<br>");
                return null;
            }
            terminal.print("<br>Restored.<br>");
            return base64ToU8(value);
        } catch (err) {
            terminal.print("<br>Restore failed.<br>");
            return null;
        }
    };

    runGenerator(function* () {
        yield* game.run();
    }).catch((err) => {
        terminal.print("<br>Runtime error.<br>");
        console.error(err);
    });
}

run();