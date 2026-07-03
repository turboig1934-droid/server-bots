const mineflayer = require('mineflayer');
const fs = require('fs');

// ============================================
// CONFIGURATION
// ============================================
const config = {
    server_ip: 'node.harshteotia.in',
    server_port: 25566,
    bots_per_runner: 100,
    bot_spawn_delay: 1000,
    max_bots: 100,
    server_version: '1.16.5',
    command_prefix: '!',
    video_helper_mode: true,
    auto_register: true
};

try {
    const configFile = fs.readFileSync('config.json', 'utf8');
    Object.assign(config, JSON.parse(configFile));
} catch (e) {
    console.log('📝 Using default config');
}

// ============================================
// PASSWORDS & NAMES
// ============================================
const PASSWORDS = [
    'password123', 'minecraft', 'server123', 'bot123', 'admin123',
    '12345678', 'qwerty123', 'abc123456', 'botpassword', 'serverpass',
    'register123', 'login123', 'pass1234', 'botpass', 'mcserver'
];

const BOT_NAMES = [];
const PREFIXES = ['Bot', 'Player', 'Hero', 'Ace', 'Pro', 'Star', 'Nitro', 'Blaze', 'Shadow', 'Frost', 'Elite', 'Master'];
const RANDOM_NAMES = [
    'Nitro', 'Blaze', 'Shadow', 'Frost', 'Storm', 'Venom', 'Raven', 'Lunar',
    'Solar', 'Nova', 'Zephyr', 'Phantom', 'Viper', 'Cobra', 'Falcon', 'Eagle',
    'Titan', 'Atlas', 'Neon', 'Cosmic', 'Galaxy', 'Quantum', 'Zen', 'Karma',
    'Apex', 'Rogue', 'Sage', 'Hawk', 'Wolf', 'Bear', 'Lion', 'Tiger',
    'Dragon', 'Phoenix', 'Serpent', 'Griffin', 'Mystic', 'Eclipse', 'Aurora',
    'Midnight', 'Dawn', 'Dusk', 'Ember', 'Flare', 'Glacier', 'Havoc', 'Inferno'
];

// Generate names
for (let i = 0; i < 100; i++) {
    PREFIXES.forEach(prefix => BOT_NAMES.push(`${prefix}${i}`));
}
RANDOM_NAMES.forEach(name => {
    BOT_NAMES.push(name);
    for (let i = 0; i < 3; i++) BOT_NAMES.push(`${name}${i}`);
});

