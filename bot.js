const mineflayer = require('mineflayer');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

class BotManager {
    constructor() {
        this.bots = [];
        this.config = this.loadConfig();
        this.botNames = this.loadBotNames();
        this.usedNames = new Set();
        this.runnerId = process.env.RUNNER_ID || `runner_${Date.now()}`;
        this.totalJoined = 0;
    }

    loadConfig() {
        const defaultConfig = {
            server_ip: 'node.harshteotia.in',
            server_port: 25566,
            bots_per_runner: 100,
            bot_spawn_delay: 200,
            max_bots: 100
        };

        try {
            const configFile = fs.readFileSync('config.json', 'utf8');
            return { ...defaultConfig, ...JSON.parse(configFile) };
        } catch {
            console.log('Using default config');
            return defaultConfig;
        }
    }

    loadBotNames() {
        const names = [];
        const prefixes = ['Bot', 'Player', 'Hero', 'Ace', 'Pro', 'Star', 'Nitro', 'Blaze'];
        
        for (let i = 0; i < 100; i++) {
            prefixes.forEach(prefix => {
                names.push(`${prefix}${i}`);
            });
        }
        
        // Add random names
        const randomNames = ['Shadow', 'Frost', 'Storm', 'Raven', 'Lunar', 'Solar', 'Nova', 'Zephyr',
            'Phantom', 'Viper', 'Cobra', 'Falcon', 'Eagle', 'Titan', 'Atlas', 'Neon'];
        
        randomNames.forEach(name => {
            names.push(name);
            for (let i = 0; i < 5; i++) {
                names.push(`${name}${i}`);
            }
        });
        
        return names;
    }

    getUniqueName() {
        const available = this.botNames.filter(name => !this.usedNames.has(name));
        if (available.length === 0) {
            return `Bot_${this.usedNames.size}_${Math.floor(Math.random() * 1000)}`;
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
                host: this.config.server_ip,
                port: this.config.server_port,
                username: username,
                version: '1.16.5',
                auth: 'offline'
            });

            let connected = false;
            let timeout = setTimeout(() => {
                if (!connected) {
                    console.log(`❌ Bot ${username} connection timeout`);
                    bot.end();
                    resolve(false);
                }
            }, 10000);

            bot.on('login', () => {
                connected = true;
                clearTimeout(timeout);
                this.totalJoined++;
                console.log(`✅ Bot ${username} joined successfully`);
                bot.chat('/me has arrived!');
                this.bots.push(bot);
                resolve(true);
            });

            bot.on('error', (err) => {
                console.log(`❌ Bot ${username} error:`, err.message);
                clearTimeout(timeout);
                resolve(false);
            });

            bot.on('end', () => {
                console.log(`Bot ${username} disconnected`);
            });

            // Handle chat commands
            bot.on('message', (message) => {
                const text = message.toString();
                if (text.startsWith('!')) {
                    this.handleCommand(text, bot);
                }
            });
        });
    }

    handleCommand(command, bot) {
        const parts = command.slice(1).trim().split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');

        switch(cmd) {
            case 'ping':
                bot.chat('Pong!');
                break;
            case 'status':
                bot.chat(`Bots: ${this.bots.length} | Connected: ${this.bots.filter(b => b.entity).length}`);
                break;
            case 'say':
                if (args) {
                    this.bots.forEach(b => {
                        if (b.entity) b.chat(args);
                    });
                }
                break;
            case 'help':
                bot.chat('Commands: !ping, !status, !say <message>, !join, !leave');
                break;
            default:
                bot.chat(`Unknown command: ${cmd}`);
        }
    }

    async spawnAllBots() {
        const maxBots = Math.min(this.config.bots_per_runner, this.config.max_bots);
        let spawned = 0;

        console.log(`🚀 Starting to spawn ${maxBots} bots`);
        console.log(`🎯 Target: ${this.config.server_ip}:${this.config.server_port}`);

        for (let i = 0; i < maxBots * 2 && spawned < maxBots; i++) {
            const success = await this.spawnBot(spawned);
            if (success) {
                spawned++;
                await this.sleep(this.config.bot_spawn_delay);
            }
        }

        console.log(`✅ Successfully spawned ${spawned} bots`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async start() {
        console.log('='.repeat(60));
        console.log('🚀 Starting Minecraft Bot System');
        console.log(`🏷️ Runner ID: ${this.runnerId}`);
        console.log('='.repeat(60));

        await this.spawnAllBots();

        // Keep alive
        setInterval(() => {
            const active = this.bots.filter(b => b.entity).length;
            console.log(`📊 Active bots: ${active}/${this.bots.length} | Total joined: ${this.totalJoined}`);
        }, 30000);

        // Handle exit
        process.on('SIGINT', () => {
            console.log('🛑 Shutting down...');
            this.bots.forEach(bot => {
                if (bot.entity) bot.end();
            });
            process.exit();
        });
    }
}

// Run the bot manager
const manager = new BotManager();
manager.start().catch(console.error);
