// ============================================
// WORKING BOT SYSTEM - CHAT CONTROL FIXED
// ============================================

const mineflayer = require('mineflayer');
const fs = require('fs');

// ============================================
// CONFIG
// ============================================
const CONFIG = JSON.parse(fs.readFileSync('config.json', 'utf8'));

console.log('='.repeat(60));
console.log('🚀 BOT SYSTEM - CHAT CONTROL WORKING');
console.log(`🎯 Server: ${CONFIG.server_ip}:${CONFIG.server_port}`);
console.log('='.repeat(60));

// ============================================
// BOT NAMES
// ============================================
const BOT_NAMES = [];
for (let i = 0; i < 100; i++) {
    BOT_NAMES.push(`Bot${i}`);
    BOT_NAMES.push(`Player${i}`);
    BOT_NAMES.push(`Hero${i}`);
    BOT_NAMES.push(`Ace${i}`);
}
const RANDOMS = ['Nitro', 'Blaze', 'Shadow', 'Frost', 'Storm', 'Venom', 'Raven', 'Lunar'];
RANDOMS.forEach(name => BOT_NAMES.push(name));

// ============================================
// BOT MANAGER
// ============================================
class BotManager {
    constructor() {
        this.bots = [];
        this.selectedBots = new Set();
        this.runnerId = process.env.RUNNER_ID || 'runner1';
        this.totalJoined = 0;
        this.usedNames = new Set();
        this.startTime = Date.now();
        
        // Commands
        this.commands = {
            'ping': this.cmdPing.bind(this),
            'help': this.cmdHelp.bind(this),
            'status': this.cmdStatus.bind(this),
            'army': this.cmdArmy.bind(this),
            'clear': this.cmdClear.bind(this),
            'circle': this.cmdCircle.bind(this),
            'formation': this.cmdFormation.bind(this),
            'attack': this.cmdAttack.bind(this),
            'dance': this.cmdDance.bind(this),
            'say': this.cmdSay.bind(this),
            'move': this.cmdMove.bind(this),
            'spread': this.cmdSpread.bind(this),
            'follow': this.cmdFollow.bind(this),
            'remove': this.cmdRemove.bind(this),
            'join': this.cmdJoin.bind(this)
        };
    }

    getUniqueName() {
        const available = BOT_NAMES.filter(n => !this.usedNames.has(n));
        if (available.length === 0) {
            const name = `Bot_${this.usedNames.size}`;
            this.usedNames.add(name);
            return name;
        }
        const name = available[Math.floor(Math.random() * available.length)];
        this.usedNames.add(name);
        return name;
    }

    // ============================================
    // SPAWN BOT - CHAT CONTROL ENABLED
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
                physicsEnabled: false,
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
            // LOGIN - SETUP CHAT LISTENER
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
                
                console.log(`✅ [${botId}] ${username} joined!`);