// ============================================
// ULTRA BOT MANAGER
// ============================================
class UltraBotManager {
    constructor() {
        this.bots = [];
        this.selectedBots = new Set();
        this.runnerId = process.env.RUNNER_ID || `runner_${Date.now()}`;
        this.totalJoined = 0;
        this.totalRemoved = 0;
        this.usedNames = new Set();
        this.isSpawning = false;
        this.spawnQueue = [];
        this.commandHistory = [];
        this.startTime = Date.now();
        
        // ============================================
        // COMMAND HANDLERS - FULL CONTROL
        // ============================================
        this.commands = {
            // Basic Commands
            'ping': this.cmdPing.bind(this),
            'help': this.cmdHelp.bind(this),
            'status': this.cmdStatus.bind(this),
            'info': this.cmdInfo.bind(this),
            'list': this.cmdList.bind(this),
            
            // Selection Commands
            'army': this.cmdArmy.bind(this),
            'select': this.cmdSelect.bind(this),
            'clear': this.cmdClear.bind(this),
            'all': this.cmdAll.bind(this),
            'none': this.cmdNone.bind(this),
            
            // Movement Commands
            'move': this.cmdMove.bind(this),
            'tp': this.cmdTp.bind(this),
            'circle': this.cmdCircle.bind(this),
            'formation': this.cmdFormation.bind(this),
            'spread': this.cmdSpread.bind(this),
            'follow': this.cmdFollow.bind(this),
            'goto': this.cmdGoto.bind(this),
            'line': this.cmdLine.bind(this),
            'square': this.cmdSquare.bind(this),
            'grid': this.cmdGrid.bind(this),
            'diamond': this.cmdDiamond.bind(this),
            'spiral': this.cmdSpiral.bind(this),
            
            // Action Commands
            'attack': this.cmdAttack.bind(this),
            'dance': this.cmdDance.bind(this),
            'wave': this.cmdWave.bind(this),
            'jump': this.cmdJump.bind(this),
            'spin': this.cmdSpin.bind(this),
            'bow': this.cmdBow.bind(this),
            'salute': this.cmdSalute.bind(this),
            
            // Chat Commands
            'say': this.cmdSay.bind(this),
            'broadcast': this.cmdBroadcast.bind(this),
            'whisper': this.cmdWhisper.bind(this),
            'announce': this.cmdAnnounce.bind(this),
            
            // Control Commands
            'remove': this.cmdRemove.bind(this),
            'kill': this.cmdKill.bind(this),
            'kick': this.cmdKick.bind(this),
            'ban': this.cmdBan.bind(this),
            'join': this.cmdJoin.bind(this),
            'leave': this.cmdLeave.bind(this),
            'reconnect': this.cmdReconnect.bind(this),
            'reset': this.cmdReset.bind(this),
            
            // Formation Commands
            'vformation': this.cmdVFormation.bind(this),
            'xformation': this.cmdXFormation.bind(this),
            'arrow': this.cmdArrow.bind(this),
            'heart': this.cmdHeart.bind(this),
            'star': this.cmdStar.bind(this),
            'cross': this.cmdCross.bind(this),
            
            // Utility Commands
            'count': this.cmdCount.bind(this),
            'uptime': this.cmdUptime.bind(this),
            'memory': this.cmdMemory.bind(this),
            'clearall': this.cmdClearAll.bind(this),
            'helpall': this.cmdHelpAll.bind(this)
        };
        
        // Auto-status display
        setInterval(() => this.displayStatus(), 60000);
    }

    // ============================================
    // NAME GENERATION
    // ============================================
    getUniqueName() {
        const available = BOT_NAMES.filter(name => !this.usedNames.has(name));
        if (available.length === 0) {
            const name = `Bot_${this.usedNames.size}_${Math.floor(Math.random() * 9999)}`;
            this.usedNames.add(name);
            return name;
        }
        const name = available[Math.floor(Math.random() * available.length)];
        this.usedNames.add(name);
        return name;
    }

    // ============================================
    // BOT SPAWNING
    // ============================================
    async spawnBot() {
        const username = this.getUniqueName();
        const password = PASSWORDS[Math.floor(Math.random() * PASSWORDS.length)];
        const botId = this.bots.length;
        
        return new Promise((resolve) => {
            console.log(`🤖 [${botId}] Spawning: ${username}`);
            
            const bot = mineflayer.createBot({
                host: config.server_ip,
                port: config.server_port,
                username: username,
                version: config.server_version,
                auth: 'offline',
                physicsEnabled: false,
                reconnectDelay: 0,
                defaultPosition: [0, 65, 0],
                skipValidation: true,
                checkTimeoutInterval: 120000,
                keepAlive: true,
                hideErrors: true
            });

            let connected = false;
            let registered = false;
            
            const timeout = setTimeout(() => {
                if (!connected) {
                    console.log(`❌ [${botId}] ${username} timeout`);
                    bot.end();
                    resolve(false);
                }
            }, 15000);

            // ============================================
            // LOGIN HANDLER
            // ============================================
            bot.on('login', () => {
                connected = true;
                clearTimeout(timeout);
                
                bot.botId = botId;
                bot.username = username;
                bot.password = password;
                bot.connected = true;
                bot.registered = false;
                bot.x = 0;
                bot.y = 65;
                bot.z = 0;
                bot.selected = false;
                
                this.bots.push(bot);
                this.totalJoined++;
                
                console.log(`✅ [${botId}] ${username} joined! (${this.bots.length}/${config.max_bots})`);
                
                // Auto register
                if (config.auto_register) {
                    this.autoRegister(bot, password);
                }
                
                // Send join message
                setTimeout(() => {
                    if (bot.connected) {
                        bot.chat('/me joined! 🤖');
                    }
                }, 2000);
                
                // Setup chat listener
                bot.on('message', (message) => {
                    this.handleChatMessage(message, bot);
                });
                
                // Handle movement errors silently
                bot.on('error', (err) => {
                    if (err.message && err.message.includes('move')) return;
                    if (err.message && err.message.includes('timeout')) return;
                    console.log(`⚠️ [${botId}] ${username} error:`, err.message);
                });
                
                bot.on('end', () => {
                    bot.connected = false;
                    this.totalRemoved++;
                    console.log(`📡 [${botId}] ${username} disconnected`);
                });
                
                bot.on('kickDisconnect', (reason) => {
                    if (reason && reason.includes('move')) return;
                    bot.connected = false;
                    this.totalRemoved++;
                    console.log(`👢 [${botId}] ${username} kicked:`, reason);
                });
                
                resolve(true);
            });
        });
    }

