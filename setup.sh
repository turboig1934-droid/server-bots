#!/bin/bash

echo "🚀 Starting Minecraft Bot System..."
echo "🎯 Server: node.harshteotia.in:25566"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install mineflayer
fi

# Check if config exists
if [ ! -f "config.json" ]; then
    echo "📝 Creating config..."
    cat > config.json << 'EOF'
{
    "server_ip": "node.harshteotia.in",
    "server_port": 25566,
    "username_prefix": "Bot",
    "bots_per_runner": 20,
    "bot_spawn_delay": 500,
    "enable_auto_reconnect": true,
    "video_helper_mode": true,
    "command_prefix": "!",
    "max_bots": 20,
    "server_version": "1.16.5"
}
EOF
fi

# Check if bot.js exists
if [ ! -f "bot.js" ]; then
    echo "❌ bot.js not found! Run setup.sh first"
    exit 1
fi

echo "✅ Starting bot..."
node bot.js
