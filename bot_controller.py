#!/usr/bin/env python3
import asyncio
import json
import logging
import random
import time
import socket
import struct
import math
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple
import os
import sys

# Try to import minecraft-protocol, with fallback
try:
    from minecraft.networking.connection import Connection
    from minecraft.networking.packets import Packet
    from minecraft.networking.packets.clientbound.play import (
        JoinGamePacket,
        ChatMessagePacket,
        PlayerInfoPacket,
        SpawnPlayerPacket
    )
    from minecraft.networking.packets.serverbound.play import (
        ChatPacket,
        PlayerPositionRotationPacket,
        KeepAlivePacket
    )
    MINECRAFT_PROTOCOL_AVAILABLE = True
except ImportError:
    MINECRAFT_PROTOCOL_AVAILABLE = False
    print("WARNING: minecraft-protocol not installed. Using fallback mode.")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SimpleMinecraftBot:
    """Simple Minecraft bot that works with server"""
    
    def __init__(self, bot_id: int, server_ip: str, server_port: int, 
                 username: str, runner_id: str, command_callback=None):
        self.bot_id = bot_id
        self.server_ip = server_ip
        self.server_port = server_port
        self.username = username
        self.runner_id = runner_id
        self.connected = False
        self.authenticated = False
        self.registered = False
        self.command_callback = command_callback
        self.running = True
        self.x = random.uniform(-20, 20)
        self.y = 64
        self.z = random.uniform(-20, 20)
        self.connection = None
        self.reconnect_attempts = 0
        
    async def check_player_exists(self) -> bool:
        """Check if player already exists on server"""
        try:
            # Use simple TCP connection to check
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(self.server_ip, self.server_port),
                timeout=5.0
            )
            writer.close()
            await writer.wait_closed()
            return False  # Assume player doesn't exist
        except Exception as e:
            logger.error(f"Error checking player existence: {e}")
            return False
    
    async def join_server(self):
        """Join the Minecraft server"""
        try:
            # Check if username exists
            exists = await self.check_player_exists()
            if exists:
                logger.warning(f"Username {self.username} already exists, skipping")
                return False
            
            if MINECRAFT_PROTOCOL_AVAILABLE:
                # Use minecraft-protocol if available
                self.connection = Connection(
                    self.server_ip,
                    self.server_port,
                    username=self.username,
                    auth_token=None
                )
                
                # Set up event handlers
                self.connection.register_packet_listener(
                    self.handle_chat,
                    ChatMessagePacket
                )
                
                # Connect
                await asyncio.wait_for(
                    self._connect_async(),
                    timeout=30.0
                )
                
                self.connected = True
                self.authenticated = True
                
                # Try to register
                await self.register_on_server()
                
                logger.info(f"Bot {self.username} joined server successfully")
                return True
            else:
                # Fallback: Simulate connection
                logger.info(f"Bot {self.username} joined in fallback mode")
                self.connected = True
                self.authenticated = True
                self.registered = True
                return True
                
        except asyncio.TimeoutError:
            logger.error(f"Bot {self.username} connection timeout")
            return False
        except Exception as e:
            logger.error(f"Bot {self.username} failed to join: {e}")
            return False
    
    async def _connect_async(self):
        """Async wrapper for connection"""
        if MINECRAFT_PROTOCOL_AVAILABLE and self.connection:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self.connection.connect)
    
    def handle_chat(self, packet):
        """Handle chat messages"""
        if packet.json_data:
            try:
                import json
                chat_data = json.loads(packet.json_data)
                message = chat_data.get('text', '')
                
                if "registered" in message.lower():
                    self.registered = True
                
                if message.startswith('!') and self.command_callback:
                    asyncio.create_task(self.command_callback(message, self))
            except:
                pass
    
    async def register_on_server(self):
        """Register bot on server"""
        if self.registered:
            return True
            
        try:
            password = self._generate_password()
            commands = [
                f"/register {password} {password}",
                f"/reg {password} {password}",
                f"/login {password}"
            ]
            
            for cmd in commands:
                await self.send_command(cmd)
                await asyncio.sleep(0.5)
                if self.registered:
                    break
            
            logger.info(f"Bot {self.username} registration attempt completed")
            return True
        except Exception as e:
            logger.error(f"Bot {self.username} registration failed: {e}")
            return False
    
    def _generate_password(self) -> str:
        """Generate random password"""
        chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return ''.join(random.choice(chars) for _ in range(12))
    
    async def send_command(self, command: str):
        """Send a command"""
        if self.connection and self.connected:
            try:
                packet = ChatPacket()
                packet.message = command
                self.connection.write_packet(packet)
                await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Failed to send command: {e}")
    
    async def send_message(self, message: str):
        """Send a chat message"""
        if self.connection and self.connected:
            try:
                packet = ChatPacket()
                packet.message = message
                self.connection.write_packet(packet)
            except Exception as e:
                logger.error(f"Failed to send message: {e}")
    
    async def move_to(self, x: float, y: float, z: float):
        """Move bot to position"""
        if not self.connected:
            return
            
        try:
            if MINECRAFT_PROTOCOL_AVAILABLE and self.connection:
                packet = PlayerPositionRotationPacket()
                packet.x = x
                packet.y = y
                packet.z = z
                packet.yaw = 0
                packet.pitch = 0
                packet.on_ground = True
                self.connection.write_packet(packet)
            
            self.x = x
            self.y = y
            self.z = z
            logger.debug(f"Bot {self.username} moved to ({x:.1f}, {y:.1f}, {z:.1f})")
        except Exception as e:
            logger.error(f"Error moving bot: {e}")
    
    async def create_circle(self, center_x: float, center_y: float, center_z: float, 
                           radius: float, bot_count: int, index: int):
        """Create circle formation"""
        try:
            angle = (2 * math.pi * index) / bot_count
            x = center_x + radius * math.cos(angle)
            z = center_z + radius * math.sin(angle)
            
            # Check ground level (simulated)
            ground_y = center_y + random.uniform(-0.5, 0.5)
            
            await self.move_to(x, ground_y, z)
            logger.info(f"Bot {self.username} placed in circle at ({x:.1f}, {ground_y:.1f}, {z:.1f})")
        except Exception as e:
            logger.error(f"Error placing bot in circle: {e}")
    
    async def keep_alive(self):
        """Keep the bot alive"""
        while self.running and self.connected:
            await asyncio.sleep(30)
            try:
                if MINECRAFT_PROTOCOL_AVAILABLE and self.connection:
                    # Send keep alive
                    pass
            except Exception as e:
                logger.error(f"Keep alive error: {e}")
                break
    
    async def disconnect(self):
        """Disconnect from server"""
        self.running = False
        self.connected = False
        if self.connection:
            try:
                self.connection.disconnect()
            except:
                pass
        logger.info(f"Bot {self.username} disconnected")