    // ============================================
    // AUTO REGISTRATION
    // ============================================
    autoRegister(bot, password) {
        const commands = [
            `/register ${password} ${password}`,
            `/reg ${password} ${password}`,
            `/login ${password}`,
            `/l ${password}`
        ];
        
        let index = 0;
        const sendNext = () => {
            if (index >= commands.length || bot.registered || !bot.connected) {
                if (bot.connected) {
                    bot.chat('/me registered! ✅');
                }
                return;
            }
            bot.chat(commands[index]);
            index++;
            setTimeout(sendNext, 400);
        };
        sendNext();
    }

    // ============================================
    // CHAT HANDLER
    // ============================================
    handleChatMessage(message, bot) {
        const text = message.toString();
        
        // Check registration
        if (text.includes('registered') || text.includes('Registered')) {
            bot.registered = true;
            console.log(`✅ ${bot.username} registered`);
        }
        
        // Check commands
        if (text.startsWith(config.command_prefix)) {
            const command = text.slice(1).trim();
            this.executeCommand(command, bot);
        }
        
        // Track messages
        if (text.includes('joined') || text.includes('left')) {
            this.commandHistory.push({
                time: Date.now(),
                message: text,
                bot: bot.username
            });
        }
    }

    // ============================================
    // COMMAND EXECUTOR
    // ============================================
    executeCommand(input, bot) {
        const parts = input.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        if (this.commands[cmd]) {
            this.commands[cmd](bot, args);
        } else {
            bot.chat(`❌ Unknown command: ${cmd}. Use !help`);
        }
    }

    // ============================================
    // COMMAND IMPLEMENTATIONS
    // ============================================
    
    // ----- BASIC COMMANDS -----
    cmdPing(bot, args) {
        bot.chat(`🏓 Pong! ${bot.username} is alive (${Date.now() - this.startTime}ms)`);
    }

    cmdHelp(bot, args) {
        const help = `=== 🚀 ULTRA BOT COMMANDS ===
📊 BASIC: !ping, !help, !status, !info, !list
👥 SELECT: !army, !select N, !clear, !all, !none
📍 MOVE: !move X Y Z, !tp X Y Z, !circle NAME, !formation
🎯 FORM: !spread, !follow NAME, !line, !square, !grid, !diamond
⚔️ ACTION: !attack, !dance, !wave, !jump, !spin, !bow, !salute
💬 CHAT: !say MSG, !broadcast MSG, !whisper NAME MSG
🔧 CONTROL: !remove NAME, !kill NAME, !join, !leave
⭐ FORMATIONS: !vformation, !xformation, !arrow, !heart, !star, !cross
📈 UTILITY: !count, !uptime, !memory, !clearall, !helpall`;
        bot.chat(help);
    }

    cmdStatus(bot, args) {
        const active = this.bots.filter(b => b.connected).length;
        const selected = this.selectedBots.size;
        const registered = this.bots.filter(b => b.registered).length;
        bot.chat(`📊 Status: ${active}/${this.bots.length} active | Selected: ${selected} | Registered: ${registered} | Joined: ${this.totalJoined} | Removed: ${this.totalRemoved}`);
    }

