const net = require('net');
const crypto = require('crypto');
const fs = require('fs');

// Configuration
const config = {
    server_ip: 'node.harshteotia.in',
    server_port: 25566,
    username_prefix: 'Bot',
    bots_per_runner: 100,
    bot_spawn_delay: 300,
    video_helper_mode: true,
    command_prefix: '!',
    max_bots: 100,
    server_version: '1.16.5'
};

try {
    const configFile = fs.readFileSync('config.json', 'utf8');
    Object.assign(config, JSON.parse(configFile));
} catch (e) {
    console.log('📝 Using default config');
}

// Predefined passwords for fast registration
const PASSWORDS = [
    'password123', 'minecraft', 'server123', 'bot123', 'admin123',
    '12345678', 'qwerty123', 'abc123456', 'botpassword', 'serverpass',
    'register123', 'login123', 'pass1234', 'botpass', 'mcserver'
];

class MinecraftBot {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.socket = null;
        this.connected = false;
        this.registered = false;
        this.entityId = null;
        this.x = 0;
        this.y = 65;
        this.z = 0;
    }

    connect() {
        return new Promise((resolve) => {
            console.log(`🤖 Connecting ${this.username}...`);
            
            this.socket = net.createConnection(config.server_port, config.server_ip);
            
            let handshakeDone = false;
            let loginStart = false;
            
            this.socket.setTimeout(10000);
            
            this.socket.on('connect', () => {
                console.log(`✅ ${this.username} connected`);
                // Send handshake
                this.sendHandshake();
            });

            this.socket.on('data', (data) => {
                this.handlePacket(data);
            });

            this.socket.on('timeout', () => {
                console.log(`❌ ${this.username} timeout`);
                this.socket.destroy();
                resolve(false);
            });

            this.socket.on('error', (err) => {
                if (err.code === 'ECONNRESET') {
                    // Ignore connection reset errors
                    return;
                }
                console.log(`❌ ${this.username} error:`, err.message);
                resolve(false);
            });

            this.socket.on('close', () => {
                this.connected = false;
            });

            // Resolve after connection
            setTimeout(() => {
                if (this.connected) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }, 5000);
        });
    }

    sendHandshake() {
        // Protocol version 754 = 1.16.5
        const protocol = 754;
        const packet = this.createHandshakePacket(protocol, config.server_ip, config.server_port, 2);
        this.socket.write(packet);
    }

    createHandshakePacket(protocol, host, port, state) {
        const buffer = Buffer.alloc(1024);
        let offset = 0;
        
        // Packet ID (VarInt)
        offset = this.writeVarInt(buffer, offset, 0x00);
        
        // Protocol Version (VarInt)
        offset = this.writeVarInt(buffer, offset, protocol);
        
        // Server Address (String)
        offset = this.writeString(buffer, offset, host);
        
        // Port (Unsigned Short)
        buffer.writeUInt16BE(port, offset);
        offset += 2;
        
        // Next State (VarInt)
        offset = this.writeVarInt(buffer, offset, state);
        
        // Packet Length (VarInt)
        const packetData = buffer.slice(0, offset);
        const lengthBuffer = Buffer.alloc(5);
        const lenOffset = this.writeVarInt(lengthBuffer, 0, packetData.length);
        
        return Buffer.concat([lengthBuffer.slice(0, lenOffset), packetData]);
    }

    writeVarInt(buffer, offset, value) {
        let bytes = 0;
        do {
            let byte = value & 0x7F;
            value >>>= 7;
            if (value !== 0) {
                byte |= 0x80;
            }
            buffer[offset + bytes] = byte;
            bytes++;
        } while (value !== 0);
        return offset + bytes;
    }

    writeString(buffer, offset, value) {
        const strBuffer = Buffer.from(value, 'utf8');
        offset = this.writeVarInt(buffer, offset, strBuffer.length);
        strBuffer.copy(buffer, offset);
        return offset + strBuffer.length;
    }

    handlePacket(data) {
        // Parse packet
        let offset = 0;
        let packetId = 0;
        let bytesRead = 0;
        
        // Read packet length
        const packetLength = this.readVarInt(data, offset);
        offset += packetLength.bytes;
        
        // Read packet ID
        const packetIdResult = this.readVarInt(data, offset);
        packetId = packetIdResult.value;
        offset += packetIdResult.bytes;
        
        // Handle different packet types
        switch(packetId) {
            case 0x00: // Login Success
                this.connected = true;
                console.log(`✅ ${this.username} logged in successfully`);
                this.sendLoginStart();
                break;
            case 0x01: // Join Game
                this.connected = true;
                // Send client settings
                this.sendClientSettings();
                break;
            case 0x03: // Player Position And Look
                // Do NOT respond with movement packets
                // Just ignore
                break;
            case 0x1D: // Chat Message
                this.handleChatMessage(data, offset);
                break;
            case 0x22: // Keep Alive
                this.handleKeepAlive(data, offset);
                break;
        }
    }

    readVarInt(buffer, offset) {
        let result = 0;
        let bytes = 0;
        let value;
        do {
            if (offset + bytes >= buffer.length) {
                return { value: 0, bytes: 0 };
            }
            value = buffer[offset + bytes];
            result |= (value & 0x7F) << (7 * bytes);
            bytes++;
        } while ((value & 0x80) !== 0);
        return { value: result, bytes: bytes };
    }

    sendLoginStart() {
        // Login Start packet
        const buffer = Buffer.alloc(1024);
        let offset = 0;
        
        // Packet ID (VarInt)
        offset = this.writeVarInt(buffer, offset, 0x00);
        
        // Username (String)
        offset = this.writeString(buffer, offset, this.username);
        
        const packetData = buffer.slice(0, offset);
        const lengthBuffer = Buffer.alloc(5);
        const lenOffset = this.writeVarInt(lengthBuffer, 0, packetData.length);
        
        this.socket.write(Buffer.concat([lengthBuffer.slice(0, lenOffset), packetData]));
    }

    sendClientSettings() {
        // Client Settings packet
        const buffer = Buffer.alloc(1024);
        let offset = 0;
        
        // Packet ID (VarInt)
        offset = this.writeVarInt(buffer, offset, 0x04);
        
        // Locale (String)
        offset = this.writeString(buffer, offset, 'en_US');
        
        // View Distance (Byte)
        buffer[offset] = 10;
        offset += 1;
        
        // Chat Mode (VarInt)
        offset = this.writeVarInt(buffer, offset, 0);
        
        // Chat Colors (Boolean)
        buffer[offset] = 1;
        offset += 1;
        
        // Displayed Skin Parts (Byte)
        buffer[offset] = 0x7F;
        offset += 1;
        
        // Main Hand (VarInt)
        offset = this.writeVarInt(buffer, offset, 1);
        
        const packetData = buffer.slice(0, offset);
        const lengthBuffer = Buffer.alloc(5);
        const lenOffset = this.writeVarInt(lengthBuffer, 0, packetData.length);
        
        this.socket.write(Buffer.concat([lengthBuffer.slice(0, lenOffset), packetData]));
        
        // Start registration after settings
        setTimeout(() => {
            this.register();
        }, 500);
    }

    register() {
        if (this.registered) return;
        
        const commands = [
            `/register ${this.password} ${this.password}`,
            `/reg ${this.password} ${this.password}`,
            `/login ${this.password}`,
            `/l ${this.password}`
        ];
        
        let cmdIndex = 0;
        const sendNextCommand = () => {
            if (cmdIndex >= commands.length || this.registered) {
                // Send join message
                setTimeout(() => {
                    this.sendChatMessage('/me joined! 🤖');
                }, 500);
                return;
            }
            
            this.sendChatMessage(commands[cmdIndex]);
            cmdIndex++;
            setTimeout(sendNextCommand, 300);
        };
        
        sendNextCommand();
    }

    sendChatMessage(message) {
        if (!this.socket || !this.connected) return;
        
        const buffer = Buffer.alloc(1024);
        let offset = 0;
        
        // Packet ID (VarInt)
        offset = this.writeVarInt(buffer, offset, 0x03);
        
        // Message (String)
        offset = this.writeString(buffer, offset, message);
        
        const packetData = buffer.slice(0, offset);
        const lengthBuffer = Buffer.alloc(5);
        const lenOffset = this.writeVarInt(lengthBuffer, 0, packetData.length);
        
        this.socket.write(Buffer.concat([lengthBuffer.slice(0, lenOffset), packetData]));
    }

    handleChatMessage(data, offset) {
        // Parse chat message
        const messageResult = this.readString(data, offset);
        if (messageResult) {
            const message = messageResult.value;
            
            // Check registration
            if (message.includes('registered') || message.includes('Registered')) {
                this.registered = true;
                console.log(`✅ ${this.username} registered`);
            }
            
            // Handle commands
            if (message.startsWith(config.command_prefix)) {
                this.handleCommand(message);
            }
        }
    }

    readString(buffer, offset) {
        const lengthResult = this.readVarInt(buffer, offset);
        if (lengthResult.bytes === 0) return null;
        const strOffset = offset + lengthResult.bytes;
        const strBuffer = buffer.slice(strOffset, strOffset + lengthResult.value);
        return {
            value: strBuffer.toString('utf8'),
            bytes: lengthResult.bytes + lengthResult.value
        };
    }

    handleKeepAlive(data, offset) {
        // Respond to keep alive
        const id = data.readBigInt64BE(offset);
        const buffer = Buffer.alloc(16);
        let bufOffset = 0;
        bufOffset = this.writeVarInt(buffer, bufOffset, 0x00);
        buffer.writeBigInt64BE(id, bufOffset);
        
        const packetData = buffer.slice(0, bufOffset + 8);
        const lengthBuffer = Buffer.alloc(5);
        const lenOffset = this.writeVarInt(lengthBuffer, 0, packetData.length);
        
        this.socket.write(Buffer.concat([lengthBuffer.slice(0, lenOffset), packetData]));
    }

    handleCommand(command) {
        // Handle basic commands
        const parts = command.slice(1).trim().split(' ');
        const cmd = parts[0].toLowerCase();
        
        switch(cmd) {
            case 'ping':
                this.sendChatMessage('Pong!');
                break;
            case 'help':
                this.sendChatMessage('Commands: !ping, !help, !status, !say <msg>');
                break;
            case 'status':
                this.sendChatMessage(`Bot ${this.username} is online!`);
                break;
            case 'say':
                if (parts.length > 1) {
                    const msg = parts.slice(1).join(' ');
                    this.sendChatMessage(msg);
                }
                break;
            default:
                this.sendChatMessage(`Unknown command: ${cmd}`);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.destroy();
            this.connected = false;
        }
    }
}

