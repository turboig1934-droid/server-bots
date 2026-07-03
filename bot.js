const mineflayer = require('mineflayer');
const fs = require('fs');

// Configuration
const config = {
    server_ip: 'node.harshteotia.in',
    server_port: 25565,
    bots_per_runner: 100,
    bot_spawn_delay: 300,
    max_bots: 100,
    server_version: '1.16.5',
    command_prefix: '!'
};

try {
    const configFile = fs.readFileSync('config.json', 'utf8');
    Object.assign(config, JSON.parse(configFile));
} catch (e) {
    console.log('📝 Using default config');
}

class BotManager {
    constructor() {
        this.bots = [];
        this.selectedBots = new Set();
        this.runnerId = process.env.RUNNER_ID || 'runner1';
        this.totalJoined = 0;
        this.totalRemoved = 0;
        this.usedNames = new Set();
        this.botNames = this.generateNames();
        this.startTime = Date.now();
        
        // All commands
        this.commands = {
            'ping': this.cmdPing.bind(this),
            'help': this.cmdHelp.bind(this),
            'status': this.cmdStatus.bind(this),
            'info': this.cmdInfo.bind(this),
            'list': this.cmdList.bind(this),
            'army': this.cmdArmy.bind(this),
            'select': this.cmdSelect.bind(this),
            'clear': this.cmdClear.bind(this),
            'all': this.cmdAll.bind(this),
            'move': this.cmdMove.bind(this),
            'tp': this.cmdTp.bind(this),
            'circle': this.cmdCircle.bind(this),
            'formation': this.cmdFormation.bind(this),
            'spread': this.cmdSpread.bind(this),
            'follow': this.cmdFollow.bind(this),
            'attack': this.cmdAttack.bind(this),
            'dance': this.cmdDance.bind(this),
            'wave': this.cmdWave.bind(this),
            'say': this.cmdSay.bind(this),
            'broadcast': this.cmdBroadcast.bind(this),
            'remove': this.cmdRemove.bind(this),
            'kill': this.cmdKill.bind(this),
            'join': this.cmdJoin.bind(this),
            'leave': this.cmdLeave.bind(this),
            'count': this.cmdCount.bind(this),
            'heart': this.cmdHeart.bind(this),
            'star': this.cmdStar.bind(this),
            'vformation': this.cmdVFormation.bind(this)
        };
        
        setInterval(() => this.displayStatus(), 60000);
    }

    generateNames() {
        const names = [];
        const prefixes = ['Bot', 'Player', 'Hero', 'Ace', 'Pro', 'Nitro', 'Blaze', 'Shadow', 'Frost'];
        const randoms = ['Nitro', 'Blaze', 'Shadow', 'Frost', 'Storm', 'Venom', 'Raven', 'Lunar',
            'Solar', 'Nova', 'Zephyr', 'Phantom', 'Viper', 'Cobra', 'Falcon', 'Eagle',
            'Titan', 'Atlas', 'Neon', 'Cosmic', 'Galaxy', 'Quantum', 'Zen', 'Karma',
            'Apex', 'Rogue', 'Sage', 'Hawk', 'Wolf', 'Bear', 'Lion', 'Tiger'];
        
        for (let i = 0; i < 100; i++) {
            prefixes.forEach(p => names.push(`${p}${i}`));
        }
        randoms.forEach(name => {
            names.push(name);
            for (let i = 0; i < 3; i++) names.push(`${name}${i}`);
        });
        
        return names;
    }

    getUniqueName() {
        const available = this.botNames.filter(n => !this.usedNames.has(n));
        if (available.length === 0) {
            const name = `Bot_${this.usedNames.size}`;
            this.usedNames.add(name);
            return name;
        }
        const name = available[Math.floor(Math.random() * available.length)];
        this.usedNames.add(name);
        return name;
    }

