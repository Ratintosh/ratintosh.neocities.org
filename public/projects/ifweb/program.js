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
    //motd
    terminal.print("+-----------------------------------+<br>")
    terminal.print("██╗███████╗██╗    ██╗███████╗██████╗ <br>██║██╔════╝██║    ██║██╔════╝██╔══██╗<br>██║█████╗  ██║ █╗ ██║█████╗  ██████╔╝<br>██║██╔══╝  ██║███╗██║██╔══╝  ██╔══██╗<br>██║██║     ╚███╔███╔╝███████╗██████╔╝<br>╚═╝╚═╝      ╚══╝╚══╝ ╚══════╝╚═════╝ <br>");
    terminal.print("+-----------------------------------+<br>")
    terminal.print("Interactive fiction in your browser!<br>")
    terminal.print("(c) 2026 Ratintosh<br>")
    terminal.print("<br>")
    terminal.print("<br>")
    terminal.print("Type \"help\" for a list of commands<br>")
    terminal.print("Type \"games\" for a list of games<br>")
    //loadZork(terminal)
}

run();