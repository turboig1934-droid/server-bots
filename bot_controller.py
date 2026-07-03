#!/usr/bin/env python3
import asyncio
import json
import logging
import random
import time
import hashlib
import socket
import struct
import re
import math
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple
import aiohttp
import os
import sys
import uuid

# Install: pip install minecraft-protocol aiohttp requests

from minecraft import authentication
from minecraft.networking.connection import Connection
from minecraft.networking.packets import Packet
from minecraft.networking.packets.clientbound.play import (
    PlayerInfoPacket,
    ChatMessagePacket,
    JoinGamePacket,
    SpawnPlayerPacket,
    EntityMetadataPacket,
    DestroyEntitiesPacket,
    EntityPositionPacket,
    EntityRotationPacket,
    EntityPositionRotationPacket,
    PlayerAbilitiesPacket
)
from minecraft.networking.packets.serverbound.play import (
    ChatPacket,
    PlayerPositionPacket,
    PlayerRotationPacket,
    PlayerPositionRotationPacket,
    KeepAlivePacket,
    ClientSettingsPacket
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot_controller.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MinecraftBot:
    """Individual Minecraft bot instance with registration support"""
    
    def __init__(self, bot_id: int, server_ip: str, server_port: int, 
                 username: str, runner_id: str, command_callback=None,
                 server_version: str = "1.16.5"):
        self.bot_id = bot_id
        self.server_ip = server_ip
        self.server_port = server_port
        self.username = username
        self.runner_id = runner_id
        self.connection = None
        self.connected = False
        self.authenticated = False
        self.registered = False
        self.online_players: Set[str] = set()
        self.command_callback = command_callback
        self.last_ping = time.time()
        self.running = True
        self.server_version = server_version
        self.x = random.uniform(-50, 50)
        self.y = 64
        self.z = random.uniform(-50, 50)
        self.yaw = random.uniform(0, 360)
        self.pitch = 0
        self.on_ground = True
        self.entity_id = None
        self.hitbox_active = False
        self.messages_queue = []
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 3
        
    async def check_player_exists(self) -> Tuple[bool, List[str]]:
        """Check if username already exists and get online players list"""
        try:
            players = await self.get_server_player_list()
            return self.username in players, players
        except Exception as e:
            logger.warning(f"Could not check player list: {e}")
            return False, []
    
    async def get_server_player_list(self) -> List[str]:
        """Get current player list from server using Server List Ping"""
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(self.server_ip, self.server_port),
                timeout=5.0
            )
            
            # Send handshake
            handshake = self._create_handshake_packet()
            writer.write(handshake)
            await writer.drain()
            
            # Send status request
            status_request = bytes([0x00])
            writer.write(status_request)
            await writer.drain()
            
            # Read response
            response = await asyncio.wait_for(reader.read(4096), timeout=5.0)
            writer.close()
            await writer.wait_closed()
            
            # Parse response
            if len(response) > 5:
                data = response[1:]
                json_data = self._parse_minecraft_string(data)
                if json_data:
                    import json
                    status = json.loads(json_data)
                    if 'players' in status and 'sample' in status['players']:
                        return [p['name'] for p in status['players']['sample']]
            return []
        except Exception as e:
            logger.error(f"Error getting player list: {e}")
            return []
    
    def _create_handshake_packet(self) -> bytes:
        """Create handshake packet for server list ping"""
        protocol_version = 754  # 1.16.5
        packet_id = 0x00
        
        protocol_bytes = self._varint_to_bytes(protocol_version)
        address_bytes = self._string_to_bytes(self.server_ip)
        port_bytes = struct.pack('>H', self.server_port)
        next_state_bytes = self._varint_to_bytes(1)
        
        packet_data = protocol_bytes + address_bytes + port_bytes + next_state_bytes
        packet_length = self._varint_to_bytes(len(packet_data) + 1)
        
        return packet_length + bytes([packet_id]) + packet_data
    
    def _varint_to_bytes(self, value: int) -> bytes:
        """Convert integer to VarInt bytes"""
        result = []
        while True:
            byte = value & 0x7F
            value >>= 7
            if value != 0:
                byte |= 0x80
            result.append(byte)
            if value == 0:
                break
        return bytes(result)
    
    def _string_to_bytes(self, value: str) -> bytes:
        """Convert string to Minecraft formatted bytes"""
        encoded = value.encode('utf-8')
        return self._varint_to_bytes(len(encoded)) + encoded
    
    def _parse_minecraft_string(self, data: bytes) -> str:
        """Parse a Minecraft string from bytes"""
        try:
            length, pos = self._read_varint(data, 0)
            return data[pos:pos+length].decode('utf-8')
        except:
            return ""
    
    def _read_varint(self, data: bytes, offset: int) -> Tuple[int, int]:
        """Read VarInt from bytes"""
        result = 0
        shift = 0
        pos = offset
        while True:
            if pos >= len(data):
                return 0, pos
            byte = data[pos]
            pos += 1
            result |= (byte & 0x7F) << shift
            if (byte & 0x80) == 0:
                break
            shift += 7
        return result, pos
    
    async def register_on_server(self, password: str = None):
        """Register bot on server if needed"""
        if self.registered:
            return True
            
        try:
            if not password:
                password = self._generate_strong_password()
            
            register_commands = [
                f"/register {password} {password}",
                f"/reg {password} {password}",
                f"/register {password}",
                f"/login {password}",
                f"/l {password}",
                f"/register {password} {password} {password}"
            ]
            
            for cmd in register_commands:
                await self.send_command(cmd)
                await asyncio.sleep(0.5)
                
                if self.registered:
                    break
            
            logger.info(f"Bot {self.username} registration attempt completed")
            return True
        except Exception as e:
            logger.error(f"Bot {self.username} registration failed: {e}")
            return False
    
    def _generate_strong_password(self) -> str:
        """Generate a strong random password"""
        chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        return ''.join(random.choice(chars) for _ in range(16))
    
    async def join_server(self):
        """Join the Minecraft server with duplicate checking"""
        try:
            exists, online_players = await self.check_player_exists()
            
            if exists:
                logger.warning(f"Username {self.username} already exists, skipping")
                return False
            
            self.online_players = set(online_players)
            
            self.connection = Connection(
                self.server_ip,
                self.server_port,
                username=self.username,
                auth_token=None
            )
            
            # Set up event handlers
            self.connection.register_packet_listener(
                self.handle_join_game, 
                JoinGamePacket
            )
            self.connection.register_packet_listener(
                self.handle_chat, 
                ChatMessagePacket
            )
            self.connection.register_packet_listener(
                self.handle_player_info,
                PlayerInfoPacket
            )
            self.connection.register_packet_listener(
                self.handle_entity_spawn,
                SpawnPlayerPacket
            )
            self.connection.register_packet_listener(
                self.handle_entity_metadata,
                EntityMetadataPacket
            )
            self.connection.register_packet_listener(
                self.handle_abilities,
                PlayerAbilitiesPacket
            )
            
            # Connect with timeout
            await asyncio.wait_for(
                self._connect_async(),
                timeout=30.0
            )
            
            self.connected = True
            self.authenticated = True
            
            # Auto-register
            await self.register_on_server()
            
            logger.info(f"Bot {self.username} joined server successfully")
            return True
            
        except asyncio.TimeoutError:
            logger.error(f"Bot {self.username} connection timeout")
            return False
        except Exception as e:
            logger.error(f"Bot {self.username} failed to join: {e}")
            return False
    
    async def _connect_async(self):
        """Async wrapper for connection"""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self.connection.connect)
    
    def handle_join_game(self, packet):
        """Handle join game packet"""
        self.authenticated = True
        self.entity_id = packet.entity_id
        logger.info(f"Bot {self.username} authenticated, entity ID: {self.entity_id}")
        self.activate_hitbox()
    
    def activate_hitbox(self):
        """Activate bot hitbox for movement"""
        self.hitbox_active = True
        if self.connection:
            try:
                # Send client settings to enable hitbox
                settings_packet = ClientSettingsPacket()
                settings_packet.locale = 'en_US'
                settings_packet.view_distance = 10
                settings_packet.chat_mode = 0
                settings_packet.chat_colors = True
                settings_packet.displayed_skin_parts = 0xFF
                settings_packet.main_hand = 0
                self.connection.write_packet(settings_packet)
            except Exception as e:
                logger.error(f"Error activating hitbox: {e}")
    
    def handle_chat(self, packet):
        """Handle chat messages from server"""
        if packet.json_data:
            try:
                import json
                chat_data = json.loads(packet.json_data)
                message = self._extract_chat_message(chat_data)
                
                if "registered" in message.lower():
                    self.registered = True
                    logger.info(f"Bot {self.username} registered successfully")
                
                if self.username in message and ("left" in message.lower() or "left the game" in message.lower()):
                    self.connected = False
                    logger.info(f"Bot {self.username} was removed from server")
                    # Send removal notification
                    if self.command_callback:
                        asyncio.create_task(self.command_callback(f"bot_removed_{self.username}", self))
                
                if message.startswith('!') and self.command_callback:
                    asyncio.create_task(self.command_callback(message, self))
                    
            except Exception as e:
                logger.debug(f"Error parsing chat: {e}")
    
    def _extract_chat_message(self, chat_data: dict) -> str:
        """Extract plain text from chat message"""
        if isinstance(chat_data, dict):
            if 'text' in chat_data:
                return chat_data['text']
            elif 'extra' in chat_data:
                return ''.join(self._extract_chat_message(part) for part in chat_data['extra'])
        elif isinstance(chat_data, str):
            return chat_data
        return ""
    
    def handle_player_info(self, packet):
        """Handle player info updates"""
        if hasattr(packet, 'players'):
            for player in packet.players:
                if hasattr(player, 'name'):
                    if packet.action == 0:  # Add player
                        self.online_players.add(player.name)
                    elif packet.action == 1:  # Update player
                        pass
                    elif packet.action == 2:  # Remove player
                        self.online_players.discard(player.name)
    
    def handle_entity_spawn(self, packet):
        """Handle entity spawn packet"""
        if packet.entity_id == self.entity_id:
            self.hitbox_active = True
    
    def handle_entity_metadata(self, packet):
        """Handle entity metadata for hitbox"""
        pass
    
    def handle_abilities(self, packet):
        """Handle player abilities packet"""
        if hasattr(packet, 'flying_speed'):
            # Bot is active and can move
            pass
    
    async def send_command(self, command: str):
        """Send a command to the server"""
        if self.connection and self.connected:
            try:
                packet = ChatPacket()
                packet.message = command
                self.connection.write_packet(packet)
                await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Failed to send command {command}: {e}")
    
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
        """Move bot to specific coordinates"""
        if not self.connection or not self.connected:
            return
            
        try:
            packet = PlayerPositionRotationPacket()
            packet.x = x
            packet.y = y
            packet.z = z
            packet.yaw = self.yaw
            packet.pitch = self.pitch
            packet.on_ground = True
            
            self.connection.write_packet(packet)
            self.x = x
            self.y = y
            self.z = z
            
            logger.debug(f"Bot {self.username} moved to ({x:.1f}, {y:.1f}, {z:.1f})")
        except Exception as e:
            logger.error(f"Error moving bot {self.username}: {e}")
    
    async def create_circle(self, center_x: float, center_y: float, center_z: float, 
                           radius: float, bot_count: int, index: int):
        """Create circle formation around a point"""
        if not self.connection or not self.connected:
            return
            
        try:
            angle = (2 * math.pi * index) / bot_count
            x = center_x + radius * math.cos(angle)
            z = center_z + radius * math.sin(angle)
            
            # Check ground level (simulated)
            ground_y = center_y + random.uniform(-0.5, 0.5)
            
            await self.move_to(x, ground_y, z)
            
            # Look at center
            await self.look_at(center_x, center_y, center_z)
            
            logger.info(f"Bot {self.username} placed in circle at ({x:.1f}, {ground_y:.1f}, {z:.1f})")
        except Exception as e:
            logger.error(f"Error placing bot {self.username} in circle: {e}")
    
    async def look_at(self, x: float, y: float, z: float):
        """Make bot look at a position"""
        if not self.connection or not self.connected:
            return
            
        try:
            dx = x - self.x
            dy = y - self.y
            dz = z - self.z
            
            horizontal_distance = math.sqrt(dx*dx + dz*dz)
            yaw = math.degrees(math.atan2(-dx, dz))
            pitch = math.degrees(math.atan2(-dy, horizontal_distance)) if horizontal_distance > 0 else 0
            
            packet = PlayerRotationPacket()
            packet.yaw = yaw
            packet.pitch = pitch
            packet.on_ground = True
            
            self.connection.write_packet(packet)
            self.yaw = yaw
            self.pitch = pitch
        except Exception as e:
            logger.error(f"Error looking at position: {e}")
    
    async def keep_alive(self):
        """Send keep alive packets"""
        while self.running and self.connected:
            await asyncio.sleep(25)
            try:
                if self.connection:
                    packet = KeepAlivePacket()
                    packet.keep_alive_id = int(time.time() * 1000)
                    self.connection.write_packet(packet)
            except Exception as e:
                logger.error(f"Keep alive error for {self.username}: {e}")
                self.connected = False
                break
    
    async def disconnect(self):
        """Disconnect from server"""
        self.running = False
        self.hitbox_active = False
        if self.connection:
            try:
                self.connection.disconnect()
            except:
                pass
        self.connected = False
        self.authenticated = False
        logger.info(f"Bot {self.username} disconnected")

