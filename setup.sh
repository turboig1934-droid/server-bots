#!/bin/bash

echo "🚀 Setting up Minecraft Bot System..."

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create package.json
cat > package.json << 'EOF'
{
  "name": "minecraft-bot-system",
  "version": "1.0.0",
  "dependencies": {
    "mineflayer": "^4.19.0",
    "minecraft-protocol": "^1.45.0"
  }
}
EOF

# Install dependencies
npm install

# Create config
cat > config.json << 'EOF'
{
  "server_ip": "node.harshteotia.in",
  "server_port": 25566,
  "username_prefix": "Bot",
  "bots_per_runner": 100,
  "bot_spawn_delay": 200,
  "enable_auto_reconnect": true,
  "video_helper_mode": true,
  "command_prefix": "!",
  "max_bots": 100,
  "server_version": "1.16.5"
}
EOF

echo "✅ Setup complete!"
echo "Run: node bot.js"
