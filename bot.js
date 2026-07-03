// ============================================
// COMPLETE BOT SYSTEM - ALL FEATURES
// IP READ FROM config.json
// ============================================

const mineflayer = require('mineflayer');
const fs = require('fs');

// ============================================
// LOAD CONFIG - IP ONLY HERE
// ============================================
const CONFIG = JSON.parse(fs.readFileSync('config.json', 'utf8'));

console.log('='.repeat(60));
console.log('🚀 ULTRA BOT SYSTEM');
console.log(`🎯 Server: ${CONFIG.server_ip}:${CONFIG.server_port}`);
console.log(`🤖 Max Bots: ${CONFIG.max_bots}`);
console.log('='.repeat(60));

// ============================================
// BOT NAMES
// ============================================
const BOT_NAMES = [];
const PREFIXES = ['Bot', 'Player', 'Hero', 'Ace', 'Pro', 'Nitro', 'Blaze', 'Shadow', 'Frost', 'Storm', 'Elite'];
const RANDOMS = ['Nitro', 'Blaze', 'Shadow', 'Frost', 'Storm', 'Venom', 'Raven', 'Lunar', 'Solar', 'Nova', 'Zephyr', 'Phantom', 'Viper', 'Cobra', 'Falcon', 'Eagle', 'Titan', 'Atlas', 'Neon', 'Cosmic', 'Galaxy', 'Quantum', 'Zen', 'Karma', 'Apex', 'Rogue', 'Sage', 'Hawk', 'Wolf', 'Bear', 'Lion', 'Tiger', 'Dragon', 'Phoenix'];

for (let i = 0; i < 100; i++) {
    PREFIXES.forEach(p => BOT_NAMES.push(`${p}${i}`));
}
RANDOMS.forEach(name => {
    BOT_NAMES.push(name);
    for (let i = 0; i < 3; i++) BOT_NAMES.push(`${name}${i}`);
});

// ============================================
// MAIN BOT MANAGER
// ============================================
class BotManager {
    constructor() {
        this.bots = [];
        this.selectedBots = new Set();
        this.runnerId = process.env.RUNNER_ID || 'runner1';
        this.totalJoined = 0;
        this.totalRemoved = 0;
        this.usedNames = new Set();
        this.startTime = Date.now();
        this.isSpawning = false;
        
        // ============================================
        // ALL COMMANDS
        // ============================================
        this.commands = {
            // Basic
            'ping': this.cmdPing.bind(this),
            'help': this.cmdHelp.bind(this),
            'status': this.cmdStatus.bind(this),
            'info': this.cmdInfo.bind(this),
            'list': this.cmdList.bind(this),
            
            // Selection
            'army': this.cmdArmy.bind(this),
            'select': this.cmdSelect.bind(this),
            'clear': this.cmdClear.bind(this),
            'all': this.cmdAll.bind(this),
            
            // Movement
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
            
            // PvP / Attack
            'attack': this.cmdAttack.bind(this),
            'pvp': this.cmdPvp.bind(this),
            'fight': this.cmdFight.bind(this),
            'kill': this.cmdKill.bind(this),
            'remove': this.cmdRemove.bind(this),
            
            // Actions
            'dance': this.cmdDance.bind(this),
            'wave': this.cmdWave.bind(this),
            'jump': this.cmdJump.bind(this),
            'spin': this.cmdSpin.bind(this),
            'bow': this.cmdBow.bind(this),
            'salute': this.cmdSalute.bind(this),
            
            // Chat
            'say': this.cmdSay.bind(this),
            'broadcast': this.cmdBroadcast.bind(this),
            'whisper': this.cmdWhisper.bind(this),
            'announce': this.cmdAnnounce.bind(this),
            
            // Formations
            'heart': this.cmdHeart.bind(this),
            'star': this.cmdStar.bind(this),
            'vformation': this.cmdVFormation.bind(this),
            'xformation': this.cmdXFormation.bind(this),
            'arrow': this.cmdArrow.bind(this),
            'cross': this.cmdCross.bind(this),
            
            // Control
            'join': this.cmdJoin.bind(this),
            'leave': this.cmdLeave.bind(this),
            'reconnect': this.cmdReconnect.bind(this),
            'reset': this.cmdReset.bind(this),
            'count': this.cmdCount.bind(this),
            'uptime': this.cmdUptime.bind(this)
        };
        
        setInterval(() => this.displayStatus(), 60000);
    }

