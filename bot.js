const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalBlock, GoalNear, GoalFollow, GoalXZ, GoalInvert, GoalComposite } = require('mineflayer-pathfinder').goals;
const collectBlock = require('mineflayer-collectblock').plugin;
const pvp = require('mineflayer-pvp').plugin;
const tool = require('mineflayer-tool').plugin;
const autoEat = require('mineflayer-auto-eat').plugin;
const Vec3 = require('vec3');
const mcData = require('minecraft-data');
const fs = require('fs');

// ============================================
// CONFIG
// ============================================
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

console.log('='.repeat(70));
console.log('🚀 ULTRA BOT SYSTEM - FULL MOVEMENT');
console.log(`🎯 Server: ${config.server_ip}:${config.server_port}`);
console.log(`🤖 Max Bots: ${config.max_bots}`);
console.log('='.repeat(70));

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
    BOT_NAMES.push(`Star${i}`);
}
const RANDOMS = ['Nitro', 'Blaze', 'Shadow', 'Frost', 'Storm', 'Venom', 'Raven', 'Lunar', 'Solar', 'Nova', 'Zephyr', 'Phantom', 'Viper', 'Cobra', 'Falcon', 'Eagle', 'Titan', 'Atlas', 'Neon', 'Cosmic', 'Galaxy'];
RANDOMS.forEach(name => {
    BOT_NAMES.push(name);
    for (let i = 0; i < 3; i++) BOT_NAMES.push(`${name}${i}`);
});

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
        this.movementTasks = new Map();
        this.patrolPoints = new Map();
        this.wanderStates = new Map();
        
        // ============================================
        // COMMANDS
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
            'lookplayer': this.cmdLookPlayer.bind(this),
            
            // Pathfinding
            'goto': this.cmdGoto.bind(this),
            'follow': this.cmdFollow.bind(this),
            'followplayer': this.cmdFollowPlayer.bind(this),
            'followbot': this.cmdFollowBot.bind(this),
            'circle': this.cmdCircle.bind(this),
            'orbit': this.cmdOrbit.bind(this),
            'wander': this.cmdWander.bind(this),
            'patrol': this.cmdPatrol.bind(this),
            
            // Combat
            'attack': this.cmdAttack.bind(this),
            'attacknearest': this.cmdAttackNearest.bind(this),
            'attackmob': this.cmdAttackMob.bind(this),
            'attackplayer': this.cmdAttackPlayer.bind(this),
            'stopattack': this.cmdStopAttack.bind(this),
            
            // Mining
            'mine': this.cmdMine.bind(this),
            'dig': this.cmdDig.bind(this),
            
            // Building
            'place': this.cmdPlace.bind(this),
            
            // Inventory
            'equip': this.cmdEquip.bind(this),
            'unequip': this.cmdUnequip.bind(this),
            'eat': this.cmdEat.bind(this),
            'drop': this.cmdDrop.bind(this),
            'inventory': this.cmdInventory.bind(this),
            
            // Formations
            'formation': this.cmdFormation.bind(this),
            'line': this.cmdLine.bind(this),
            'square': this.cmdSquare.bind(this),
            'grid': this.cmdGrid.bind(this),
            'diamond': this.cmdDiamond.bind(this),
            'heart': this.cmdHeart.bind(this),
            'star': this.cmdStar.bind(this),
            'cross': this.cmdCross.bind(this),
            'arrow': this.cmdArrow.bind(this),
            'vformation': this.cmdVFormation.bind(this),
            'xformation': this.cmdXFormation.bind(this),
            'spiral': this.cmdSpiral.bind(this),
            
            // Actions
            'dance': this.cmdDance.bind(this),
            'wave': this.cmdWave.bind(this),
            'spin': this.cmdSpin.bind(this),
            'bow': this.cmdBow.bind(this),
            'salute': this.cmdSalute.bind(this),
            
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
    // SPAWN BOT
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
                physicsEnabled: true,
                hideErrors: true,
                keepAlive: true,
                checkTimeoutInterval: 60000,
                defaultPosition: [0, 65, 0],
                logErrors: false
            });

            // Load plugins
            bot.loadPlugin(pathfinder);
            bot.loadPlugin(collectBlock);
            bot.loadPlugin(pvp);
            bot.loadPlugin(tool);
            bot.loadPlugin(autoEat);

            let connected = false;

            const timeout = setTimeout(() => {
                if (!connected) {
                    console.log(`❌ [${botId}] ${username} timeout`);
                    bot.end();
                    resolve(false);
                }
            }, 20000);

            // ============================================
            // EVENTS
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
                bot.isMoving = false;
                bot.isAttacking = false;
                bot.currentGoal = null;
                bot.patrolIndex = 0;
                bot.wanderTimer = null;

                this.bots.push(bot);
                this.totalJoined++;
                
                console.log(`✅ [${botId}] ${username} joined! (${this.bots.length}/${config.max_bots})`);

                // Setup movement
                const mcData = require('minecraft-data')(bot.version);
                const defaultMove = new Movements(bot, mcData);
                defaultMove.canDig = true;
                defaultMove.scafoldingBlocks = [];
                bot.pathfinder.setMovements(defaultMove);

                // Send join message
                setTimeout(() => {
                    if (bot.connected) {
                        bot.chat('/me joined! 🤖');
                    }
                }, 2000);

                // ============================================
                // CHAT LISTENER
                // ============================================
                bot.on('message', (message) => {
                    const text = message.toString();
                    
                    if (text.startsWith('!')) {
                        const command = text.slice(1).trim();
                        console.log(`📝 ${username}: ${command}`);
                        this.executeCommand(command, bot);
                    }
                });

                // ============================================
                // POSITION TRACKING
                // ============================================
                bot.on('move', () => {
                    if (bot.entity) {
                        bot.x = bot.entity.position.x;
                        bot.y = bot.entity.position.y;
                        bot.z = bot.entity.position.z;
                    }
                });

                bot.on('physicsTick', () => {
                    // Handle physics
                });

                bot.on('health', () => {
                    // Auto eat
                    if (bot.food < 10) {
                        bot.autoEat();
                    }
                });

                bot.on('death', () => {
                    console.log(`💀 [${botId}] ${username} died`);
                    bot.isAttacking = false;
                    if (bot.pvp) {
                        bot.pvp.stop();
                    }
                });

                bot.on('respawn', () => {
                    console.log(`♻️ [${botId}] ${username} respawned`);
                });

                bot.on('kicked', (reason) => {
                    console.log(`👢 [${botId}] ${username} kicked:`, reason);
                    bot.connected = false;
                    this.totalRemoved++;
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
                    this.cleanupBot(bot);
                });

                resolve(true);
            });
        });
    }

    cleanupBot(bot) {
        if (bot.pathfinder) {
            bot.pathfinder.stop();
        }
        if (bot.pvp) {
            bot.pvp.stop();
        }
        if (bot.wanderTimer) {
            clearInterval(bot.wanderTimer);
            bot.wanderTimer = null;
        }
        if (bot.patrolInterval) {
            clearInterval(bot.patrolInterval);
            bot.patrolInterval = null;
        }
        bot.clearControlStates();
        bot.isMoving = false;
        bot.isAttacking = false;
        this.movementTasks.delete(bot.username);
        this.patrolPoints.delete(bot.username);
        this.wanderStates.delete(bot.username);
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
                console.error(`Error executing ${cmd}:`, e);
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
    // MOVEMENT HELPERS
    // ============================================
    async moveForward(bot, duration = 2000) {
        bot.setControlState('forward', true);
        bot.isMoving = true;
        if (duration > 0) {
            setTimeout(() => {
                bot.setControlState('forward', false);
                bot.isMoving = false;
            }, duration);
        }
    }

    async moveBackward(bot, duration = 2000) {
        bot.setControlState('back', true);
        bot.isMoving = true;
        setTimeout(() => {
            bot.setControlState('back', false);
            bot.isMoving = false;
        }, duration);
    }

    async moveLeft(bot, duration = 2000) {
        bot.setControlState('left', true);
        bot.isMoving = true;
        setTimeout(() => {
            bot.setControlState('left', false);
            bot.isMoving = false;
        }, duration);
    }

    async moveRight(bot, duration = 2000) {
        bot.setControlState('right', true);
        bot.isMoving = true;
        setTimeout(() => {
            bot.setControlState('right', false);
            bot.isMoving = false;
        }, duration);
    }

    async doJump(bot) {
        bot.setControlState('jump', true);
        setTimeout(() => {
            bot.setControlState('jump', false);
        }, 300);
    }

    async doSprint(bot, duration = 2000) {
        bot.setControlState('sprint', true);
        setTimeout(() => {
            bot.setControlState('sprint', false);
        }, duration);
    }

    async doSneak(bot, duration = 2000) {
        bot.setControlState('sneak', true);
        setTimeout(() => {
            bot.setControlState('sneak', false);
        }, duration);
    }

    async stopMoving(bot) {
        bot.clearControlStates();
        bot.isMoving = false;
        if (bot.pathfinder) {
            bot.pathfinder.stop();
        }
        if (this.movementTasks.has(bot.username)) {
            clearTimeout(this.movementTasks.get(bot.username));
            this.movementTasks.delete(bot.username);
        }
    }

    async lookAt(bot, x, y, z) {
        try {
            await bot.lookAt(new Vec3(x, y, z));
        } catch (e) {
            // Ignore
        }
    }

    async lookAtEntity(bot, entity) {
        try {
            await bot.lookAt(entity.position);
        } catch (e) {
            // Ignore
        }
    }

    async walkTo(bot, x, y, z) {
        try {
            const goal = new GoalBlock(Math.floor(x), Math.floor(y), Math.floor(z));
            await bot.pathfinder.setGoal(goal);
            return true;
        } catch (e) {
            console.error(`WalkTo error for ${bot.username}:`, e);
            return false;
        }
    }

    async followEntity(bot, entity, distance = 2) {
        try {
            const goal = new GoalFollow(entity, distance);
            bot.pathfinder.setGoal(goal, true);
            return true;
        } catch (e) {
            console.error(`Follow error for ${bot.username}:`, e);
            return false;
        }
    }

    // ============================================
    // COMMAND IMPLEMENTATIONS
    // ============================================
    
    cmdPing(bot, args) {
        bot.chat(`🏓 Pong! ${bot.username} is alive`);
    }

    cmdHelp(bot, args) {
        const help = `=== 🚀 ULTRA COMMANDS ===
!help, !ping, !status, !info, !list
!army, !select N, !clear, !all
!forward, !back, !left, !right, !jump
!sprint, !sneak, !stop
!look X Y Z, !lookplayer NAME
!goto X Y Z, !follow NAME, !circle NAME
!wander, !patrol X Y Z
!attack, !attacknearest, !attackmob, !attackplayer
!stopattack, !mine, !dig, !place
!equip, !unequip, !eat, !drop, !inventory
!formation, !line, !square, !grid, !diamond
!heart, !star, !cross, !arrow, !vformation
!xformation, !spiral, !dance, !wave, !spin
!bow, !salute, !say MSG, !broadcast MSG
!whisper NAME MSG, !remove NAME, !join N
!leave, !reset, !count, !uptime`;
        bot.chat(help);
    }

    cmdStatus(bot, args) {
        const active = this.bots.filter(b => b.connected).length;
        const selected = this.selectedBots.size;
        bot.chat(`📊 Active: ${active}/${this.bots.length} | Selected: ${selected} | Joined: ${this.totalJoined} | Removed: ${this.totalRemoved}`);
    }

    cmdInfo(bot, args) {
        const pos = bot.entity ? `(${bot.entity.position.x.toFixed(1)}, ${bot.entity.position.y.toFixed(1)}, ${bot.entity.position.z.toFixed(1)})` : '(0, 65, 0)';
        bot.chat(`🤖 ${bot.username} | ID: ${bot.botId} | Connected: ${bot.connected} | Pos: ${pos} | Health: ${bot.health || '?'}`);
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
        if (args[0] === 'all') {
            this.bots.forEach(b => {
                if (b.connected) this.stopMoving(b);
            });
            bot.chat(`🛑 All bots stopped!`);
        } else {
            bot.chat(`✅ ${targets.length} bots stopped!`);
        }
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

    cmdLookPlayer(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !lookplayer <name>');
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
        targets.forEach(b => {
            this.lookAtEntity(b, target.entity);
        });
        bot.chat(`✅ ${targets.length} bots looking at ${targetName}!`);
    }

    // ----- PATHFINDING -----
    cmdGoto(bot, args) {
        if (args.length < 3) {
            bot.chat('Usage: !goto <x> <y> <z>');
            return;
        }
        const x = parseFloat(args[0]);
        const y = parseFloat(args[1]);
        const z = parseFloat(args[2]);
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            b.chat(`🚀 Walking to (${x}, ${y}, ${z})`);
            this.walkTo(b, x, y, z);
        });
        bot.chat(`✅ ${targets.length} bots walking!`);
    }

    cmdFollow(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !follow <name>');
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
        targets.forEach(b => {
            b.chat(`👥 Following ${targetName}!`);
            this.followEntity(b, target.entity);
        });
        bot.chat(`✅ ${targets.length} bots following ${targetName}!`);
    }

    cmdFollowPlayer(bot, args) {
        this.cmdFollow(bot, args);
    }

    cmdFollowBot(bot, args) {
        this.cmdFollow(bot, args);
    }

    cmdCircle(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !circle <name> [radius]');
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

    cmdOrbit(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !orbit <name> [radius]');
            return;
        }
        this.cmdCircle(bot, args);
    }

    cmdWander(bot, args) {
        const range = parseInt(args[0]) || 20;
        const targets = this.getTargetBots(bot);
        
        targets.forEach(b => {
            b.chat(`🚶 Wandering within ${range} blocks!`);
            
            // Stop any existing wander
            if (b.wanderTimer) {
                clearInterval(b.wanderTimer);
                b.wanderTimer = null;
            }
            
            // Start wandering
            b.wanderTimer = setInterval(() => {
                if (!b.connected) {
                    clearInterval(b.wanderTimer);
                    b.wanderTimer = null;
                    return;
                }
                
                const x = (b.x || 0) + (Math.random() - 0.5) * range * 2;
                const z = (b.z || 0) + (Math.random() - 0.5) * range * 2;
                this.walkTo(b, x, 65, z);
            }, 3000);
        });
        
        bot.chat(`✅ ${targets.length} bots wandering!`);
    }

    cmdPatrol(bot, args) {
        if (args.length < 3) {
            bot.chat('Usage: !patrol <x1> <z1> <x2> <z2>');
            return;
        }
        
        const x1 = parseFloat(args[0]);
        const z1 = parseFloat(args[1]);
        const x2 = parseFloat(args[2]);
        const z2 = parseFloat(args[3]);
        
        const targets = this.getTargetBots(bot);
        const points = [
            new Vec3(x1, 65, z1),
            new Vec3(x2, 65, z2)
        ];
        
        targets.forEach(b => {
            b.chat(`🚶 Patrolling between points!`);
            b.patrolIndex = 0;
            
            if (b.patrolInterval) {
                clearInterval(b.patrolInterval);
                b.patrolInterval = null;
            }
            
            const patrol = () => {
                if (!b.connected) {
                    clearInterval(b.patrolInterval);
                    b.patrolInterval = null;
                    return;
                }
                const point = points[b.patrolIndex % points.length];
                this.walkTo(b, point.x, point.y, point.z);
                b.patrolIndex++;
            };
            
            patrol();
            b.patrolInterval = setInterval(patrol, 5000);
        });
        
        bot.chat(`✅ ${targets.length} bots patrolling!`);
    }

    // ----- COMBAT -----
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
        if (target && target.entity) {
            const targets = this.getTargetBots(bot);
            targets.forEach(b => {
                b.isAttacking = true;
                b.pvp.attack(target.entity);
                b.chat(`⚔️ Attacking ${target.username}!`);
            });
            bot.chat(`⚔️ ${targets.length} bots attacking ${target.username}!`);
        } else {
            bot.chat('❌ No target found');
        }
    }

    cmdAttackNearest(bot, args) {
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            const entity = b.nearestEntity();
            if (entity) {
                b.isAttacking = true;
                b.pvp.attack(entity);
                b.chat(`⚔️ Attacking nearest!`);
            }
        });
        bot.chat(`✅ ${targets.length} bots attacking nearest!`);
    }

    cmdAttackMob(bot, args) {
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            const entity = b.nearestEntity(e => e.type === 'mob');
            if (entity) {
                b.isAttacking = true;
                b.pvp.attack(entity);
                b.chat(`⚔️ Attacking mob!`);
            }
        });
        bot.chat(`✅ ${targets.length} bots attacking mobs!`);
    }

    cmdAttackPlayer(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !attackplayer <name>');
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
        if (target && target.entity) {
            const targets = this.getTargetBots(bot);
            targets.forEach(b => {
                b.isAttacking = true;
                b.pvp.attack(target.entity);
                b.chat(`⚔️ Attacking ${targetName}!`);
            });
            bot.chat(`✅ ${targets.length} bots attacking ${targetName}!`);
        } else {
            bot.chat(`❌ ${targetName} not found`);
        }
    }

    cmdStopAttack(bot, args) {
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            b.isAttacking = false;
            if (b.pvp) {
                b.pvp.stop();
            }
            b.chat(`🛑 Stopped attacking!`);
        });
        bot.chat(`✅ ${targets.length} bots stopped attacking!`);
    }

    // ----- MINING -----
    cmdMine(bot, args) {
        if (args.length < 3) {
            bot.chat('Usage: !mine <x> <y> <z>');
            return;
        }
        const x = parseInt(args[0]);
        const y = parseInt(args[1]);
        const z = parseInt(args[2]);
        const targets = this.getTargetBots(bot);
        
        targets.forEach(b => {
            const block = b.blockAt(new Vec3(x, y, z));
            if (block) {
                b.collectBlock.collect(block, (err) => {
                    if (err) {
                        b.chat(`❌ Mining failed: ${err.message}`);
                    } else {
                        b.chat(`⛏️ Mined block!`);
                    }
                });
            }
        });
        bot.chat(`✅ ${targets.length} bots mining!`);
    }

    cmdDig(bot, args) {
        this.cmdMine(bot, args);
    }

    // ----- BUILDING -----
    cmdPlace(bot, args) {
        if (args.length < 4) {
            bot.chat('Usage: !place <x> <y> <z> <block>');
            return;
        }
        const x = parseInt(args[0]);
        const y = parseInt(args[1]);
        const z = parseInt(args[2]);
        const blockName = args[3];
        const targets = this.getTargetBots(bot);
        
        targets.forEach(b => {
            const item = b.inventory.items().find(i => i.name === blockName);
            if (item) {
                b.equip(item, 'hand');
                const block = b.blockAt(new Vec3(x, y, z));
                if (block) {
                    b.placeBlock(block, new Vec3(0, 1, 0));
                    b.chat(`🧱 Placed ${blockName}!`);
                }
            } else {
                b.chat(`❌ No ${blockName} in inventory`);
            }
        });
        bot.chat(`✅ ${targets.length} bots placing!`);
    }

    // ----- INVENTORY -----
    cmdEquip(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !equip <item> [hand|off-hand|head|torso|legs|feet]');
            return;
        }
        const itemName = args[0];
        const slot = args[1] || 'hand';
        const targets = this.getTargetBots(bot);
        
        targets.forEach(b => {
            const item = b.inventory.items().find(i => i.name === itemName);
            if (item) {
                b.equip(item, slot);
                b.chat(`✅ Equipped ${itemName}`);
            } else {
                b.chat(`❌ No ${itemName} in inventory`);
            }
        });
        bot.chat(`✅ ${targets.length} bots equipped!`);
    }

    cmdUnequip(bot, args) {
        const slot = args[0] || 'hand';
        const targets = this.getTargetBots(bot);
        
        targets.forEach(b => {
            b.unequip(slot);
            b.chat(`✅ Unequipped ${slot}`);
        });
        bot.chat(`✅ ${targets.length} bots unequipped!`);
    }

    cmdEat(bot, args) {
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            const food = b.inventory.items().find(i => i.foodPoints > 0);
            if (food) {
                b.equip(food, 'hand');
                b.consume();
                b.chat(`🍽️ Eating!`);
            } else {
                b.chat(`❌ No food in inventory`);
            }
        });
        bot.chat(`✅ ${targets.length} bots eating!`);
    }

    cmdDrop(bot, args) {
        if (!args[0]) {
            bot.chat('Usage: !drop <item> [count]');
            return;
        }
        const itemName = args[0];
        const count = parseInt(args[1]) || 1;
        const targets = this.getTargetBots(bot);
        
        targets.forEach(b => {
            const item = b.inventory.items().find(i => i.name === itemName);
            if (item) {
                b.toss(item.type, null, count);
                b.chat(`💨 Dropped ${itemName}`);
            } else {
                b.chat(`❌ No ${itemName} in inventory`);
            }
        });
        bot.chat(`✅ ${targets.length} bots dropped!`);
    }

    cmdInventory(bot, args) {
        const targets = this.getTargetBots(bot);
        targets.forEach(b => {
            const items = b.inventory.items().map(i => `${i.name}x${i.count}`).join(', ');
            b.chat(`📦 Inventory: ${items || 'Empty'}`);
        });
        bot.chat(`✅ Inventory shown!`);
    }

    // ----- FORMATIONS -----
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
        const size = parseFloat(args[0]) || 15;
        const count = Math.min(targets.length, 30);
        
        for (let i = 0; i < count; i++) {
            const angle = (2 * Math.PI * i) / count;
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

    cmdSpiral(bot, args) {
        const targets = this.getTargetBots(bot);
        const radius = parseFloat(args[0]) || 15;
        const turns = parseFloat(args[1]) || 2;
        const count = Math.min(targets.length, 30);
        
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const r = radius * t;
            const angle = 2 * Math.PI * turns * t;
            const x = (bot.x || 0) + r * Math.cos(angle);
            const z = (bot.z || 0) + r * Math.sin(angle);
            const b = targets[i];
            if (b.connected) {
                b.chat(`/tp ${b.username} ${x} 65 ${z}`);
            }
        }
        bot.chat('✅ Spiral!');
    }

    // ----- ACTIONS -----
    cmdDance(bot, args) {
        const targets = this.getTargetBots(bot);
        let moveIndex = 0;
        const moves = [
            { action: 'jump', msg: '🦘' },
            { action: 'spin', msg: '🔄' },
            { action: 'jump', msg: '🦘' },
            { action: 'spin', msg: '🔄' }
        ];
        
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
            bot.chat('Usage: !whisper <name> <message>');
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
            bot.chat('Usage: !remove <name>');
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
            if (b.connected) {
                this.cleanupBot(b);
                b.end();
            }
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
        console.log('🎯 Try: !forward, !back, !jump, !dance, !attack');
    }

    // ============================================
    // START
    // ============================================
    async start() {
        await this.spawnAllBots();

        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down...');
            for (const bot of this.bots) {
                if (bot.connected) {
                    this.cleanupBot(bot);
                    bot.end();
                }
            }
            process.exit();
        });

        process.on('SIGTERM', () => {
            console.log('\n🛑 Shutting down...');
            for (const bot of this.bots) {
                if (bot.connected) {
                    this.cleanupBot(bot);
                    bot.end();
                }
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

process.on('unhandledRejection', (reason) => {
    console.log('⚠️ Unhandled Rejection:', reason);
});

manager.start().catch((err) => {
    console.error('❌ Fatal:', err);
    process.exit(1);
});
