const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

// Configuration
const config = {
    server_ip: 'node.harshteotia.in',
    server_port: 25566,
    username_prefix: 'Bot',
    bots_per_runner: 100,
    bot_spawn_delay: 200, // milliseconds
    enable_auto_reconnect: true,
    video_helper_mode: true,
    command_prefix: '!',
    max_bots: 100,
    registration_password: null,
    server_version: '1.16.5'
};

// Try to load config file
try {
    const configFile = fs.readFileSync('config.json', 'utf8');
    Object.assign(config, JSON.parse(configFile));
} catch (e) {
    console.log('📝 Using default config');
}

class MinecraftBotManager {
    constructor() {
        this.bots = [];
        this.selectedBots = new Set();
        this.runnerId = process.env.RUNNER_ID || `runner_${Date.now()}`;
        this.totalJoined = 0;
        this.totalRemoved = 0;
        this.usedNames = new Set();
        this.botNames = this.generateBotNames();
        this.running = true;
        this.commandHandlers = {
            'ping': this.handlePing.bind(this),
            'help': this.handleHelp.bind(this),
            'status': this.handleStatus.bind(this),
            'circle': this.handleCircle.bind(this),
            'army': this.handleArmy.bind(this),
            'select': this.handleSelect.bind(this),
            'remove': this.handleRemove.bind(this),
            'kill': this.handleKill.bind(this),
            'move': this.handleMove.bind(this),
            'say': this.handleSay.bind(this),
            'formation': this.handleFormation.bind(this),
            'attack': this.handleAttack.bind(this),
            'dance': this.handleDance.bind(this),
            'follow': this.handleFollow.bind(this),
            'spread': this.handleSpread.bind(this),
            'info': this.handleInfo.bind(this),
            'clear': this.handleClear.bind(this),
            'join': this.handleJoin.bind(this),
            'leave': this.handleLeave.bind(this)
        };
    }

    generateBotNames() {
        const names = [];
        const prefixes = ['Bot', 'Player', 'Hero', 'Ace', 'Pro', 'Star', 'Nitro', 'Blaze', 'Shadow', 'Frost'];
        
        // Generate numbered names
        for (let i = 0; i < 100; i++) {
            prefixes.forEach(prefix => {
                names.push(`${prefix}${i}`);
            });
        }
        
        // Add random names
        const randomNames = [
            'Nitro', 'Blaze', 'Shadow', 'Frost', 'Storm', 'Venom', 'Raven', 'Lunar',
            'Solar', 'Nova', 'Zephyr', 'Phantom', 'Viper', 'Cobra', 'Falcon', 'Eagle',
            'Titan', 'Atlas', 'Neon', 'Cosmic', 'Galaxy', 'Quantum', 'Zen', 'Karma',
            'Apex', 'Rogue', 'Sage', 'Hawk', 'Wolf', 'Bear', 'Lion', 'Tiger',
            'Dragon', 'Phoenix', 'Serpent', 'Griffin', 'Mystic', 'Eclipse', 'Aurora',
            'Midnight', 'Dawn', 'Dusk', 'Ember', 'Flare', 'Glacier', 'Havoc', 'Inferno',
            'Jade', 'Knight', 'Legend', 'Mercury', 'Neptune', 'Orion', 'Pegasus',
            'Quasar', 'Radar', 'Sonic', 'Tempest', 'Ulysses', 'Vanguard', 'Warden',
            'Xenon', 'Yukon', 'Zeppelin', 'Arctic', 'Bandit', 'Cipher', 'Drift',
            'Echo', 'Fury', 'Gambit', 'Helix', 'Icarus', 'Jinx', 'Kestrel', 'Lyric',
            'Maverick', 'Nebula', 'Omega', 'Pathfinder', 'Quest', 'Rocket', 'Spirit',
            'Thunder', 'Unity', 'Valor', 'Wraith', 'Xenith', 'Yeti', 'Zenith'
        ];
        
        randomNames.forEach(name => {
            names.push(name);
            for (let i = 0; i < 3; i++) {
                names.push(`${name}${i}`);
            }
        });
        
        return names;
    }

    getUniqueName() {
        const available = this.botNames.filter(name => !this.usedNames.has(name));
        if (available.length === 0) {
            const name = `Bot_${this.usedNames.size}_${Math.floor(Math.random() * 1000)}`;
            this.usedNames.add(name);
            return name;
        }
        const name = available[Math.floor(Math.random() * available.length)];
        this.usedNames.add(name);
        return name;
    }