class BotManager {
    constructor() {
        this.bots = [];
        this.usedNames = new Set();
        this.totalJoined = 0;
        this.totalRemoved = 0;
        this.runnerId = process.env.RUNNER_ID || `runner_${Date.now()}`;
        this.botNames = this.generateBotNames();
    }

    generateBotNames() {
        const names = [];
        const prefixes = ['Bot', 'Player', 'Hero', 'Ace', 'Pro', 'Star', 'Nitro', 'Blaze', 'Shadow', 'Frost'];
        
        for (let i = 0; i < 100; i++) {
            prefixes.forEach(prefix => {
                names.push(`${prefix}${i}`);
            });
        }
        
        const randomNames = [
            'Nitro', 'Blaze', 'Shadow', 'Frost', 'Storm', 'Venom', 'Raven', 'Lunar',
            'Solar', 'Nova', 'Zephyr', 'Phantom', 'Viper', 'Cobra', 'Falcon', 'Eagle',
            'Titan', 'Atlas', 'Neon', 'Cosmic', 'Galaxy', 'Quantum', 'Zen', 'Karma'
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

    async spawnBot() {
        const username = this.getUniqueName();
        const password = PASSWORDS[Math.floor(Math.random() * PASSWORDS.length)];
        
        const bot = new MinecraftBot(username, password);
        const success = await bot.connect();
        
        if (success) {
            this.bots.push(bot);
            this.totalJoined++;
            console.log(`✅ ${username} joined successfully (${this.totalJoined}/${config.max_bots})`);
            return true;
        } else {
            console.log(`❌ ${username} failed to join`);
            this.usedNames.delete(username);
            return false;
        }
    }

    async spawnAllBots() {
        const maxBots = Math.min(config.bots_per_runner, config.max_bots);
        let spawned = 0;

        console.log('='.repeat(60));
        console.log(`🚀 Starting Bot Controller on runner: ${this.runnerId}`);
        console.log(`🎯 Target server: ${config.server_ip}:${config.server_port}`);
        console.log(`🤖 Bots to spawn: ${maxBots}`);
        console.log('='.repeat(60));

        for (let i = 0; i < maxBots * 2 && spawned < maxBots; i++) {
            const success = await this.spawnBot();
            if (success) {
                spawned++;
                await this.sleep(config.bot_spawn_delay);
            } else {
                await this.sleep(1000);
            }
        }

        console.log(`✅ Successfully spawned ${spawned} bots`);
        
        if (config.video_helper_mode && spawned > 0) {
            await this.sleep(3000);
            await this.runVideoHelper();
        }
    }

    async runVideoHelper() {
        console.log('🎬 Starting video helper mode');
        
        const messages = [
            '/me [Video] Starting recording... 🎥',
            '/me [Video] Creating army formation',
            '/me [Video] Battle formation activated',
            '/me [Video] Recording completed! 🎉'
        ];
        
        for (let i = 0; i < messages.length; i++) {
            const botsToUse = this.bots.slice(0, Math.min(10, this.bots.length));
            for (const bot of botsToUse) {
                if (bot.connected) {
                    bot.sendChatMessage(messages[i]);
                }
            }
            console.log(`📹 Video command ${i + 1}`);
            await this.sleep(2000);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    start() {
        this.spawnAllBots();
        
        // Keep alive
        setInterval(() => {
            const active = this.bots.filter(b => b.connected).length;
            console.log(`📊 Active: ${active}/${this.bots.length} | Joined: ${this.totalJoined} | Removed: ${this.totalRemoved}`);
        }, 30000);

        process.on('SIGINT', () => {
            console.log('🛑 Shutting down...');
            for (const bot of this.bots) {
                bot.disconnect();
            }
            process.exit();
        });
    }
}

// Run
const manager = new BotManager();
manager.start();