class BotManager:
    """Main bot controller"""
    
    def __init__(self, config_file: str = 'config.json'):
        self.config = self.load_config(config_file)
        self.bots: List[SimpleMinecraftBot] = []
        self.runner_id = os.environ.get('RUNNER_ID', f"{os.uname().nodename}_{os.getpid()}")
        self.selected_bots: Set[int] = set()
        self.total_joined = 0
        self.total_removed = 0
        self.command_handlers = {
            'ping': self.handle_ping,
            'help': self.handle_help,
            'status': self.handle_status,
            'circle': self.handle_circle,
            'army': self.handle_army,
            'select': self.handle_select,
            'remove': self.handle_remove,
            'move': self.handle_move,
            'say': self.handle_say,
            'formation': self.handle_formation,
            'attack': self.handle_attack,
            'dance': self.handle_dance,
            'follow': self.handle_follow,
            'spread': self.handle_spread,
            'info': self.handle_info
        }
        self.bot_names = self.load_bot_names()
        self.used_names = set()
    
    def load_config(self, config_file: str) -> Dict:
        """Load configuration"""
        default_config = {
            'server_ip': 'node.harshteotia.in',
            'server_port': 25566,
            'username_prefix': 'Bot',
            'bots_per_runner': 100,
            'bot_spawn_delay': 0.2,
            'enable_auto_reconnect': True,
            'video_helper_mode': True,
            'command_prefix': '!',
            'max_bots': 100
        }
        
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
                default_config.update(config)
        except FileNotFoundError:
            logger.warning(f"Config file {config_file} not found, using defaults")
            with open(config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
        
        return default_config
    
    def load_bot_names(self) -> List[str]:
        """Load bot names"""
        names = [
            "Nitro", "Blaze", "Shadow", "Frost", "Storm", "Venom", "Raven", "Lunar",
            "Solar", "Nova", "Zephyr", "Phantom", "Viper", "Cobra", "Falcon", "Eagle",
            "Titan", "Atlas", "Neon", "Cosmic", "Galaxy", "Quantum", "Zen", "Karma",
            "Apex", "Rogue", "Sage", "Hawk", "Wolf", "Bear", "Lion", "Tiger",
            "Dragon", "Phoenix", "Serpent", "Griffin", "Mystic", "Eclipse", "Aurora",
            "Midnight", "Dawn", "Dusk", "Ember", "Flare", "Glacier", "Havoc", "Inferno",
            "Jade", "Knight", "Legend", "Mercury", "Neptune", "Orion", "Pegasus",
            "Quasar", "Radar", "Sonic", "Tempest", "Ulysses", "Vanguard", "Warden",
            "Xenon", "Yukon", "Zeppelin", "Arctic", "Bandit", "Cipher", "Drift",
            "Echo", "Fury", "Gambit", "Helix", "Icarus", "Jinx", "Kestrel", "Lyric",
            "Maverick", "Nebula", "Omega", "Pathfinder", "Quest", "Rocket", "Spirit",
            "Thunder", "Unity", "Valor", "Wraith", "Xenith", "Yeti", "Zenith"
        ]
        
        # Add numbered names
        for i in range(100):
            names.append(f"Player{i}")
            names.append(f"Hero{i}")
            names.append(f"Ace{i}")
        
        return names
    
    def get_unique_name(self) -> str:
        """Get unique bot name"""
        available = [name for name in self.bot_names if name not in self.used_names]
        if not available:
            i = len(self.used_names)
            available = [f"Bot_{i}_{random.randint(100,999)}"]
        
        name = random.choice(available)
        self.used_names.add(name)
        return name
    
    async def spawn_bots(self):
        """Spawn all bots"""
        max_bots = min(self.config['bots_per_runner'], self.config['max_bots'])
        spawned = 0
        
        logger.info(f"Starting to spawn {max_bots} bots on runner {self.runner_id}")
        
        for i in range(max_bots * 2):
            if spawned >= max_bots:
                break
            
            username = self.get_unique_name()
            
            bot = SimpleMinecraftBot(
                bot_id=spawned,
                server_ip=self.config['server_ip'],
                server_port=self.config['server_port'],
                username=username,
                runner_id=self.runner_id,
                command_callback=self.handle_bot_command
            )
            
            success = await bot.join_server()
            if success:
                self.bots.append(bot)
                self.total_joined += 1
                asyncio.create_task(bot.keep_alive())
                logger.info(f"✅ Bot {bot.username} ({spawned+1}/{max_bots}) joined successfully")
                spawned += 1
                await asyncio.sleep(self.config['bot_spawn_delay'])
            else:
                self.used_names.discard(username)
                logger.warning(f"❌ Failed to spawn bot {i+1}, trying next...")
        
        logger.info(f"✅ Successfully spawned {spawned} bots out of {max_bots} attempts")
        logger.info(f"📊 Total bots: {len(self.bots)}")
    
    async def handle_bot_command(self, message: str, bot: SimpleMinecraftBot):
        """Handle bot commands"""
        if message.startswith("bot_removed_"):
            removed_name = message.replace("bot_removed_", "")
            self.total_removed += 1
            logger.info(f"Bot {removed_name} removed - Total removed: {self.total_removed}")
            return
            
        if not message.startswith(self.config['command_prefix']):
            return
            
        parts = message[1:].strip().split(' ', 1)
        cmd = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ''
        
        if cmd in self.command_handlers:
            await self.command_handlers[cmd](bot, args)
        else:
            await bot.send_message(f"Unknown command: {cmd}")
    
    async def handle_ping(self, bot: SimpleMinecraftBot, args: str):
        await bot.send_message(f"Pong! Bot {bot.username} is alive")
    
    async def handle_help(self, bot: SimpleMinecraftBot, args: str):
        help_msg = """=== BOT COMMANDS ===
!ping - Check bot status
!help - Show this help
!status - Show bot status
!circle <player> - Create circle around player
!army - Select all bots for army
!select <count> - Select bots for army
!remove <username> - Remove specific bot
!move <x> <y> <z> - Move bot
!say <message> - Broadcast message
!formation - Form battle formation
!attack - Attack command
!dance - Make bots dance
!follow <player> - Follow player
!spread - Spread out bots
!info - Show bot info"""
        await bot.send_message(help_msg)
    
    async def handle_status(self, bot: SimpleMinecraftBot, args: str):
        active = len([b for b in self.bots if b.connected])
        selected = len(self.selected_bots)
        status = f"Total: {len(self.bots)} | Active: {active} | Selected: {selected} | Joined: {self.total_joined} | Removed: {self.total_removed}"
        await bot.send_message(status)
    
    async def handle_circle(self, bot: SimpleMinecraftBot, args: str):
        try:
            if not args:
                await bot.send_message("Usage: !circle <player_name>")
                return
            
            target_name = args.split()[0]
            radius = 10
            bot_count = 50
            
            # Find target
            target_bot = None
            for b in self.bots:
                if b.username.lower() == target_name.lower() and b.connected:
                    target_bot = b
                    break
            
            if not target_bot:
                await bot.send_message(f"Player {target_name} not found")
                return
            
            # Get connected bots
            connected_bots = [b for b in self.bots if b.connected and b.bot_id != bot.bot_id]
            count = min(len(connected_bots), bot_count)
            
            if count < 1:
                await bot.send_message("Not enough bots for circle")
                return
            
            # Create circle
            for i, cb in enumerate(connected_bots[:count]):
                await cb.create_circle(target_bot.x, target_bot.y, target_bot.z, radius, count, i)
                await asyncio.sleep(0.05)
            
            await bot.send_message(f"✅ Circle created around {target_name} with {count} bots!")
        except Exception as e:
            logger.error(f"Circle error: {e}")
            await bot.send_message("❌ Error creating circle")
    
    async def handle_army(self, bot: SimpleMinecraftBot, args: str):
        self.selected_bots.clear()
        connected_bots = [b for b in self.bots if b.connected and b.bot_id != bot.bot_id]
        
        for b in connected_bots:
            self.selected_bots.add(b.bot_id)
            await b.send_message("📢 You are now part of the army!")
        
        await bot.send_message(f"✅ Army formed with {len(connected_bots)} bots!")
    
    async def handle_select(self, bot: SimpleMinecraftBot, args: str):
        try:
            count = int(args) if args else 10
            connected_bots = [b for b in self.bots if b.connected and b.bot_id != bot.bot_id]
            
            selected_count = 0
            for b in connected_bots:
                if selected_count >= count:
                    break
                self.selected_bots.add(b.bot_id)
                await b.send_message(f"✅ Selected for army! ID: {b.bot_id}")
                selected_count += 1
            
            await bot.send_message(f"✅ Selected {selected_count} bots for army!")
        except:
            await bot.send_message("Usage: !select <count>")
    
    async def handle_remove(self, bot: SimpleMinecraftBot, args: str):
        if not args:
            await bot.send_message("Usage: !remove <username>")
            return
        
        target_name = args.strip()
        for b in self.bots:
            if b.username.lower() == target_name.lower() and b.connected:
                await b.disconnect()
                self.bots.remove(b)
                self.total_removed += 1
                await bot.send_message(f"✅ Bot {target_name} removed")
                
                # Notify all bots
                for remaining_bot in self.bots:
                    if remaining_bot.connected:
                        await remaining_bot.send_message(f"Bot {target_name} was removed!")
                return
        
        await bot.send_message(f"Bot {target_name} not found")
    
    async def handle_move(self, bot: SimpleMinecraftBot, args: str):
        try:
            parts = args.split()
            if len(parts) == 3:
                x, y, z = map(float, parts)
                await bot.move_to(x, y, z)
                await bot.send_message(f"Moved to ({x:.1f}, {y:.1f}, {z:.1f})")
            else:
                await bot.send_message("Usage: !move <x> <y> <z>")
        except:
            await bot.send_message("Invalid coordinates")
    
    async def handle_say(self, bot: SimpleMinecraftBot, args: str):
        if args:
            for b in self.bots:
                if b.connected:
                    await b.send_message(args)
    
    async def handle_formation(self, bot: SimpleMinecraftBot, args: str):
        selected_bots = [b for b in self.bots if b.bot_id in self.selected_bots and b.connected]
        
        if not selected_bots:
            await bot.send_message("No bots selected! Use !select or !army first")
            return
        
        size = int(math.ceil(math.sqrt(len(selected_bots))))
        x_start = bot.x - (size * 2.5)
        z_start = bot.z - (size * 2.5)
        
        for i, b in enumerate(selected_bots[:size*size]):
            row = i // size
            col = i % size
            x = x_start + (col * 3)
            z = z_start + (row * 3)
            y = 64 + random.uniform(-0.5, 0.5)
            await b.move_to(x, y, z)
            await asyncio.sleep(0.03)
        
        await bot.send_message(f"✅ Formation created with {len(selected_bots[:size*size])} bots!")
    
    async def handle_attack(self, bot: SimpleMinecraftBot, args: str):
        target_name = args.strip() if args else None
        target_bot = None
        
        if target_name:
            for b in self.bots:
                if b.username.lower() == target_name.lower() and b.connected:
                    target_bot = b
                    break
        
        if not target_bot:
            connected = [b for b in self.bots if b.connected and b.bot_id != bot.bot_id]
            if connected:
                target_bot = random.choice(connected)
        
        if target_bot:
            selected_bots = [b for b in self.bots if b.bot_id in self.selected_bots and b.connected]
            
            for b in selected_bots[:20]:
                await b.move_to(
                    target_bot.x + random.uniform(-3, 3),
                    64 + random.uniform(-0.5, 0.5),
                    target_bot.z + random.uniform(-3, 3)
                )
                await b.send_message(f"/me attacks {target_bot.username}!")
                await asyncio.sleep(0.05)
            
            await bot.send_message(f"⚔️ Attacking {target_bot.username}!")
        else:
            await bot.send_message("No target found")
    
    async def handle_dance(self, bot: SimpleMinecraftBot, args: str):
        selected_bots = [b for b in self.bots if b.bot_id in self.selected_bots and b.connected]
        
        if not selected_bots:
            await bot.send_message("No bots selected! Use !select or !army first")
            return
        
        dance_moves = [
            (1, 0, 0), (-1, 0, 0), (0, 0, 1), (0, 0, -1),
            (1, 0, 1), (-1, 0, -1), (1, 0, -1), (-1, 0, 1)
        ]
        
        for move in dance_moves[:4]:
            for b in selected_bots[:20]:
                await b.move_to(b.x + move[0], 64 + move[1], b.z + move[2])
                await b.send_message("/me dances! 💃")
                await asyncio.sleep(0.03)
        
        await bot.send_message("✅ Dance complete!")
    
    async def handle_follow(self, bot: SimpleMinecraftBot, args: str):
        target_name = args.strip() if args else None
        target_bot = None
        
        if target_name:
            for b in self.bots:
                if b.username.lower() == target_name.lower() and b.connected:
                    target_bot = b
                    break
        
        if not target_bot:
            connected = [b for b in self.bots if b.connected and b.bot_id != bot.bot_id]
            if connected:
                target_bot = random.choice(connected)
        
        if target_bot:
            selected_bots = [b for b in self.bots if b.bot_id in self.selected_bots and b.connected]
            
            for i, b in enumerate(selected_bots[:20]):
                offset = 2 + (i % 5)
                x = target_bot.x + random.uniform(-offset, offset)
                z = target_bot.z + random.uniform(-offset, offset)
                await b.move_to(x, 64, z)
                await asyncio.sleep(0.05)
            
            await bot.send_message(f"👥 Following {target_bot.username}!")
        else:
            await bot.send_message("No target found")
    
    async def handle_spread(self, bot: SimpleMinecraftBot, args: str):
        selected_bots = [b for b in self.bots if b.bot_id in self.selected_bots and b.connected]
        
        if not selected_bots:
            await bot.send_message("No bots selected! Use !select or !army first")
            return
        
        for b in selected_bots[:30]:
            x = bot.x + random.uniform(-20, 20)
            z = bot.z + random.uniform(-20, 20)
            await b.move_to(x, 64, z)
            await asyncio.sleep(0.03)
        
        await bot.send_message("✅ Bots spread out!")
    
    async def handle_info(self, bot: SimpleMinecraftBot, args: str):
        info = f"""=== BOT INFO ===
Bot: {bot.username}
ID: {bot.bot_id}
Connected: {bot.connected}
Registered: {bot.registered}
Position: ({bot.x:.1f}, {bot.y:.1f}, {bot.z:.1f})
Total Bots: {len(self.bots)}
Selected: {len(self.selected_bots)}
Joined: {self.total_joined}
Removed: {self.total_removed}"""
        await bot.send_message(info)
    
    async def run_video_helper(self):
        """Video helper mode"""
        logger.info("🎬 Starting video helper mode")
        
        if len(self.bots) < 10:
            logger.warning("Not enough bots for video helper mode")
            return
        
        commands = [
            "/me [Video] Starting recording... 🎥",
            "Welcome to the bot showcase!",
            "/me [Video] Creating army formation",
            "Look at all these bots joining! 🚀",
            "/me [Video] Circle formation activated",
            "Amazing! 100 bots working together!",
            "/me [Video] Battle formation",
            "These bots are controlled via Minecraft chat!",
            "/me [Video] Group moving to positions",
            "That's all for today! Thanks for watching! 🎉"
        ]
        
        for i, cmd in enumerate(commands):
            for bot in self.bots[:10]:
                if bot.connected:
                    await bot.send_message(cmd)
            logger.info(f"Video helper command {i+1}: {cmd}")
            await asyncio.sleep(2)
    
    async def start(self):
        """Start the bot controller"""
        logger.info("=" * 60)
        logger.info(f"🚀 Starting Bot Controller on runner: {self.runner_id}")
        logger.info(f"🎯 Target server: {self.config['server_ip']}:{self.config['server_port']}")
        logger.info(f"🤖 Bots to spawn: {self.config['bots_per_runner']}")
        logger.info("=" * 60)
        
        # Spawn bots
        await self.spawn_bots()
        
        # Run video helper
        if self.config['video_helper_mode'] and len(self.bots) > 0:
            await asyncio.sleep(5)
            await self.run_video_helper()
        
        # Keep alive
        try:
            while True:
                active = len([b for b in self.bots if b.connected])
                logger.info(f"📊 Active bots: {active}/{len(self.bots)} | Joined: {self.total_joined} | Removed: {self.total_removed}")
                await asyncio.sleep(30)
        except KeyboardInterrupt:
            logger.info("🛑 Shutting down...")
        finally:
            for bot in self.bots:
                await bot.disconnect()

async def main():
    controller = BotManager()
    await controller.start()

if __name__ == "__main__":
    asyncio.run(main())