    async spawnBot(botId) {
        const username = this.getUniqueName();
        
        return new Promise((resolve) => {
            console.log(`🤖 Spawning bot ${botId + 1}: ${username}`);
            
            const bot = mineflayer.createBot({
                host: config.server_ip,
                port: config.server_port,
                username: username,
                version: config.server_version || '1.16.5',
                auth: 'offline',
                checkTimeoutInterval: 60000,
                keepAlive: true
            });

            let connected = false;
            let timeout = setTimeout(() => {
                if (!connected) {
                    console.log(`❌ Bot ${username} connection timeout`);
                    bot.end();
                    resolve(false);
                }
            }, 15000);

            bot.on('login', () => {
                connected = true;
                clearTimeout(timeout);
                this.totalJoined++;
                console.log(`✅ Bot ${username} (${botId + 1}/${config.bots_per_runner}) joined successfully`);
                
                // Auto register if needed
                this.autoRegister(bot);
                
                // Store bot reference
                bot.botId = botId;
                bot.username = username;
                bot.x = Math.random() * 40 - 20;
                bot.y = 64;
                bot.z = Math.random() * 40 - 20;
                bot.connected = true;
                
                this.bots.push(bot);
                
                // Send join message
                setTimeout(() => {
                    bot.chat('/me has arrived! 🤖');
                }, 1000);
                
                resolve(true);
            });

            bot.on('error', (err) => {
                console.log(`❌ Bot ${username} error:`, err.message);
                clearTimeout(timeout);
                if (!connected) {
                    resolve(false);
                }
            });

            bot.on('end', () => {
                if (connected) {
                    console.log(`Bot ${username} disconnected`);
                    bot.connected = false;
                    this.totalRemoved++;
                }
            });

            bot.on('kickDisconnect', (reason) => {
                console.log(`Bot ${username} kicked:`, reason);
                bot.connected = false;
                this.totalRemoved++;
            });

            // Handle chat messages
            bot.on('message', (message) => {
                const text = message.toString();
                
                // Check for registration
                if (text.includes('registered') || text.includes('Registered')) {
                    bot.registered = true;
                    console.log(`✅ Bot ${username} registered`);
                }
                
                // Check for commands
                if (text.startsWith(config.command_prefix)) {
                    this.handleCommand(text, bot);
                }
                
                // Check if this bot was removed
                if (text.includes(username) && (text.includes('left') || text.includes('removed'))) {
                    bot.connected = false;
                    this.totalRemoved++;
                }
            });

            // Handle position updates
            bot.on('move', () => {
                if (bot.entity) {
                    bot.x = bot.entity.position.x;
                    bot.y = bot.entity.position.y;
                    bot.z = bot.entity.position.z;
                }
            });
        });
    }

    async autoRegister(bot) {
        try {
            const password = this.generatePassword();
            const commands = [
                `/register ${password} ${password}`,
                `/reg ${password} ${password}`,
                `/register ${password}`,
                `/login ${password}`,
                `/l ${password}`
            ];
            
            for (const cmd of commands) {
                await this.sleep(500);
                bot.chat(cmd);
            }
        } catch (e) {
            // Ignore registration errors
        }
    }