    cmdInfo(bot, args) {
        const info = `=== 🤖 BOT INFO ===
Name: ${bot.username}
ID: ${bot.botId}
Connected: ${bot.connected}
Registered: ${bot.registered || false}
Position: (0, 65, 0)
Total Bots: ${this.bots.length}
Selected: ${this.selectedBots.size}
Runner: ${this.runnerId}`;
        bot.chat(info);
    }

    cmdList(bot, args) {
        const botList = this.bots
            .filter(b => b.connected)
            .map(b => `${b.username}${b.registered ? '✅' : '❌'}`)
            .join(', ');
        bot.chat(`📋 Bots: ${botList || 'None'}`);
    }

    // ----- SELECTION COMMANDS -----
    cmdArmy(bot, args) {
        this.selectedBots.clear();
        const connected = this.bots.filter(b => b.connected && b.botId !== bot.botId);
        connected.forEach(b => {
            this.selectedBots.add(b.botId);
            b.chat('📢 You are now part of the ARMY!');
        });
        bot.chat(`✅ ARMY formed with ${connected.length} bots!`);
    }

    cmdSelect(bot, args) {
        const count = parseInt(args[0]) || 10;
        const connected = this.bots.filter(b => b.connected && b.botId !== bot.botId);
        let selected = 0;
        for (const b of connected) {
            if (selected >= count) break;
            this.selectedBots.add(b.botId);
            b.chat(`✅ Selected for army!`);
            selected++;
        }
        bot.chat(`✅ Selected ${selected} bots!`);
    }

    cmdClear(bot, args) {
        this.selectedBots.clear();
        bot.chat('✅ Selection cleared!');
    }

    cmdAll(bot, args) {
        this.selectedBots.clear();
        this.bots.forEach(b => {
            if (b.connected) {
                this.selectedBots.add(b.botId);
            }
        });
        bot.chat(`✅ All ${this.selectedBots.size} bots selected!`);
    }

    cmdNone(bot, args) {
        this.selectedBots.clear();
        bot.chat('✅ Selection cleared!');
    }

