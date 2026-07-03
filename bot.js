const mineflayer = require('mineflayer');
const fs = require('fs');

// ============================================
// CONFIG
// ============================================
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

console.log('='.repeat(60));
console.log('🚀 BOT SYSTEM - FULL MOVEMENT CONTROL');
console.log(`🎯 Server: ${config.server_ip}:${config.server_port}`);
console.log(`🤖 Max Bots: ${config.max_bots}`);
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
    BOT_NAMES.push(`Pro${i}`);
}
const RANDOMS = ['Nitro', 'Blaze', 'Shadow', 'Frost', 'Storm', 'Venom', 'Raven', 'Lunar', 'Solar', 'Nova'];
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
        this.totalRemoved = 0;
        this.usedNames = new Set();
        this.startTime = Date.now();
        this.movingBots = new Map(); // Track moving bots
        
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
            
            // Movement Controls
            'forward': this.cmdForward.bind(this),
            'back': this.cmdBack.bind(this),
            'left': this.cmdLeft.bind(this),
            'right': this.cmdRight.bind(this),
            'jump': this.cmdJump.bind(this),
            'sprint': this.cmdSprint.bind(this),
            'sneak': this.cmdSneak.bind(this),
            'stop': this.cmdStop.bind(this),
            'look': this.cmdLook.bind(this),
            
            // Actions
            'attack': this.cmdAttack.bind(this),
            'swing': this.cmdSwing.bind(this),
            'dance': this.cmdDance.bind(this),
            'wave': this.cmdWave.bind(this),
            'spin': this.cmdSpin.bind(this),
            'bow': this.cmdBow.bind(this),
            'salute': this.cmdSalute.bind(this),
            
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
            
            // Formations
            'heart': this.cmdHeart.bind(this),
            'star': this.cmdStar.bind(this),
            'vformation': this.cmdVFormation.bind(this),
            'xformation': this.cmdXFormation.bind(this),
            'arrow': this.cmdArrow.bind(this),
            'cross': this.cmdCross.bind(this),
            
            // Chat
            'say': this.cmdSay.bind(this),
            'broadcast': this.cmdBroadcast.bind(this),
            'whisper': this.cmdWhisper.bind(this),
            
            // Control
            'remove': this.cmdRemove.bind(this),
            'kill': this.cmdRemove.bind(this),
            'join': this.cmdJoin.bind(this),
            'leave': this.cmdLeave.bind(this),
            'reset': this.cmdReset.bind(this),
            'count': this.cmdCount.bind(this),
            'uptime': this.cmdUptime.bind(this)
        };
        
        setInterval(() => this.displayStatus(), 60000);
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
    // SPAWN BOT - PHYSICS ENABLED
    // ============================================
    async spawnBot() {
        const username = this.getUniqueName();
        const botId = this.bots.length;

        return new Promise((resolve) => {
            console.log(`🤖 [${botId}] Spawning: ${username}`);

            const bot = mineflayer.createBot({
                host: config.server_ip,
                port: config.server_port,
                username: username,
                version: config.server_version || '1.16.5',
                auth: 'offline',
                physicsEnabled: true,  // ENABLED FOR MOVEMENT
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

            bot.on('login', () => {
                connected = true;
                clearTimeout(timeout);
                
                bot.botId = botId;
                bot.username = username;
                bot.connected = true;
                bot.x = 0;
                bot.y = 65;
                bot.z = 0;
                bot.isMoving = false;

                this.bots.push(bot);
                this.totalJoined++;
                
                console.log(`✅ [${botId}] ${username} joined! (${this.bots.length}/${config.max_bots})`);

                // Send join message
                setTimeout(() => {
                    if (bot.connected) {
                        bot.chat('/me joined! 🤖');
                    }
                }, 2000);

                // Chat listener
                bot.on('message', (message) => {
                    const text = message.toString();
                    
                    if (text.startsWith('!')) {
                        const command = text.slice(1).trim();
                        console.log(`📝 ${username}: ${command}`);
                        this.executeCommand(command, bot);
                    }
                });

                // Position tracking
                bot.on('move', () => {
                    if (bot.entity) {
                        bot.x = bot.entity.position.x;
                        bot.y = bot.entity.position.y;
                        bot.z = bot.entity.position.z;
                    }
                });

                // Physics tick - for movement
                bot.on('physicsTick', () => {
                    // Movement handled by setControlState
                });

                bot.on('error', (err) => {
                    if (err.message && err.message.includes('timeout')) return;
                    if (err.message && err.message.includes('ECONNRESET')) return;
                    if (err.message && err.message.includes('move')) return;
                    console.log(`⚠️ [${botId}] ${username}:`, err.message);
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
    // EXECUTE COMMAND
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
    // MOVEMENT CONTROL FUNCTIONS
    // ============================================
    
    // Make bot move forward
    async moveForward(bot, duration = 2000) {
        bot.setControlState('forward', true);
        bot.isMoving = true;
        setTimeout(() => {
            bot.setControlState('forward', false);
            bot.isMoving = false;
        }, duration);
    }

    // Make bot move backward
    async moveBackward(bot, duration = 2000) {
        bot.setControlState('back', true);
        bot.isMoving = true;
        setTimeout(() => {
            bot.setControlState('back', false);
            bot.isMoving = false;
        }, duration);
    }

    // Make bot strafe left
    async moveLeft(bot, duration = 2000) {
        bot.setControlState('left', true);
        bot.isMoving = true;
        setTimeout(() => {
            bot.setControlState('left', false);
            bot.isMoving = false;
        }, duration);
    }

    // Make bot strafe right
    async moveRight(bot, duration = 2000) {
        bot.setControlState('right', true);
        bot.isMoving = true;
        setTimeout(() => {
            bot.setControlState('right', false);
            bot.isMoving = false;
        }, duration);
    }

    // Make bot jump
    async doJump(bot) {
        bot.setControlState('jump', true);
        setTimeout(() => {
            bot.setControlState('jump', false);
        }, 300);
    }

    // Make bot sprint
    async doSprint(bot, duration = 2000) {
        bot.setControlState('sprint', true);
        setTimeout(() => {
            bot.setControlState('sprint', false);
        }, duration);
    }

    // Make bot sneak
    async doSneak(bot, duration = 2000) {
        bot.setControlState('sneak', true);
        setTimeout(() => {
            bot.setControlState('sneak', false);
        }, duration);
    }

    // Stop all movement
    async stopMoving(bot) {
        bot.clearControlStates();
        bot.isMoving = false;
    }

    // Look at position
    async lookAt(bot, x, y, z) {
        try {
            await bot.lookAt(new Vec3(x, y, z));
        } catch (e) {
            // Ignore
        }
    }

    // ============================================
    // COMMAND IMPLEMENTATIONS
    // ============================================
    
    // ----- BASIC -----
    cmdPing(bot, args) {
        bot.chat(`🏓 Pong! ${bot.username} is alive`);
    }

    cmdHelp(bot, args) {
        const help = `=== ALL COMMANDS ===
!ping, !help, !status, !info, !list
!army, !select N, !clear, !all
!forward, !back, !left, !right, !jump
!sprint, !sneak, !stop
!attack, !swing, !dance, !wave, !spin, !bow, !salute
!circle NAME, !formation, !spread, !follow NAME
!move X Y Z, !line, !square, !grid, !diamond, !spiral
!heart, !star, !vformation, !xformation, !arrow, !cross
!say MSG, !broadcast MSG, !whisper NAME MSG
!remove NAME, !join N, !leave, !reset, !count, !uptime`;
        bot.chat(help);
    }

    cmdStatus(bot, args) {
        const active = this.bots.filter(b => b.connected).length;
        const selected = this.selectedBots.size;
        bot.chat(`📊 Active: ${active}/${this.bots.length} | Selected: ${selected} | Joined: ${this.totalJoined}`);
    }

    cmdInfo(bot, args) {
        bot.chat(`🤖 ${bot.username} | ID: ${bot.botId} | Connected: ${bot.connected} | Pos: (${bot.x?.toFixed(1) || 0}, ${bot.y?.toFixed(1) || 65}, ${bot.z?.toFixed(1) || 0})`);
    }

    cmdList(bot, args) {
        const list = this.bots.filter(b => b.connected).map(b => b.username).join(', ');
        bot.chat(`📋 Bots: ${list || 'None'}`);
    }

    // ----- SELECTION -----
    cmdArmy(bot, args) {
        this.selectedBots.clear();
        const connected = this.bots.filter(b => b.connected && b.botId !== bot.botId);
        connected.forEach(b => this.selectedBots.add(b.botId));
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

    // ----- MOVEMENT CONTROLS -----
    cmdForward(bot, args) {
        const duration = parseInt(args[0]) || 2000;
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            this.moveForward(b, duration);
            b.chat(`🚶 Moving forward!`);
        });
        bot.chat(`✅ ${targets.length} bots moving forward!`);
    }

    cmdBack(bot, args) {
        const duration = parseInt(args[0]) || 2000;
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            this.moveBackward(b, duration);
            b.chat(`🚶 Moving back!`);
        });
        bot.chat(`✅ ${targets.length} bots moving back!`);
    }

    cmdLeft(bot, args) {
        const duration = parseInt(args[0]) || 2000;
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            this.moveLeft(b, duration);
            b.chat(`🚶 Moving left!`);
        });
        bot.chat(`✅ ${targets.length} bots moving left!`);
    }

    cmdRight(bot, args) {
        const duration = parseInt(args[0]) || 2000;
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            this.moveRight(b, duration);
            b.chat(`🚶 Moving right!`);
        });
        bot.chat(`✅ ${targets.length} bots moving right!`);
    }

    cmdJump(bot, args) {
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            this.doJump(b);
            b.chat(`🦘 Jump!`);
        });
        bot.chat(`✅ ${targets.length} bots jumped!`);
    }

    cmdSprint(bot, args) {
        const duration = parseInt(args[0]) || 2000;
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            this.doSprint(b, duration);
            b.chat(`🏃 Sprinting!`);
        });
        bot.chat(`✅ ${targets.length} bots sprinting!`);
    }

    cmdSneak(bot, args) {
        const duration = parseInt(args[0]) || 2000;
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            this.doSneak(b, duration);
            b.chat(`🥷 Sneaking!`);
        });
        bot.chat(`✅ ${targets.length} bots sneaking!`);
    }

    cmdStop(bot, args) {
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            this.stopMoving(b);
            b.chat(`🛑 Stopped!`);
        });
        bot.chat(`✅ ${targets.length} bots stopped!`);
    }

    cmdLook(bot, args) {
        if (args.length < 3) {
            bot.chat('Usage: !look <x> <y> <z>');
            return;
        }
        const x = parseFloat(args[0]);
        const y = parseFloat(args[1]);
        const z = parseFloat(args[2]);
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            this.lookAt(b, x, y, z);
        });
        bot.chat(`✅ ${targets.length} bots looking!`);
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
                    // Attack the target
                    try {
                        b.attack(target);
                    } catch (e) {}
                    b.chat(`⚔️ attacks ${target.username}!`);
                }
            }
            bot.chat(`⚔️ Attacking ${target.username}!`);
        } else {
            bot.chat('❌ No target');
        }
    }

    cmdSwing(bot, args) {
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            b.swingArm();
            b.chat('🤜 Swings arm!');
        });
        bot.chat(`✅ ${targets.length} bots swung!`);
    }

    cmdDance(bot, args) {
        const targets = this.getTargetBots(bot);
        const moves = [
            { action: 'jump', msg: '🦘' },
            { action: 'spin', msg: '🔄' },
            { action: 'jump', msg: '🦘' },
            { action: 'spin', msg: '🔄' }
        ];
        
        let moveIndex = 0;
        const danceInterval = setInterval(() => {
            if (moveIndex >= moves.length) {
                clearInterval(danceInterval);
                return;
            }
            const move = moves[moveIndex];
            for (const b of targets.slice(0, 15)) {
                if (b.connected) {
                    if (move.action === 'jump') {
                        this.doJump(b);
                    } else if (move.action === 'spin') {
                        b.chat('/me spins!');
                    }
                    b.chat(`💃 ${move.msg}`);
                }
            }
            moveIndex++;
        }, 600);
        
        bot.chat('💃 Dancing!');
    }

    cmdWave(bot, args) {
        const targets = this.getTargetBots(bot);
        for (const b of targets.slice(0, 20)) {
            if (b.connected) {
                b.swingArm();
                b.chat('👋 Wave!');
            }
        }
        bot.chat('👋 Wave!');
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
                b.swingArm();
                b.chat('/me salutes! 🫡');
            }
        }
        bot.chat('🫡 Salute!');
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
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} ${y} ${z}`);
            }
        });
        bot.chat(`✅ Moved ${targets.length} bots!`);
    }

    cmdTp(bot, args) { this.cmdMove(bot, args); }

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
        const count = Math.min(targets.length, 30);
        
        for (let i = 0; i < count; i++) {
            const angle = (2 * Math.PI * i) / count;
            const x = (target.x || 0) + radius * Math.cos(angle);
            const z = (target.z || 0) + radius * Math.sin(angle);
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
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat(`✅ Formation!`);
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

    cmdGoto(bot, args) { this.cmdFollow(bot, args); }

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
        bot.chat(`✅ Line!`);
    }

    cmdSquare(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 30);
        const size = parseFloat(args[0]) || 15;
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
        bot.chat(`✅ Square!`);
    }

    cmdGrid(bot, args) {
        const targets = this.getTargetBots(bot);
        const cols = parseInt(args[0]) || 8;
        const spacing = parseFloat(args[1]) || 3;
        
        for (let i = 0; i < targets.length && i < 60; i++) {
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
        const size = parseFloat(args[0]) || 12;
        
        for (let i = 0; i < targets.length && i < 30; i++) {
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
        const radius = parseFloat(args[0]) || 15;
        const turns = parseFloat(args[1]) || 2;
        
        for (let i = 0; i < targets.length && i < 30; i++) {
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

    // ----- FORMATIONS -----
    cmdHeart(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 30);
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
        const count = Math.min(targets.length, 30);
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
        const count = Math.min(targets.length, 20);
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const x = (bot.x || 0) - t * 15 + 8;
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
        const count = Math.min(targets.length, 20);
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const x1 = (bot.x || 0) - t * 15 + 8;
            const x2 = (bot.x || 0) + t * 15 - 8;
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
        const count = Math.min(targets.length, 20);
        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / 4);
            const col = i % 4;
            const x = (bot.x || 0) + (col - 1.5) * 2;
            const z = (bot.z || 0) + row * 2.5;
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat('🏹 Arrow!');
    }

    cmdCross(bot, args) {
        const targets = this.getTargetBots(bot);
        const count = Math.min(targets.length, 15);
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const x = (bot.x || 0) + (t - 0.5) * 15;
            const z = (bot.z || 0) + (i % 2 === 0 ? 0 : (t - 0.5) * 12);
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat('✝️ Cross!');
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
        bot.chat(`❌ ${targetName} not found`);
    }

    cmdJoin(bot, args) {
        const count = parseInt(args[0]) || 5;
        bot.chat(`🔄 Joining ${count} more bots...`);
        for (let i = 0; i < count; i++) {
            setTimeout(() => this.spawnBot(), i * 1500);
        }
    }

    cmdLeave(bot, args) {
        bot.chat('👋 Leaving...');
        setTimeout(() => { bot.end(); }, 1000);
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
        console.log(`📊 STATUS: ${active}/${this.bots.length} active | Selected: ${this.selectedBots.size}`);
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

        for (let i = 0; i < maxBots * 2 && spawned < maxBots; i++) {
            const success = await this.spawnBot();
            if (success) {
                spawned++;
                await this.sleep(config.bot_spawn_delay);
            } else {
                await this.sleep(1000);
            }
        }

        console.log(`✅ Spawned ${spawned} bots!`);
        console.log('🎯 Type !help in game');
        console.log('🎯 Try: !forward, !back, !jump, !dance');
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
// Vec3 Helper
// ============================================
class Vec3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
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