    generatePassword() {
        return crypto.randomBytes(8).toString('hex');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async spawnAllBots() {
        const maxBots = Math.min(config.bots_per_runner, config.max_bots);
        let spawned = 0;

        console.log('='.repeat(60));
        console.log(`🚀 Starting Bot Controller on runner: ${this.runnerId}`);
        console.log(`🎯 Target server: ${config.server_ip}:${config.server_port}`);
        console.log(`🤖 Bots to spawn: ${maxBots}`);
        console.log('='.repeat(60));

        // Check server first
        const serverReachable = await this.checkServer();
        if (!serverReachable) {
            console.log('❌ Server is not reachable!');
            return;
        }

        for (let i = 0; i < maxBots * 2 && spawned < maxBots; i++) {
            const success = await this.spawnBot(spawned);
            if (success) {
                spawned++;
                await this.sleep(config.bot_spawn_delay);
            } else {
                console.log(`⚠️ Retry ${i + 1}/${maxBots * 2}`);
                await this.sleep(1000);
            }
        }

        console.log(`✅ Successfully spawned ${spawned} bots out of ${maxBots} attempts`);
        
        // Run video helper if enabled
        if (config.video_helper_mode && spawned > 0) {
            await this.sleep(5000);
            await this.runVideoHelper();
        }
    }

    async checkServer() {
        try {
            const net = require('net');
            return new Promise((resolve) => {
                const socket = net.createConnection(config.server_port, config.server_ip);
                socket.setTimeout(5000);
                socket.on('connect', () => {
                    socket.end();
                    console.log(`✅ Server ${config.server_ip}:${config.server_port} is reachable`);
                    resolve(true);
                });
                socket.on('timeout', () => {
                    socket.destroy();
                    resolve(false);
                });
                socket.on('error', () => {
                    resolve(false);
                });
            });
        } catch (e) {
            return false;
        }
    }

    async runVideoHelper() {
        console.log('🎬 Starting video helper mode');
        
        const messages = [
            '/me [Video] Starting recording... 🎥',
            '/me [Video] Creating army formation',
            '/me [Video] Circle formation activated',
            '/me [Video] Battle formation',
            '/me [Video] Group moving to positions',
            '/me [Video] Recording completed! 🎉'
        ];
        
        for (let i = 0; i < messages.length; i++) {
            const botsToUse = this.bots.slice(0, Math.min(10, this.bots.length));
            for (const bot of botsToUse) {
                if (bot.connected) {
                    bot.chat(messages[i]);
                }
            }
            console.log(`📹 Video command ${i + 1}: ${messages[i]}`);
            await this.sleep(3000);
        }
    }

    handleCommand(message, bot) {
        const parts = message.slice(config.command_prefix.length).trim().split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');

        if (this.commandHandlers[cmd]) {
            this.commandHandlers[cmd](bot, args);
        } else {
            bot.chat(`Unknown command: ${cmd}`);
        }
    }

    // Command Handlers
    handlePing(bot, args) {
        bot.chat(`Pong! Bot ${bot.username} is alive`);
    }

    handleHelp(bot, args) {
        const help = `=== BOT COMMANDS ===
!ping - Check bot status
!help - Show this help
!status - Show bot status
!circle <player> - Create circle around player
!army - Select all bots
!select <count> - Select bots
!remove <username> - Remove bot
!move <x> <y> <z> - Move bot
!say <message> - Broadcast message
!formation - Battle formation
!attack - Attack command
!dance - Make bots dance
!follow <player> - Follow player
!spread - Spread out bots
!info - Show bot info
!clear - Clear selected`;
        bot.chat(help);
    }

    handleStatus(bot, args) {
        const active = this.bots.filter(b => b.connected).length;
        const selected = this.selectedBots.size;
        bot.chat(`Total: ${this.bots.length} | Active: ${active} | Selected: ${selected} | Joined: ${this.totalJoined} | Removed: ${this.totalRemoved}`);
    }

    handleCircle(bot, args) {
        try {
            const parts = args.split(' ');
            if (parts.length === 0 || !parts[0]) {
                bot.chat('Usage: !circle <player_name>');
                return;
            }

            const targetName = parts[0];
            const radius = parseFloat(parts[1]) || 10;
            const botCount = parseInt(parts[2]) || 50;

            // Find target
            let targetBot = null;
            for (const b of this.bots) {
                if (b.username.toLowerCase() === targetName.toLowerCase() && b.connected) {
                    targetBot = b;
                    break;
                }
            }

            if (!targetBot) {
                bot.chat(`Player ${targetName} not found`);
                return;
            }

            // Get connected bots
            const connectedBots = this.bots.filter(b => b.connected && b.botId !== bot.botId);
            const count = Math.min(connectedBots.length, botCount);

            if (count < 1) {
                bot.chat('Not enough bots for circle');
                return;
            }

            // Create circle
            const centerX = targetBot.x || 0;
            const centerZ = targetBot.z || 0;

            for (let i = 0; i < count; i++) {
                const angle = (2 * Math.PI * i) / count;
                const x = centerX + radius * Math.cos(angle);
                const z = centerZ + radius * Math.sin(angle);
                const targetBotObj = connectedBots[i];
                
                if (targetBotObj && targetBotObj.connected) {
                    targetBotObj.chat(`/tp ${targetBotObj.username} ${x} 64 ${z}`);
                }
            }

            bot.chat(`✅ Circle created around ${targetName} with ${count} bots!`);
        } catch (e) {
            bot.chat('❌ Error creating circle');
            console.error(e);
        }
    }

    handleArmy(bot, args) {
        this.selectedBots.clear();
        const connectedBots = this.bots.filter(b => b.connected && b.botId !== bot.botId);
        
        for (const b of connectedBots) {
            this.selectedBots.add(b.botId);
            b.chat('📢 You are now part of the army!');
        }
        
        bot.chat(`✅ Army formed with ${connectedBots.length} bots!`);
    }

    handleSelect(bot, args) {
        try {
            const count = parseInt(args) || 10;
            const connectedBots = this.bots.filter(b => b.connected && b.botId !== bot.botId);
            
            let selectedCount = 0;
            for (const b of connectedBots) {
                if (selectedCount >= count) break;
                this.selectedBots.add(b.botId);
                b.chat(`✅ Selected for army! ID: ${b.botId}`);
                selectedCount++;
            }
            
            bot.chat(`✅ Selected ${selectedCount} bots for army!`);
        } catch (e) {
            bot.chat('Usage: !select <count>');
        }
    }

    handleRemove(bot, args) {
        if (!args) {
            bot.chat('Usage: !remove <username>');
            return;
        }

        const targetName = args.trim();
        let removed = false;
        
        for (const b of this.bots) {
            if (b.username.toLowerCase() === targetName.toLowerCase() && b.connected) {
                b.end();
                b.connected = false;
                this.totalRemoved++;
                removed = true;
                bot.chat(`✅ Bot ${targetName} removed`);
                
                // Notify all bots
                for (const remainingBot of this.bots) {
                    if (remainingBot.connected && remainingBot.botId !== bot.botId) {
                        remainingBot.chat(`Bot ${targetName} was removed!`);
                    }
                }
                break;
            }
        }
        
        if (!removed) {
            bot.chat(`Bot ${targetName} not found`);
        }
    }

    handleKill(bot, args) {
        this.handleRemove(bot, args);
    }

    handleMove(bot, args) {
        try {
            const parts = args.split(' ');
            if (parts.length === 3) {
                const x = parseFloat(parts[0]);
                const y = parseFloat(parts[1]);
                const z = parseFloat(parts[2]);
                bot.chat(`/tp ${bot.username} ${x} ${y} ${z}`);
                bot.chat(`Moved to (${x}, ${y}, ${z})`);
            } else {
                bot.chat('Usage: !move <x> <y> <z>');
            }
        } catch (e) {
            bot.chat('Invalid coordinates');
        }
    }

    handleSay(bot, args) {
        if (args) {
            for (const b of this.bots) {
                if (b.connected) {
                    b.chat(args);
                }
            }
        }
    }

    handleFormation(bot, args) {
        const selectedBots = this.bots.filter(b => this.selectedBots.has(b.botId) && b.connected);
        
        if (selectedBots.length === 0) {
            bot.chat('No bots selected! Use !select or !army first');
            return;
        }

        const size = Math.ceil(Math.sqrt(selectedBots.length));
        const startX = (bot.x || 0) - (size * 2.5);
        const startZ = (bot.z || 0) - (size * 2.5);

        for (let i = 0; i < selectedBots.length && i < size * size; i++) {
            const row = Math.floor(i / size);
            const col = i % size;
            const x = startX + (col * 3);
            const z = startZ + (row * 3);
            const targetBot = selectedBots[i];
            
            if (targetBot && targetBot.connected) {
                targetBot.chat(`/tp ${targetBot.username} ${x} 64 ${z}`);
            }
        }

        bot.chat(`✅ Formation created with ${Math.min(selectedBots.length, size * size)} bots!`);
    }

    handleAttack(bot, args) {
        let targetBot = null;
        
        if (args) {
            for (const b of this.bots) {
                if (b.username.toLowerCase() === args.toLowerCase() && b.connected) {
                    targetBot = b;
                    break;
                }
            }
        }
        
        if (!targetBot) {
            const connected = this.bots.filter(b => b.connected && b.botId !== bot.botId);
            if (connected.length > 0) {
                targetBot = connected[Math.floor(Math.random() * connected.length)];
            }
        }
        
        if (targetBot) {
            const selectedBots = this.bots.filter(b => this.selectedBots.has(b.botId) && b.connected);
            
            for (const b of selectedBots.slice(0, 20)) {
                const x = (targetBot.x || 0) + (Math.random() - 0.5) * 6;
                const z = (targetBot.z || 0) + (Math.random() - 0.5) * 6;
                if (b.connected) {
                    b.chat(`/tp ${b.username} ${x} 64 ${z}`);
                    b.chat(`/me attacks ${targetBot.username}! ⚔️`);
                }
            }
            
            bot.chat(`⚔️ Attacking ${targetBot.username}!`);
        } else {
            bot.chat('No target found');
        }
    }

    handleDance(bot, args) {
        const selectedBots = this.bots.filter(b => this.selectedBots.has(b.botId) && b.connected);
        
        if (selectedBots.length === 0) {
            bot.chat('No bots selected! Use !select or !army first');
            return;
        }

        const danceMoves = [
            [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
            [1, 0, 1], [-1, 0, -1], [1, 0, -1], [-1, 0, 1]
        ];

        for (const move of danceMoves.slice(0, 4)) {
            for (const b of selectedBots.slice(0, 20)) {
                if (b.connected) {
                    const x = (b.x || 0) + move[0];
                    const z = (b.z || 0) + move[2];
                    b.chat(`/tp ${b.username} ${x} 64 ${z}`);
                    b.chat('/me dances! 💃');
                }
            }
        }

        bot.chat('✅ Dance complete!');
    }

    handleFollow(bot, args) {
        let targetBot = null;
        
        if (args) {
            for (const b of this.bots) {
                if (b.username.toLowerCase() === args.toLowerCase() && b.connected) {
                    targetBot = b;
                    break;
                }
            }
        }
        
        if (!targetBot) {
            const connected = this.bots.filter(b => b.connected && b.botId !== bot.botId);
            if (connected.length > 0) {
                targetBot = connected[Math.floor(Math.random() * connected.length)];
            }
        }
        
        if (targetBot) {
            const selectedBots = this.bots.filter(b => this.selectedBots.has(b.botId) && b.connected);
            
            for (let i = 0; i < selectedBots.length && i < 20; i++) {
                const offset = 2 + (i % 5);
                const b = selectedBots[i];
                if (b.connected) {
                    const x = (targetBot.x || 0) + (Math.random() - 0.5) * offset * 2;
                    const z = (targetBot.z || 0) + (Math.random() - 0.5) * offset * 2;
                    b.chat(`/tp ${b.username} ${x} 64 ${z}`);
                }
            }
            
            bot.chat(`👥 Following ${targetBot.username}!`);
        } else {
            bot.chat('No target found');
        }
    }

    handleSpread(bot, args) {
        const selectedBots = this.bots.filter(b => this.selectedBots.has(b.botId) && b.connected);
        
        if (selectedBots.length === 0) {
            bot.chat('No bots selected! Use !select or !army first');
            return;
        }

        for (const b of selectedBots.slice(0, 30)) {
            if (b.connected) {
                const x = (bot.x || 0) + (Math.random() - 0.5) * 40;
                const z = (bot.z || 0) + (Math.random() - 0.5) * 40;
                b.chat(`/tp ${b.username} ${x} 64 ${z}`);
            }
        }

        bot.chat('✅ Bots spread out!');
    }

    handleInfo(bot, args) {
        const info = `=== BOT INFO ===
Bot: ${bot.username}
ID: ${bot.botId}
Connected: ${bot.connected}
Registered: ${bot.registered || false}
Position: (${(bot.x || 0).toFixed(1)}, ${(bot.y || 64).toFixed(1)}, ${(bot.z || 0).toFixed(1)})
Total Bots: ${this.bots.length}
Selected: ${this.selectedBots.size}
Joined: ${this.totalJoined}
Removed: ${this.totalRemoved}`;
        bot.chat(info);
    }

    handleClear(bot, args) {
        this.selectedBots.clear();
        bot.chat('✅ Selected bots cleared!');
    }

    handleJoin(bot, args) {
        // Spawn more bots
        this.spawnAllBots();
    }

    handleLeave(bot, args) {
        bot.chat('/me is leaving! 👋');
        setTimeout(() => {
            bot.end();
        }, 1000);
    }

    async start() {
        await this.spawnAllBots();

        // Keep alive
        setInterval(() => {
            const active = this.bots.filter(b => b.connected).length;
            console.log(`📊 Active bots: ${active}/${this.bots.length} | Joined: ${this.totalJoined} | Removed: ${this.totalRemoved}`);
        }, 30000);

        // Handle process exit
        process.on('SIGINT', () => {
            console.log('🛑 Shutting down...');
            this.running = false;
            for (const bot of this.bots) {
                if (bot.connected) {
                    bot.end();
                }
            }
            process.exit();
        });

        process.on('SIGTERM', () => {
            console.log('🛑 Shutting down...');
            this.running = false;
            for (const bot of this.bots) {
                if (bot.connected) {
                    bot.end();
                }
            }
            process.exit();
        });
    }
}

// Run the bot manager
const manager = new MinecraftBotManager();
manager.start().catch(console.error);