    async spawnBot() {
        const username = this.getUniqueName();
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
                hideErrors: true,
                keepAlive: true,
                checkTimeoutInterval: 60000,
                defaultPosition: [0, 65, 0]
            });

            let connected = false;

            const timeout = setTimeout(() => {
                if (!connected) {
                    console.log(`❌ [${botId}] ${username} timeout`);
                    bot.end();
                    resolve(false);
                }
            }, 15000);

            // ============================================
            // LOGIN - SUCCESS
            // ============================================
            bot.on('login', () => {
                connected = true;
                clearTimeout(timeout);
                
                bot.botId = botId;
                bot.username = username;
                bot.connected = true;
                bot.x = 0;
                bot.y = 65;
                bot.z = 0;

                this.bots.push(bot);
                this.totalJoined++;
                
                console.log(`✅ [${botId}] ${username} joined! (${this.bots.length}/${config.max_bots})`);

                // Send join message
                setTimeout(() => {
                    if (bot.connected) {
                        bot.chat('/me joined! 🤖');
                    }
                }, 2000);

                // ============================================
                // CHAT LISTENER - COMMANDS WORK HERE
                // ============================================
                bot.on('message', (message) => {
                    const text = message.toString();
                    
                    // Check for commands
                    if (text.startsWith(config.command_prefix)) {
                        const command = text.slice(config.command_prefix.length).trim();
                        console.log(`📝 Command from ${username}: ${command}`);
                        this.executeCommand(command, bot);
                    }
                });

                // Handle errors
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
                    bot.connected = false;
                    this.totalRemoved++;
                    console.log(`👢 [${botId}] ${username} kicked:`, reason);
                });

                resolve(true);
            });
        });
    }

    // ============================================
    // COMMAND EXECUTOR
    // ============================================
    executeCommand(input, bot) {
        const parts = input.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        if (this.commands[cmd]) {
            try {
                this.commands[cmd](bot, args);
            } catch (e) {
                bot.chat(`❌ Error: ${e.message}`);
            }
        } else {
            bot.chat(`❌ Unknown command: ${cmd}. Use !help`);
        }
    }

    // ============================================
    // COMMAND IMPLEMENTATIONS
    // ============================================
    
    cmdPing(bot, args) {
        bot.chat(`🏓 Pong! ${bot.username} is alive`);
    }

    cmdHelp(bot, args) {
        const help = `=== 🚀 BOT COMMANDS ===
!ping - Check bot status
!help - Show this help
!status - Show bot statistics
!info - Show bot info
!list - List all bots
!army - Select ALL bots
!select N - Select N bots
!clear - Clear selection
!all - Select all bots
!move X Y Z - Move bots
!tp X Y Z - Teleport bots
!circle NAME - Circle around player
!formation - Battle formation
!spread - Spread bots
!follow NAME - Follow player
!attack - Attack!
!dance - Dance!
!wave - Wave!
!say MSG - Send message
!broadcast MSG - Broadcast
!remove NAME - Remove bot
!kill NAME - Kill bot
!join N - Spawn more bots
!leave - Bot leaves
!count - Count bots
!heart - Heart formation
!star - Star formation
!vformation - V formation`;
        bot.chat(help);
    }

    cmdStatus(bot, args) {
        const active = this.bots.filter(b => b.connected).length;
        const selected = this.selectedBots.size;
        bot.chat(`📊 Active: ${active}/${this.bots.length} | Selected: ${selected} | Joined: ${this.totalJoined} | Removed: ${this.totalRemoved}`);
    }

    cmdInfo(bot, args) {
        const info = `=== 🤖 BOT INFO ===
Name: ${bot.username}
ID: ${bot.botId}
Connected: ${bot.connected}
Total Bots: ${this.bots.length}
Selected: ${this.selectedBots.size}
Runner: ${this.runnerId}`;
        bot.chat(info);
    }

    cmdList(bot, args) {
        const list = this.bots
            .filter(b => b.connected)
            .map(b => b.username)
            .join(', ');
        bot.chat(`📋 Bots: ${list || 'None'}`);
    }

    // ----- SELECTION -----
    cmdArmy(bot, args) {
        this.selectedBots.clear();
        const connected = this.bots.filter(b => b.connected && b.botId !== bot.botId);
        connected.forEach(b => {
            this.selectedBots.add(b.botId);
            setTimeout(() => { if (b.connected) b.chat('📢 Army!'); }, 100);
        });
        bot.chat(`✅ Army with ${connected.length} bots!`);
    }

    cmdSelect(bot, args) {
        const count = parseInt(args[0]) || 10;
        const connected = this.bots.filter(b => b.connected && b.botId !== bot.botId);
        let selected = 0;
        for (const b of connected) {
            if (selected >= count) break;
            this.selectedBots.add(b.botId);
            selected++;
        }
        bot.chat(`✅ Selected ${selected} bots!`);
    }

    cmdClear(bot, args) {
        this.selectedBots.clear();
        bot.chat('✅ Cleared!');
    }

    cmdAll(bot, args) {
        this.selectedBots.clear();
        this.bots.forEach(b => {
            if (b.connected) this.selectedBots.add(b.botId);
        });
        bot.chat(`✅ All ${this.selectedBots.size} bots selected!`);
    }

    // ----- MOVEMENT -----
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
            if (b.connected) b.chat(`/tp ${b.username} ${x} ${y} ${z}`);
        });
        bot.chat(`✅ Moved ${targets.length} bots!`);
    }

    cmdTp(bot, args) {
        this.cmdMove(bot, args);
    }

    cmdCircle(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !circle <player> [radius]');
            return;
        }
        const targetName = args[0];
        const radius = parseFloat(args[1]) || 10;
        
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
        const count = Math.min(targets.length, 50);
        
        for (let i = 0; i < count; i++) {
            const angle = (2 * Math.PI * i) / count;
            const x = (target.x || 0) + radius * Math.cos(angle);
            const z = (target.z || 0) + radius * Math.sin(angle);
            const b = targets[i];
            if (b.connected) {
                setTimeout(() => {
                    b.chat(`/tp ${b.username} ${x} 65 ${z}`);
                }, i * 50);
            }
        }
        bot.chat(`✅ Circle with ${count} bots!`);
    }

    cmdFormation(bot, args) {
        const targets = this.getTargetBots(bot);
        if (targets.length === 0) {
            bot.chat('❌ No bots selected! Use !army');
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
        bot.chat(`✅ Formation!`);
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
        for (let i = 0; i < targets.length && i < 20; i++) {
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

    // ----- ACTIONS -----
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
            if (connected.length > 0) target = connected[Math.floor(Math.random() * connected.length)];
        }
        if (target) {
            const targets = this.getTargetBots(bot);
            for (const b of targets.slice(0, 20)) {
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
        const moves = [[1,0,0], [-1,0,0], [0,0,1], [0,0,-1]];
        for (const move of moves) {
            for (const b of targets.slice(0, 20)) {
                if (b.connected) {
                    const x = (b.x || 0) + move[0];
                    const z = (b.z || 0) + move[2];
                    b.chat(`/tp ${b.username} ${x} 65 ${z}`);
                    b.chat('/me dances! 💃');
                }
            }
        }
        bot.chat('💃 Dance!');
    }

    cmdWave(bot, args) {
        const targets = this.getTargetBots(bot);
        for (const b of targets.slice(0, 20)) {
            if (b.connected) b.chat('/me waves! 👋');
        }
        bot.chat('👋 Wave!');
    }

    // ----- CHAT -----
    cmdSay(bot, args) {
        if (args.length === 0) {
            bot.chat('Usage: !say <message>');
            return;
        }
        const msg = args.join(' ');
        const targets = this.getTargetBots(bot);
        for (const b of targets) {
            if (b.connected) b.chat(msg);
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
            if (b.connected) b.chat(`📢 ${msg}`);
        }
        bot.chat(`📢 Broadcast: ${msg}`);
    }

    // ----- CONTROL -----
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
                return;
            }
        }
        bot.chat(`❌ Bot ${targetName} not found`);
    }

    cmdKill(bot, args) { this.cmdRemove(bot, args); }

    cmdJoin(bot, args) {
        const count = parseInt(args[0]) || 10;
        bot.chat(`🔄 Joining ${count} more bots...`);
        for (let i = 0; i < count; i++) {
            setTimeout(() => this.spawnBot(), i * 1000);
        }
    }

    cmdLeave(bot, args) {
        bot.chat('👋 Leaving...');
        setTimeout(() => { bot.end(); }, 1000);
    }

    cmdCount(bot, args) {
        const active = this.bots.filter(b => b.connected).length;
        bot.chat(`📊 Total: ${this.bots.length} | Active: ${active} | Removed: ${this.totalRemoved}`);
    }

    // ----- FORMATIONS -----
    cmdHeart(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 40);
        for (let i = 0; i < count; i++) {
            const t = (i / count) * 2 * Math.PI;
            const x = 16 * Math.pow(Math.sin(t), 3);
            const z = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${(bot.x || 0) + x} 65 ${(bot.z || 0) + z}`);
            }
        }
        bot.chat('❤️ Heart!');
    }

    cmdStar(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 40);
        for (let i = 0; i < count; i++) {
            const t = (i / count) * 2 * Math.PI;
            const r = 15 * Math.cos(5 * t) / Math.cos(t);
            const x = r * Math.cos(t);
            const z = r * Math.sin(t);
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${(bot.x || 0) + x} 65 ${(bot.z || 0) + z}`);
            }
        }
        bot.chat('⭐ Star!');
    }

    cmdVFormation(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 30);
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const x = (bot.x || 0) - t * 20 + 10;
            const z = (bot.z || 0) + i * 1.5;
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat('✅ V-Formation!');
    }

    // ============================================
    // HELPERS
    // ============================================
    getTargetBots(bot) {
        if (this.selectedBots.size === 0) {
            return this.bots.filter(b => b.connected && b.botId !== bot.botId);
        }
        return this.bots.filter(b => 
            this.selectedBots.has(b.botId) && b.connected && b.botId !== bot.botId
        );
    }

    displayStatus() {
        const active = this.bots.filter(b => b.connected).length;
        console.log(`📊 STATUS: ${active}/${this.bots.length} active | Selected: ${this.selectedBots.size} | Runner: ${this.runnerId}`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================
    // SPAWN ALL BOTS
    // ============================================
    async spawnAllBots() {
        const maxBots = Math.min(config.bots_per_runner, config.max_bots);
        let spawned = 0;

        console.log('='.repeat(60));
        console.log(`🚀 BOT SYSTEM`);
        console.log(`🏷️ Runner: ${this.runnerId}`);
        console.log(`🎯 Server: ${config.server_ip}:${config.server_port}`);
        console.log(`🤖 Bots: ${maxBots}`);
        console.log('='.repeat(60));

        for (let i = 0; i < maxBots * 2 && spawned < maxBots; i++) {
            const success = await this.spawnBot();
            if (success) {
                spawned++;
                await this.sleep(config.bot_spawn_delay);
            } else {
                console.log(`⚠️ Retry ${i + 1}`);
                await this.sleep(2000);
            }
        }

        console.log(`✅ Spawned ${spawned} bots!`);
    }

    // ============================================
    // START
    // ============================================
    async start() {
        await this.spawnAllBots();

        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down...');
            for (const bot of this.bots) {
                if (bot.connected) bot.end();
            }
            process.exit();
        });

        process.on('SIGTERM', () => {
            console.log('\n🛑 Shutting down...');
            for (const bot of this.bots) {
                if (bot.connected) bot.end();
            }
            process.exit();
        });
        
        return new Promise(() => {});
    }
}

// ============================================
// RUN
// ============================================
const manager = new BotManager();

process.on('uncaughtException', (err) => {
    console.log('⚠️ Error:', err.message);
});

manager.start().catch((err) => {
    console.error('❌ Fatal:', err);
    process.exit(1);
});
