#!/bin/bash

echo "🚀 Setting up Minecraft Bot System..."

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install dependencies
npm install mineflayer

# Create config
cat > config.json << 'EOF'
{
    "server_ip": "node.harshteotia.in",
    "server_port": 25565,
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