class BotManager:
    """Main controller managing multiple bots"""
    
    def __init__(self, config_file: str = 'config.json'):
        self.config = self.load_config(config_file)
        self.bots: List[MinecraftBot] = []
        self.runner_id = os.environ.get('RUNNER_ID', f"{os.uname().nodename}_{os.getpid()}")
        self.command_handlers = {
            'ping': self.handle_ping,
            'help': self.handle_help,
            'status': self.handle_status,
            'circle': self.handle_circle,
            'army': self.handle_army,
            'select': self.handle_select,
            'remove': self.handle_remove,
            'kill': self.handle_kill,
            'move': self.handle_move,
            'say': self.handle_say,
            'positions': self.handle_positions,
            'formation': self.handle_formation,
            'attack': self.handle_attack,
            'dance': self.handle_dance,
            'follow': self.handle_follow,
            'spread': self.handle_spread,
            'info': self.handle_info,
            'clear': self.handle_clear
        }
        self.selected_bots: Set[int] = set()
        self.bot_names = self.load_random_names()
        self.used_names = set()
        self.total_joined = 0
        self.total_removed = 0
        
    def load_config(self, config_file: str) -> Dict:
        """Load configuration from file"""
        default_config = {
            'server_ip': 'node.harshteotia.in',
            'server_port': 25566,
            'username_prefix': 'Bot',
            'bots_per_runner': 100,
            'bot_spawn_delay': 0.2,
            'enable_auto_reconnect': True,
            'video_helper_mode': True,
            'command_prefix': '!',
            'max_bots': 100,
            'registration_password': None,
            'server_version': '1.16.5'
        }
        
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
                default_config.update(config)
        except FileNotFoundError:
            logger.warning(f"Config file {config_file} not found, using defaults")
            # Create default config file
            with open(config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
        
        return default_config
    
    def load_random_names(self) -> List[str]:
        """Load random names for bots"""
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
        
        # Add more names
        for i in range(100):
            names.append(f"Player{i}")
            names.append(f"Hero{i}")
            names.append(f"Ace{i}")
            names.append(f"Pro{i}")
            names.append(f"Star{i}")
            
        return names
    
    def get_unique_name(self) -> str:
        """Get a unique random name for bot"""
        available_names = [name for name in self.bot_names if name not in self.used_names]
        if not available_names:
            i = len(self.used_names)
            available_names = [f"Bot_{i}_{random.randint(100,999)}"]
        
        name = random.choice(available_names)
        self.used_names.add(name)
        return name
    
    async def check_existing_players(self) -> Set[str]:
        """Check which players are currently online"""
        try:
            test_bot = MinecraftBot(
                bot_id=-1,
                server_ip=self.config['server_ip'],
                server_port=self.config['server_port'],
                username=f"Checker_{random.randint(1000,9999)}",
                runner_id=self.runner_id
            )
            players = await test_bot.get_server_player_list()
            return set(players)
        except Exception as e:
            logger.error(f"Error checking existing players: {e}")
            return set()
    
    async def spawn_bots(self):
        """Spawn all bots with duplicate name checking and fast skipping"""
        existing_players = await self.check_existing_players()
        logger.info(f"Existing players on server: {len(existing_players)}")
        
        max_bots = min(self.config['bots_per_runner'], self.config['max_bots'])
        spawned = 0
        
        for i in range(max_bots * 2):  # Try up to 2x for duplicates
            if spawned >= max_bots:
                break
                
            username = self.get_unique_name()
            
            # Fast duplicate check
            if username in existing_players:
                logger.warning(f"Username {username} already exists, skipping")
                continue
            
            bot = MinecraftBot(
                bot_id=spawned,
                server_ip=self.config['server_ip'],
                server_port=self.config['server_port'],
                username=username,
                runner_id=self.runner_id,
                command_callback=self.handle_bot_command,
                server_version=self.config['server_version']
            )
            
            # Attempt to join with fast skip on failure
            success = await bot.join_server()
            if success:
                self.bots.append(bot)
                self.total_joined += 1
                asyncio.create_task(bot.keep_alive())
                logger.info(f"Bot {bot.username} ({spawned+1}/{max_bots}) joined - Total: {self.total_joined}")
                
                if self.config['video_helper_mode']:
                    await bot.send_message(f"/me Video Helper: Bot {bot.username} ready!")
                
                spawned += 1
                await asyncio.sleep(self.config['bot_spawn_delay'])
            else:
                self.used_names.discard(username)
                logger.warning(f"Failed to spawn bot {i+1}, trying next...")
        
        logger.info(f"Successfully spawned {spawned} bots out of {max_bots} attempts")
    
    async def handle_bot_command(self, message: str, bot: MinecraftBot):
        """Handle commands sent to bots via Minecraft chat"""
        if message.startswith("bot_removed_"):
            removed_name = message.replace("bot_removed_", "")
            self.total_removed += 1
            logger.info(f"Bot {removed_name} removed from server - Total removed: {self.total_removed}")
            # Send notification to all bots
            for b in self.bots:
                if b.connected and b.username != removed_name:
                    await b.send_message(f"Bot {removed_name} was removed from server!")
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
    
    async def handle_ping(self, bot: MinecraftBot, args: str):
        """Ping command handler"""
        await bot.send_message(f"Pong! Bot {bot.username} is alive")
    
    async def handle_help(self, bot: MinecraftBot, args: str):
        """Help command handler"""
        help_msg = """=== BOT COMMANDS ===
!ping - Check bot status
!help - Show this help
!status - Show bot status
!circle <player> - Create circle around player
!army - Select all bots for army
!select <count> - Select bots for army
!remove <username> - Remove specific bot
!kill <username> - Remove bot
!move <x> <y> <z> - Move bot
!say <message> - Broadcast message
!positions - Show bot positions
!formation - Form battle formation
!attack - Attack command
!dance - Make bots dance
!follow <player> - Follow player
!spread - Spread out bots
!info - Show bot info
!clear - Clear selected bots"""
        await bot.send_message(help_msg)
    
    async def handle_status(self, bot: MinecraftBot, args: str):
        """Status command handler"""
        active = len([b for b in self.bots if b.connected])
        selected = len(self.selected_bots)
        status = f"Total: {len(self.bots)} | Active: {active} | Selected: {selected} | Joined: {self.total_joined} | Removed: {self.total_removed}"
        await bot.send_message(status)
    
    async def handle_circle(self, bot: MinecraftBot, args: str):
        """Circle command handler"""
        try:
            parts = args.split()
            if not parts:
                await bot.send_message("Usage: !circle <player_name>")
                return
                
            target_name = parts[0]
            radius = float(parts[1]) if len(parts) > 1 else 10
            bot_count = int(parts[2]) if len(parts) > 2 else 50
            
            # Find target bot
            target_found = False
            target_x, target_y, target_z = 0, 64, 0
            
            for b in self.bots:
                if b.username.lower() == target_name.lower() and b.connected:
                    target_x, target_y, target_z = b.x, b.y, b.z
                    target_found = True
                    break
            
            if not target_found:
                await bot.send_message(f"Player {target_name} not found")
                return
            
            # Get connected bots excluding command sender
            connected_bots = [b for b in self.bots if b.connected and b.bot_id != bot.bot_id]
            count = min(len(connected_bots), bot_count)
            
            if count < 1:
                await bot.send_message("Not enough bots for circle")
                return
            
            # Create circle
            for i, cb in enumerate(connected_bots[:count]):
                await cb.create_circle(target_x, target_y, target_z, radius, count, i)
                await asyncio.sleep(0.05)
            
            await bot.send_message(f"Circle created around {target_name} with {count} bots!")
        except Exception as e:
            logger.error(f"Circle command error: {e}")
            await bot.send_message("Error creating circle")
    
    async def handle_army(self, bot: MinecraftBot, args: str):
        """Army command - select all bots"""
        try:
            self.selected_bots.clear()
            connected_bots = [b for b in self.bots if b.connected and b.bot_id != bot.bot_id]
            
            for b in connected_bots:
                self.selected_bots.add(b.bot_id)
                await b.send_message("You are now part of the army!")
            
            await bot.send_message(f"Army formed with {len(connected_bots)} bots!")
        except Exception as e:
            logger.error(f"Army command error: {e}")
    
    async def handle_select(self, bot: MinecraftBot, args: str):
        """Select command - select specific number of bots"""
        try:
            count = int(args) if args else 10
            connected_bots = [b for b in self.bots if b.connected and b.bot_id != bot.bot_id]
            
            selected_count = 0
            for b in connected_bots:
                if selected_count >= count:
                    break
                self.selected_bots.add(b.bot_id)
                await b.send_message(f"Selected for army! ID: {b.bot_id}")
                selected_count += 1
            
            await bot.send_message(f"Selected {selected_count} bots for army!")
        except Exception as e:
            await bot.send_message(f"Usage: !select <count>")
    
    async def handle_remove(self, bot: MinecraftBot, args: str):
        """Remove command - remove a bot"""
        try:
            if not args:
                await bot.send_message("Usage: !remove <username>")
                return
            
            target_name = args.strip()
            for b in self.bots:
                if b.username.lower() == target_name.lower() and b.connected:
                    await b.disconnect()
                    self.bots.remove(b)
                    self.total_removed += 1
                    await bot.send_message(f"Bot {target_name} removed")
                    
                    # Notify all bots
                    for remaining_bot in self.bots:
                        if remaining_bot.connected:
                            await remaining_bot.send_message(f"Bot {target_name} was removed!")
                    return
            
            await bot.send_message(f"Bot {target_name} not found")
        except Exception as e:
            logger.error(f"Remove command error: {e}")
    
    async def handle_kill(self, bot: MinecraftBot, args: str):
        """Kill command - alias for remove"""
        await self.handle_remove(bot, args)
    
    async def handle_move(self, bot: MinecraftBot, args: str):
        """Move command"""
        try:
            parts = args.split()
            if len(parts) == 3:
                x, y, z = map(float, parts)
                await bot.move_to(x, y, z)
                await bot.send_message(f"Moved to ({x:.1f}, {y:.1f}, {z:.1f})")
            else:
                await bot.send_message("Usage: !move <x> <y> <z>")
        except Exception as e:
            await bot.send_message("Invalid coordinates")
    
    async def handle_say(self, bot: MinecraftBot, args: str):
        """Say command - broadcast message"""
        if args:
            for b in self.bots:
                if b.connected:
                    await b.send_message(args)
    
    async def handle_positions(self, bot: MinecraftBot, args: str):
        """Positions command - show bot positions"""
        try:
            positions = []
            for b in self.bots[:20]:
                if b.connected:
                    positions.append(f"{b.username}: ({b.x:.1f}, {b.y:.1f}, {b.z:.1f})")
            
            if positions:
                await bot.send_message("Bot positions: " + " | ".join(positions[:5]))
            else:
                await bot.send_message("No bots with positions available")
        except Exception as e:
            logger.error(f"Positions command error: {e}")
    
    async def handle_formation(self, bot: MinecraftBot, args: str):
        """Formation command - create battle formation"""
        try:
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
            
            await bot.send_message(f"Formation created with {len(selected_bots[:size*size])} bots!")
        except Exception as e:
            logger.error(f"Formation command error: {e}")
    
    async def handle_attack(self, bot: MinecraftBot, args: str):
        """Attack command - simulate attack"""
        try:
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
                
                await bot.send_message(f"Attacking {target_bot.username}!")
            else:
                await bot.send_message("No target found")
        except Exception as e:
            logger.error(f"Attack command error: {e}")
    
    async def handle_dance(self, bot: MinecraftBot, args: str):
        """Dance command - make bots dance"""
        try:
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
                    await b.send_message("/me dances!")
                    await asyncio.sleep(0.03)
            
            await bot.send_message("Dance complete!")
        except Exception as e:
            logger.error(f"Dance command error: {e}")
    
    async def handle_follow(self, bot: MinecraftBot, args: str):
        """Follow command - bots follow a player"""
        try:
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
                
                await bot.send_message(f"Following {target_bot.username}!")
            else:
                await bot.send_message("No target found")
        except Exception as e:
            logger.error(f"Follow command error: {e}")
    
    async def handle_spread(self, bot: MinecraftBot, args: str):
        """Spread command - spread out bots"""
        try:
            selected_bots = [b for b in self.bots if b.bot_id in self.selected_bots and b.connected]
            
            if not selected_bots:
                await bot.send_message("No bots selected! Use !select or !army first")
                return
            
            for b in selected_bots[:30]:
                x = bot.x + random.uniform(-20, 20)
                z = bot.z + random.uniform(-20, 20)
                await b.move_to(x, 64, z)
                await asyncio.sleep(0.03)
            
            await bot.send_message("Bots spread out!")
        except Exception as e:
            logger.error(f"Spread command error: {e}")
    
    async def handle_info(self, bot: MinecraftBot, args: str):
        """Info command - show bot info"""
        try:
            info = f"""=== BOT INFO ===
Bot: {bot.username}
ID: {bot.bot_id}
Connected: {bot.connected}
Registered: {bot.registered}
Hitbox: {bot.hitbox_active}
Position: ({bot.x:.1f}, {bot.y:.1f}, {bot.z:.1f})
Total Bots: {len(self.bots)}
Selected: {len(self.selected_bots)}
Joined: {self.total_joined}
Removed: {self.total_removed}"""
            await bot.send_message(info)
        except Exception as e:
            logger.error(f"Info command error: {e}")
    
    async def handle_clear(self, bot: MinecraftBot, args: str):
        """Clear command - clear selected bots"""
        self.selected_bots.clear()
        await bot.send_message("Selected bots cleared!")
    
    async def run_video_helper(self):
        """Video helper mode - coordinates bots for video creation"""
        logger.info("Starting video helper mode")
        
        if len(self.bots) < 10:
            logger.warning("Not enough bots for video helper mode")
            return
        
        commands = [
            "/me [Video] Starting recording...",
            "Welcome to the bot showcase!",
            "/me [Video] Creating army formation",
            "Look at all these bots joining!",
            "/me [Video] Circle formation activated",
            "Amazing! 100 bots working together!",
            "/me [Video] Battle formation",
            "These bots are controlled via Minecraft chat!",
            "/me [Video] Group moving to positions",
            "That's all for today! Thanks for watching!"
        ]
        
        for i, cmd in enumerate(commands):
            # Send to first 10 bots
            for bot in self.bots[:10]:
                if bot.connected:
                    await bot.send_message(cmd)
            
            logger.info(f"Video helper command {i+1}: {cmd}")
            await asyncio.sleep(2)
    
    async def start(self):
        """Start the bot controller"""
        logger.info(f"Starting Bot Controller on runner: {self.runner_id}")
        logger.info(f"Target server: {self.config['server_ip']}:{self.config['server_port']}")
        logger.info(f"Bots to spawn: {self.config['bots_per_runner']}")
        
        # Spawn bots
        await self.spawn_bots()
        
        # If in video helper mode, run video script
        if self.config['video_helper_mode'] and len(self.bots) > 0:
            await asyncio.sleep(5)
            await self.run_video_helper()
        
        # Keep running
        try:
            while True:
                active_bots = [b for b in self.bots if b.connected]
                logger.info(f"Active bots: {len(active_bots)}/{len(self.bots)} | Total joined: {self.total_joined} | Removed: {self.total_removed}")
                
                # Auto-reconnect if needed
                if self.config['enable_auto_reconnect']:
                    for bot in self.bots:
                        if not bot.connected and bot.reconnect_attempts < bot.max_reconnect_attempts:
                            logger.info(f"Reconnecting {bot.username} (attempt {bot.reconnect_attempts+1})")
                            success = await bot.join_server()
                            if success:
                                bot.reconnect_attempts = 0
                            else:
                                bot.reconnect_attempts += 1
                
                await asyncio.sleep(30)
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        finally:
            for bot in self.bots:
                await bot.disconnect()

async def main():
    """Main entry point"""
    controller = BotManager()
    await controller.start()

if __name__ == "__main__":
    asyncio.run(main())
