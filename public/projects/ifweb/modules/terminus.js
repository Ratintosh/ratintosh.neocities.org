class CommandRegistry {
    constructor() {
        this.commands = {};
    }

    register(name, callback) {
        this.commands[name] = callback;
    }

    async execute(name, terminal) {
        if (this.commands[name]) {
            await this.commands[name](terminal);
            return true;
        }
        return false;
    }

    has(name) {
        return this.commands[name] !== undefined;
    }
}

class Terminal {
    constructor(id, commandRegistry, fillParent=false, rows, columns) {
        if(!fillParent){
            //rows cols mode (legacy)
            document.getElementById(id).style.width = columns + "ch" //lets say 80 columns, should be width:80ch
            document.getElementById(id).style.height = rows + "ch" //lets say 24 rows, should be height:24ch
        }else{
            //dynamic mode (modern)
        }
        this.id = id;
        this.commandRegistry = commandRegistry || new CommandRegistry();
    }

    scrollToBottom() {
        const el = document.getElementById(this.id);
        el.scrollTop = el.scrollHeight;
    }

    print(text){
        document.getElementById(this.id).innerHTML += text
        this.scrollToBottom();
    }

    async cin(){
        return new Promise((resolve) => {
            let input = "";
            const handler = (e) => {
                console.log(e.key);
                if (e.key === "Enter") {
                    e.preventDefault();
                    document.removeEventListener("keydown", handler);
                    document.getElementById(this.id).innerHTML += "<br>";
                    this.scrollToBottom();
                    resolve(input);
                } else if (e.key === "Backspace") {
                    e.preventDefault();
                    if (input.length > 0) {
                        input = input.slice(0, -1);
                        const el = document.getElementById(this.id);
                        el.innerHTML = el.innerHTML.slice(0, -1);
                        this.scrollToBottom();
                    }
                } else if (e.key.length === 1) {
                    e.preventDefault();
                    input += e.key;
                    document.getElementById(this.id).innerHTML += e.key;
                    this.scrollToBottom();
                }
            };
            document.addEventListener("keydown", handler);
        });
    }
    
    async shell(prompt = "") {
        while (true) {
            this.print(prompt + "$ ");
            const input = await this.cin();
            const result = await this.parse(input);
            if (result === "exit") break;
        }
    }

    async parse(command) {
        const trimmed = command.trim();
        
        if (trimmed === "") {
            return null;
        }
        
        if (trimmed === "exit") {
            return "exit";
        }
        
        const success = await this.commandRegistry.execute(trimmed, this);
        
        if (!success) {
            this.print("Unknown command: " + trimmed);
        }
        this.print("<br>")
        
        return null;
    }
}