    // ============================================
    // NAME GENERATION
    // ============================================
    getUniqueName() {
        const available = BOT_NAMES.filter(n => !this.usedNames.has(n));
        if (available.length === 0) {
            const name = `Bot_${this.usedNames.size}_${Math.floor(Math.random() * 999)}`;
            this.usedNames.add(name);
            return name;
        }
        const name = available[Math.floor(Math.random() * available.length)];
        this.usedNames.add(name);
        return name;
    }

    // ============================================
    // SPAWN BOT
    // ============================================
    async spawnBot() {
        const username = this.getUniqueName();
        const botId = this.bots.length;

        return new Promise((resolve) => {
            console.log(`🤖 [${botId}] Spawning: ${username}`);

            const bot = mineflayer.createBot({
                host: CONFIG.server_ip,
                port: CONFIG.server_port,
                username: username,
                version: CONFIG.server_version || '1.16.5',
                auth: 'offline',
                physicsEnabled: true,  // ENABLED for movement
                hideErrors: true,
                keepAlive: true,
                checkTimeoutInterval: 60000
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
            // LOGIN
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
                
                console.log(`✅ [${botId}] ${username} joined! (${this.bots.length}/${CONFIG.max_bots})`);

                // Send join message
                setTimeout(() => {
                    if (bot.connected) {
                        bot.chat('/me joined! 🤖');
                    }
                }, 2000);

                // ============================================
                // CHAT LISTENER - COMMANDS
                // ============================================
                bot.on('message', (message) => {
                    const text = message.toString();
                    
                    if (text.startsWith(CONFIG.command_prefix)) {
                        const command = text.slice(CONFIG.command_prefix.length).trim();
                        console.log(`📝 ${username}: ${command}`);
                        this.executeCommand(command, bot);
                    }
                });

                // Track position
                bot.on('move', () => {
                    if (bot.entity) {
                        bot.x = bot.entity.position.x;
                        bot.y = bot.entity.position.y;
                        bot.z = bot.entity.position.z;
                    }
                });

                // Handle errors
                bot.on('error', (err) => {
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
            bot.chat(`❌ Unknown: ${cmd}. Use !help`);
        }
    }

    // ============================================
    // GET TARGET BOTS
    // ============================================
    getTargetBots(bot) {
        if (this.selectedBots.size === 0) {
            return this.bots.filter(b => b.connected && b.botId !== bot.botId);
        }
        return this.bots.filter(b => 
            this.selectedBots.has(b.botId) && b.connected && b.botId !== bot.botId
        );
    }

    // ============================================
    // COMMANDS - BASIC
    // ============================================
    
    cmdPing(bot, args) {
        bot.chat(`🏓 Pong! ${bot.username} is alive`);
    }

    cmdHelp(bot, args) {
        const help = `=== 🚀 ALL COMMANDS ===
📊 BASIC: !ping, !help, !status, !info, !list
👥 SELECT: !army, !select N, !clear, !all
📍 MOVE: !move X Y Z, !tp X Y Z, !circle NAME, !formation
🎯 FORM: !spread, !follow NAME, !line, !square, !grid, !diamond, !spiral
⚔️ PVP: !attack, !pvp, !fight, !kill NAME, !remove NAME
💃 ACTION: !dance, !wave, !jump, !spin, !bow, !salute
💬 CHAT: !say MSG, !broadcast MSG, !whisper NAME MSG
⭐ FORMATIONS: !heart, !star, !vformation, !xformation, !arrow, !cross
🔧 CONTROL: !join N, !leave, !reconnect, !reset, !count, !uptime`;
        bot.chat(help);
    }

    cmdStatus(bot, args) {
        const active = this.bots.filter(b => b.connected).length;
        const selected = this.selectedBots.size;
        bot.chat(`📊 Active: ${active}/${this.bots.length} | Selected: ${selected} | Joined: ${this.totalJoined} | Removed: ${this.totalRemoved}`);
    }

    cmdInfo(bot, args) {
        bot.chat(`🤖 ${bot.username} | ID: ${bot.botId} | Connected: ${bot.connected} | Pos: (${bot.x?.toFixed(1) || 0}, ${bot.y?.toFixed(1) || 65}, ${bot.z?.toFixed(1) || 0})`);
    }

    cmdList(bot, args) {
        const list = this.bots.filter(b => b.connected).map(b => b.username).join(', ');
        bot.chat(`📋 Bots: ${list || 'None'}`);
    }

    // ============================================
    // COMMANDS - SELECTION
    // ============================================
    
    cmdArmy(bot, args) {
        this.selectedBots.clear();
        const connected = this.bots.filter(b => b.connected && b.botId !== bot.botId);
        connected.forEach(b => {
            this.selectedBots.add(b.botId);
            setTimeout(() => { if (b.connected) b.chat('📢 Army!'); }, 100);
        });
        bot.chat(`✅ Army: ${connected.length} bots!`);
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
        bot.chat(`✅ All ${this.selectedBots.size} bots!`);
    }

    // ============================================
    // COMMANDS - MOVEMENT
    // ============================================
    
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
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} ${y} ${z}`);
            }
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
            bot.chat(`❌ ${targetName} not found`);
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
        bot.chat(`✅ Circle: ${count} bots around ${targetName}!`);
    }

    cmdFormation(bot, args) {
        const targets = this.getTargetBots(bot);
        if (targets.length === 0) {
            bot.chat('❌ No bots! Use !army');
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
        bot.chat(`✅ Formation: ${Math.min(targets.length, size * size)} bots!`);
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
            bot.chat(`❌ ${targetName} not found`);
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

    cmdGoto(bot, args) {
        this.cmdFollow(bot, args);
    }

    cmdLine(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = targets.length;
        if (count === 0) {
            bot.chat('❌ No bots!');
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
        bot.chat(`✅ Line: ${count} bots!`);
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
        bot.chat(`✅ Square: ${count} bots!`);
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
        bot.chat(`✅ Grid!`);
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
        bot.chat(`✅ Diamond!`);
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
        bot.chat(`✅ Spiral!`);
    }

    // ============================================
    // COMMANDS - PVP / ATTACK
    // ============================================
    
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
                    const x = (target.x || 0) + (Math.random() - 0.5) * 4;
                    const z = (target.z || 0) + (Math.random() - 0.5) * 4;
                    b.chat(`/tp ${b.username} ${x} 65 ${z}`);
                    b.chat(`/me attacks ${target.username}! ⚔️`);
                }
            }
            bot.chat(`⚔️ Attacking ${target.username}!`);
        } else {
            bot.chat('❌ No target');
        }
    }

    cmdPvp(bot, args) {
        this.cmdAttack(bot, args);
    }

    cmdFight(bot, args) {
        this.cmdAttack(bot, args);
    }

    cmdKill(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !kill <username>');
            return;
        }
        const targetName = args[0];
        for (const b of this.bots) {
            if (b.username.toLowerCase() === targetName.toLowerCase() && b.connected) {
                b.chat(`/me kills ${targetName}! 💀`);
                setTimeout(() => {
                    b.end();
                    b.connected = false;
                    this.totalRemoved++;
                }, 500);
                bot.chat(`💀 Killed ${targetName}!`);
                return;
            }
        }
        bot.chat(`❌ ${targetName} not found`);
    }

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
        bot.chat(`❌ ${targetName} not found`);
    }

    // ============================================
    // COMMANDS - ACTIONS
    // ============================================
    
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

    cmdJump(bot, args) {
        const targets = this.getTargetBots(bot);
        for (const b of targets.slice(0, 20)) {
            if (b.connected) {
                b.chat('/me jumps! 🦘');
                b.chat(`/tp ${b.username} ${b.x || 0} 70 ${b.z || 0}`);
            }
        }
        bot.chat('🦘 Jump!');
    }

    cmdSpin(bot, args) {
        const targets = this.getTargetBots(bot);
        for (const b of targets.slice(0, 20)) {
            if (b.connected) b.chat('/me spins! 🔄');
        }
        bot.chat('🔄 Spin!');
    }

    cmdBow(bot, args) {
        const targets = this.getTargetBots(bot);
        for (const b of targets.slice(0, 20)) {
            if (b.connected) b.chat('/me bows! 🙇');
        }
        bot.chat('🙇 Bow!');
    }

    cmdSalute(bot, args) {
        const targets = this.getTargetBots(bot);
        for (const b of targets.slice(0, 20)) {
            if (b.connected) b.chat('/me salutes! 🫡');
        }
        bot.chat('🫡 Salute!');
    }

    // ============================================
    // COMMANDS - CHAT
    // ============================================
    
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
            target.chat(`🤫 ${bot.username}: ${msg}`);
            bot.chat(`✅ Whispered to ${targetName}`);
        } else {
            bot.chat(`❌ ${targetName} not found`);
        }
    }

    cmdAnnounce(bot, args) {
        if (args.length === 0) {
            bot.chat('Usage: !announce <message>');
            return;
        }
        const msg = args.join(' ');
        for (const b of this.bots) {
            if (b.connected) b.chat(`📣 ${msg}`);
        }
        bot.chat(`📣 Announce: ${msg}`);
    }

    // ============================================
    // COMMANDS - FORMATIONS
    // ============================================
    
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

    cmdXFormation(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 30);
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const x1 = (bot.x || 0) - t * 20 + 10;
            const x2 = (bot.x || 0) + t * 20 - 10;
            const z = (bot.z || 0) + i * 1.5;
            const b = targets[i];
            if (b.connected) {
                const x = i % 2 === 0 ? x1 : x2;
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat('✅ X-Formation!');
    }

    cmdArrow(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 25);
        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / 5);
            const col = i % 5;
            const x = (bot.x || 0) + (col - 2) * 2;
            const z = (bot.z || 0) + row * 3;
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat('🏹 Arrow!');
    }

    cmdCross(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 20);
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const x = (bot.x || 0) + (t - 0.5) * 20;
            const z = (bot.z || 0) + (i % 2 === 0 ? 0 : (t - 0.5) * 15);
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat('✝️ Cross!');
    }

    // ============================================
    // COMMANDS - CONTROL
    // ============================================
    
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

    cmdReconnect(bot, args) {
        bot.chat('🔄 Reconnecting...');
        const username = bot.username;
        const botId = bot.botId;
        setTimeout(() => {
            bot.end();
            setTimeout(() => {
                this.spawnBot();
            }, 2000);
        }, 1000);
    }

    cmdReset(bot, args) {
        bot.chat('🔄 Resetting all bots...');
        for (const b of this.bots) {
            if (b.connected) b.end();
        }
        this.bots = [];
        this.selectedBots.clear();
        this.usedNames.clear();
        setTimeout(() => {
            this.spawnAllBots();
        }, 3000);
    }

    cmdCount(bot, args) {
        const active = this.bots.filter(b => b.connected).length;
        bot.chat(`📊 Total: ${this.bots.length} | Active: ${active} | Removed: ${this.totalRemoved}`);
    }

    cmdUptime(bot, args) {
        const uptime = Date.now() - this.startTime;
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        bot.chat(`⏱️ ${hours}h ${minutes % 60}m ${seconds % 60}s`);
    }

    // ============================================
    // DISPLAY STATUS
    // ============================================
    displayStatus() {
        const active = this.bots.filter(b => b.connected).length;
        console.log(`📊 STATUS: ${active}/${this.bots.length} active | Selected: ${this.selectedBots.size} | Joined: ${this.totalJoined} | Removed: ${this.totalRemoved}`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================
    // SPAWN ALL BOTS
    // ============================================
    async spawnAllBots() {
        const maxBots = Math.min(CONFIG.bots_per_runner, CONFIG.max_bots);
        let spawned = 0;

        for (let i = 0; i < maxBots * 2 && spawned < maxBots; i++) {
            const success = await this.spawnBot();
            if (success) {
                spawned++;
                await this.sleep(CONFIG.bot_spawn_delay);
            } else {
                await this.sleep(1000);
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