    // ----- MOVEMENT COMMANDS -----
    cmdMove(bot, args) {
        if (args.length < 3) {
            bot.chat('Usage: !move <x> <y> <z>');
            return;
        }
        const x = parseFloat(args[0]);
        const y = parseFloat(args[1]);
        const z = parseFloat(args[2]);
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            b.chat(`/tp ${b.username} ${x} ${y} ${z}`);
        });
        bot.chat(`✅ Moved ${targets.length} bots to (${x}, ${y}, ${z})`);
    }

    cmdTp(bot, args) {
        this.cmdMove(bot, args);
    }

    cmdCircle(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !circle <player> [radius] [count]');
            return;
        }
        const targetName = args[0];
        const radius = parseFloat(args[1]) || 10;
        const count = parseInt(args[2]) || 50;
        
        // Find target
        let target = null;
        for (const b of this.bots) {
            if (b.username.toLowerCase() === targetName.toLowerCase() && b.connected) {
                target = b;
                break;
            }
        }
        if (!target) {
            bot.chat(`❌ Player ${targetName} not found`);
            return;
        }
        
        const targets = this.getTargetBots(bot);
        const useCount = Math.min(targets.length, count);
        
        for (let i = 0; i < useCount; i++) {
            const angle = (2 * Math.PI * i) / useCount;
            const x = (target.x || 0) + radius * Math.cos(angle);
            const z = (target.z || 0) + radius * Math.sin(angle);
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat(`✅ Circle around ${targetName} with ${useCount} bots!`);
    }

    cmdFormation(bot, args) {
        const targets = this.getTargetBots(bot);
        if (targets.length === 0) {
            bot.chat('❌ No bots selected! Use !army first');
            return;
        }
        
        const size = Math.ceil(Math.sqrt(targets.length));
        const startX = (bot.x || 0) - (size * 2.5);
        const startZ = (bot.z || 0) - (size * 2.5);
        
        for (let i = 0; i < targets.length && i < size * size; i++) {
            const row = Math.floor(i / size);
            const col = i % size;
            const x = startX + (col * 3);
            const z = startZ + (row * 3);
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat(`✅ Formation with ${Math.min(targets.length, size * size)} bots!`);
    }

    cmdSpread(bot, args) {
        const targets = this.getTargetBots(bot);
        const range = parseFloat(args[0]) || 30;
        
        for (const b of targets) {
            if (b.connected) {
                const x = (bot.x || 0) + (Math.random() - 0.5) * range * 2;
                const z = (bot.z || 0) + (Math.random() - 0.5) * range * 2;
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat(`✅ Spread ${targets.length} bots!`);
    }

    cmdFollow(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !follow <player>');
            return;
        }
        const targetName = args[0];
        let target = null;
        for (const b of this.bots) {
            if (b.username.toLowerCase() === targetName.toLowerCase() && b.connected) {
                target = b;
                break;
            }
        }
        if (!target) {
            bot.chat(`❌ Player ${targetName} not found`);
            return;
        }
        
        const targets = this.getTargetBots(bot);
        for (let i = 0; i < targets.length && i < 30; i++) {
            const offset = 2 + (i % 5);
            const b = targets[i];
            if (b.connected) {
                const x = (target.x || 0) + (Math.random() - 0.5) * offset * 2;
                const z = (target.z || 0) + (Math.random() - 0.5) * offset * 2;
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat(`✅ Following ${targetName}!`);
    }

    cmdGoto(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !goto <player>');
            return;
        }
        this.cmdFollow(bot, args);
    }

    cmdLine(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = targets.length;
        if (count === 0) {
            bot.chat('❌ No bots selected!');
            return;
        }
        
        const spacing = parseFloat(args[0]) || 2;
        const startX = (bot.x || 0) - (count * spacing / 2);
        
        for (let i = 0; i < count; i++) {
            const b = targets[i];
            if (b.connected) {
                const x = startX + i * spacing;
                b.chat(`/tp ${b.username} ${x} 65 ${bot.z || 0}`);
            }
        }
        bot.chat(`✅ Line formation with ${count} bots!`);
    }

    cmdSquare(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 40);
        const size = parseFloat(args[0]) || 20;
        const perSide = Math.ceil(count / 4);
        
        for (let i = 0; i < count; i++) {
            const side = Math.floor(i / perSide);
            const pos = i % perSide;
            let x = 0, z = 0;
            switch(side) {
                case 0: x = -size/2 + (pos / perSide) * size; z = -size/2; break;
                case 1: x = size/2; z = -size/2 + (pos / perSide) * size; break;
                case 2: x = size/2 - (pos / perSide) * size; z = size/2; break;
                case 3: x = -size/2; z = size/2 - (pos / perSide) * size; break;
            }
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${(bot.x || 0) + x} 65 ${(bot.z || 0) + z}`);
            }
        }
        bot.chat(`✅ Square formation with ${count} bots!`);
    }

    cmdGrid(bot, args) {
        const targets = this.getTargetBots(bot);
        const cols = parseInt(args[0]) || 10;
        const spacing = parseFloat(args[1]) || 3;
        
        for (let i = 0; i < targets.length && i < 100; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const b = targets[i];
            if (b.connected) {
                const x = (bot.x || 0) + (col - cols/2) * spacing;
                const z = (bot.z || 0) + row * spacing;
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat(`✅ Grid formation!`);
    }

    cmdDiamond(bot, args) {
        const targets = this.getTargetBots(bot);
        const size = parseFloat(args[0]) || 15;
        
        for (let i = 0; i < targets.length && i < 50; i++) {
            const angle = (2 * Math.PI * i) / targets.length;
            const r = size * Math.abs(Math.sin(2 * angle));
            const x = (bot.x || 0) + r * Math.cos(angle);
            const z = (bot.z || 0) + r * Math.sin(angle);
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat(`✅ Diamond formation!`);
    }

    cmdSpiral(bot, args) {
        const targets = this.getTargetBots(bot);
        const radius = parseFloat(args[0]) || 20;
        const turns = parseFloat(args[1]) || 3;
        
        for (let i = 0; i < targets.length && i < 50; i++) {
            const t = i / targets.length;
            const r = radius * t;
            const angle = 2 * Math.PI * turns * t;
            const x = (bot.x || 0) + r * Math.cos(angle);
            const z = (bot.z || 0) + r * Math.sin(angle);
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat(`✅ Spiral formation!`);
    }

    // ----- ACTION COMMANDS -----
    cmdAttack(bot, args) {
        let target = null;
        if (args[0]) {
            for (const b of this.bots) {
                if (b.username.toLowerCase() === args[0].toLowerCase() && b.connected) {
                    target = b;
                    break;
                }
            }
        }
        if (!target) {
            const connected = this.bots.filter(b => b.connected && b.botId !== bot.botId);
            if (connected.length > 0) {
                target = connected[Math.floor(Math.random() * connected.length)];
            }
        }
        if (target) {
            const targets = this.getTargetBots(bot);
            for (const b of targets.slice(0, 30)) {
                if (b.connected) {
                    const x = (target.x || 0) + (Math.random() - 0.5) * 6;
                    const z = (target.z || 0) + (Math.random() - 0.5) * 6;
                    b.chat(`/tp ${b.username} ${x} 65 ${z}`);
                    b.chat(`/me attacks ${target.username}! ⚔️`);
                }
            }
            bot.chat(`⚔️ Attacking ${target.username}!`);
        } else {
            bot.chat('❌ No target found');
        }
    }

    cmdDance(bot, args) {
        const targets = this.getTargetBots(bot);
        const moves = [
            [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]
        ];
        for (const move of moves) {
            for (const b of targets.slice(0, 30)) {
                if (b.connected) {
                    const x = (b.x || 0) + move[0];
                    const z = (b.z || 0) + move[2];
                    b.chat(`/tp ${b.username} ${x} 65 ${z}`);
                    b.chat('/me dances! 💃');
                }
            }
        }
        bot.chat('💃 Dance complete!');
    }

    cmdWave(bot, args) {
        const targets = this.getTargetBots(bot);
        for (const b of targets.slice(0, 30)) {
            if (b.connected) {
                b.chat('/me waves! 👋');
            }
        }
        bot.chat('👋 Wave!');
    }

    cmdJump(bot, args) {
        const targets = this.getTargetBots(bot);
        for (const b of targets.slice(0, 30)) {
            if (b.connected) {
                b.chat('/me jumps! 🦘');
            }
        }
        bot.chat('🦘 Jump!');
    }

    cmdSpin(bot, args) {
        const targets = this.getTargetBots(bot);
        for (const b of targets.slice(0, 20)) {
            if (b.connected) {
                b.chat('/me spins! 🔄');
            }
        }
        bot.chat('🔄 Spin!');
    }

    cmdBow(bot, args) {
        const targets = this.getTargetBots(bot);
        for (const b of targets.slice(0, 20)) {
            if (b.connected) {
                b.chat('/me bows! 🙇');
            }
        }
        bot.chat('🙇 Bow!');
    }

    cmdSalute(bot, args) {
        const targets = this.getTargetBots(bot);
        for (const b of targets.slice(0, 20)) {
            if (b.connected) {
                b.chat('/me salutes! 🫡');
            }
        }
        bot.chat('🫡 Salute!');
    }

    // ----- CHAT COMMANDS -----
    cmdSay(bot, args) {
        if (args.length === 0) {
            bot.chat('Usage: !say <message>');
            return;
        }
        const msg = args.join(' ');
        const targets = this.getTargetBots(bot);
        for (const b of targets) {
            if (b.connected) {
                b.chat(msg);
            }
        }
        bot.chat(`✅ Said: ${msg}`);
    }

    cmdBroadcast(bot, args) {
        if (args.length === 0) {
            bot.chat('Usage: !broadcast <message>');
            return;
        }
        const msg = args.join(' ');
        for (const b of this.bots) {
            if (b.connected) {
                b.chat(`📢 ${msg}`);
            }
        }
        bot.chat(`📢 Broadcast: ${msg}`);
    }

    cmdWhisper(bot, args) {
        if (args.length < 2) {
            bot.chat('Usage: !whisper <player> <message>');
            return;
        }
        const targetName = args[0];
        const msg = args.slice(1).join(' ');
        let target = null;
        for (const b of this.bots) {
            if (b.username.toLowerCase() === targetName.toLowerCase() && b.connected) {
                target = b;
                break;
            }
        }
        if (target) {
            target.chat(`🤫 ${bot.username} whispers: ${msg}`);
            bot.chat(`✅ Whispered to ${targetName}`);
        } else {
            bot.chat(`❌ Player ${targetName} not found`);
        }
    }

    cmdAnnounce(bot, args) {
        if (args.length === 0) {
            bot.chat('Usage: !announce <message>');
            return;
        }
        const msg = args.join(' ');
        for (const b of this.bots) {
            if (b.connected) {
                b.chat(`📣 ANNOUNCEMENT: ${msg}`);
            }
        }
        bot.chat(`📣 Announcement: ${msg}`);
    }

    // ----- CONTROL COMMANDS -----
    cmdRemove(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !remove <username>');
            return;
        }
        const targetName = args[0];
        for (const b of this.bots) {
            if (b.username.toLowerCase() === targetName.toLowerCase() && b.connected) {
                b.end();
                b.connected = false;
                this.totalRemoved++;
                bot.chat(`✅ Removed ${targetName}`);
                for (const other of this.bots) {
                    if (other.connected && other.botId !== bot.botId) {
                        other.chat(`Bot ${targetName} was removed!`);
                    }
                }
                return;
            }
        }
        bot.chat(`❌ Bot ${targetName} not found`);
    }

    cmdKill(bot, args) {
        this.cmdRemove(bot, args);
    }

    cmdKick(bot, args) {
        this.cmdRemove(bot, args);
    }

    cmdBan(bot, args) {
        this.cmdRemove(bot, args);
    }

    cmdJoin(bot, args) {
        const count = parseInt(args[0]) || 10;
        bot.chat(`🔄 Joining ${count} more bots...`);
        for (let i = 0; i < count; i++) {
            setTimeout(() => this.spawnBot(), i * 1000);
        }
    }

    cmdLeave(bot, args) {
        bot.chat('👋 Leaving...');
        setTimeout(() => {
            bot.end();
        }, 1000);
    }

    cmdReconnect(bot, args) {
        bot.chat('🔄 Reconnecting...');
        setTimeout(() => {
            bot.end();
            setTimeout(() => this.spawnBot(), 2000);
        }, 1000);
    }

    cmdReset(bot, args) {
        bot.chat('🔄 Resetting all bots...');
        for (const b of this.bots) {
            if (b.connected) {
                b.end();
            }
        }
        this.bots = [];
        this.selectedBots.clear();
        setTimeout(() => {
            this.spawnAllBots();
        }, 3000);
    }

    // ----- FORMATION COMMANDS -----
    cmdVFormation(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 50);
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const x = (bot.x || 0) - t * 20 + 10;
            const z = (bot.z || 0) - i * 1.5 + 30;
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat(`✅ V-Formation!`);
    }

    cmdXFormation(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 50);
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const x1 = (bot.x || 0) - t * 20 + 10;
            const x2 = (bot.x || 0) + t * 20 - 10;
            const z = (bot.z || 0) - i * 1.5 + 30;
            const b = targets[i];
            if (b.connected) {
                const x = i % 2 === 0 ? x1 : x2;
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat(`✅ X-Formation!`);
    }

    cmdArrow(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 40);
        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / 5);
            const col = i % 5;
            const x = (bot.x || 0) + (col - 2) * 2;
            const z = (bot.z || 0) + row * 3 + 5;
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b