                // ============================================
                // CHAT LISTENER - WORKING
                // ============================================
                bot.on('message', (message) => {
                    const text = message.toString();
                    console.log(`💬 ${username}: ${text}`);
                    
                    // Check for commands
                    if (text.startsWith(CONFIG.command_prefix)) {
                        const command = text.slice(1).trim();
                        console.log(`🎯 COMMAND from ${username}: ${command}`);
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

                // Error handling
                bot.on('error', (err) => {
                    if (err.message && err.message.includes('timeout')) return;
                    console.log(`⚠️ ${username}:`, err.message);
                });

                bot.on('end', () => {
                    bot.connected = false;
                    console.log(`📡 ${username} disconnected`);
                });

                bot.on('kickDisconnect', (reason) => {
                    bot.connected = false;
                    console.log(`👢 ${username} kicked:`, reason);
                });

                // Send join message after 2 seconds
                setTimeout(() => {
                    if (bot.connected) {
                        bot.chat('/me joined! 🤖');
                        console.log(`📤 ${username} sent join message`);
                    }
                }, 2000);

                resolve(true);
            });
        });
    }

    // ============================================
    // EXECUTE COMMAND
    // ============================================
    executeCommand(input, bot) {
        const parts = input.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        console.log(`🎯 Executing: ${cmd} from ${bot.username}`);
        
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
    // COMMANDS
    // ============================================
    
    cmdPing(bot, args) {
        bot.chat(`🏓 Pong! ${bot.username} is alive`);
        console.log(`✅ Ping response sent from ${bot.username}`);
    }

    cmdHelp(bot, args) {
        const help = `=== BOT COMMANDS ===
!ping - Check bot
!help - This help
!status - Bot count
!army - Select all bots
!clear - Clear selection
!circle NAME - Circle around player
!formation - Battle formation
!attack - Attack!
!dance - Dance!
!say MSG - Send message
!move X Y Z - Move bots
!spread - Spread out
!follow NAME - Follow player
!remove NAME - Remove bot
!join N - Spawn more bots`;
        bot.chat(help);
        console.log(`✅ Help sent from ${bot.username}`);
    }

    cmdStatus(bot, args) {
        const active = this.bots.filter(b => b.connected).length;
        const selected = this.selectedBots.size;
        bot.chat(`📊 Active: ${active}/${this.bots.length} | Selected: ${selected} | Joined: ${this.totalJoined}`);
        console.log(`✅ Status sent from ${bot.username}`);
    }

    cmdArmy(bot, args) {
        this.selectedBots.clear();
        const connected = this.bots.filter(b => b.connected && b.botId !== bot.botId);
        connected.forEach(b => {
            this.selectedBots.add(b.botId);
        });
        bot.chat(`✅ Army: ${connected.length} bots selected!`);
        console.log(`✅ Army command executed by ${bot.username}`);
    }

    cmdClear(bot, args) {
        this.selectedBots.clear();
        bot.chat('✅ Cleared!');
    }

    cmdCircle(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !circle <player>');
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
        const count = Math.min(targets.length, 30);
        
        for (let i = 0; i < count; i++) {
            const angle = (2 * Math.PI * i) / count;
            const x = (target.x || 0) + 10 * Math.cos(angle);
            const z = (target.z || 0) + 10 * Math.sin(angle);
            const b = targets[i];
            if (b.connected) {
                setTimeout(() => {
                    b.chat(`/tp ${b.username} ${x} 65 ${z}`);
                }, i * 100);
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
        const startX = (bot.x || 0) - (size * 2);
        const startZ = (bot.z || 0) - (size * 2);
        
        for (let i = 0; i < targets.length && i < size * size; i++) {
            const row = Math.floor(i / size);
            const col = i % size;
            const x = startX + (col * 3);
            const z = startZ + (row * 3);
            const b = targets[i];
            if (b.connected) {
                setTimeout(() => {
                    b.chat(`/tp ${b.username} ${x} 65 ${z}`);
                }, i * 50);
            }
        }
        bot.chat(`✅ Formation: ${Math.min(targets.length, size * size)} bots!`);
    }

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
            for (const b of targets.slice(0, 15)) {
                if (b.connected) {
                    const x = (target.x || 0) + (Math.random() - 0.5) * 4;
                    const z = (target.z || 0) + (Math.random() - 0.5) * 4;
                    setTimeout(() => {
                        b.chat(`/tp ${b.username} ${x} 65 ${z}`);
                        b.chat(`/me attacks ${target.username}! ⚔️`);
                    }, Math.random() * 500);
                }
            }
            bot.chat(`⚔️ Attacking ${target.username}!`);
        } else {
            bot.chat('❌ No target');
        }
    }

    cmdDance(bot, args) {
        const targets = this.getTargetBots(bot);
        const moves = [[1,0,0], [-1,0,0], [0,0,1], [0,0,-1]];
        let moveIndex = 0;
        const danceInterval = setInterval(() => {
            if (moveIndex >= moves.length) {
                clearInterval(danceInterval);
                return;
            }
            const move = moves[moveIndex];
            for (const b of targets.slice(0, 15)) {
                if (b.connected) {
                    const x = (b.x || 0) + move[0];
                    const z = (b.z || 0) + move[2];
                    b.chat(`/tp ${b.username} ${x} 65 ${z}`);
                    b.chat('/me dances! 💃');
                }
            }
            moveIndex++;
        }, 500);
        bot.chat('💃 Dancing!');
    }

    cmdSay(bot, args) {
        if (args.length === 0) {
            bot.chat('Usage: !say <message>');
            return;
        }
        const msg = args.join(' ');
        const targets = this.getTargetBots(bot);
        for (const b of targets) {
            if (b.connected) {
                setTimeout(() => {
                    b.chat(msg);
                }, Math.random() * 300);
            }
        }
        bot.chat(`✅ Said: ${msg}`);
    }

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

    cmdSpread(bot, args) {
        const targets = this.getTargetBots(bot);
        const range = parseFloat(args[0]) || 20;
        
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
        for (let i = 0; i < targets.length && i < 15; i++) {
            const offset = 2 + (i % 3);
            const b = targets[i];
            if (b.connected) {
                const x = (target.x || 0) + (Math.random() - 0.5) * offset * 2;
                const z = (target.z || 0) + (Math.random() - 0.5) * offset * 2;
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat(`✅ Following ${targetName}!`);
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
                bot.chat(`✅ Removed ${targetName}`);
                return;
            }
        }
        bot.chat(`❌ ${targetName} not found`);
    }

    cmdJoin(bot, args) {
        const count = parseInt(args[0]) || 5;
        bot.chat(`🔄 Joining ${count} more bots...`);
        for (let i = 0; i < count; i++) {
            setTimeout(() => this.spawnBot(), i * 1500);
        }
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
        console.log('🎯 Type !help in game to see commands');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================
    // START
    // ============================================
    async start() {
        await this.spawnAllBots();

        setInterval(() => {
            const active = this.bots.filter(b => b.connected).length;
            console.log(`📊 STATUS: ${active}/${this.bots.length} active`);
        }, 60000);

        process.on('SIGINT', () => {
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
