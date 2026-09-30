const mineflayer = require('mineflayer');
const express = require('express');

// Initialize a simple express server to satisfy Railway's port binding requirements
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Aternos Uptime Hosting Bot is actively running.');
});

app.listen(PORT, () => {
    console.log(`[Railway Network] Web listener successfully active on port ${PORT}`);
});

// Bot setup credentials configuration 
const botOptions = {
    host: process.env.BOT_HOST || 'your-server-ip.aternos.me', // Set this in your Railway Variables
    port: parseInt(process.env.BOT_PORT) || 25565,
    username: process.env.BOT_USERNAME || 'AternosUptimeBot',
    version: false // Autodetect server target version
};

let bot;
let restartIntervalId = null;

function createMinecraftBot() {
    console.log(`[Bot Action] Initializing connection to ${botOptions.host}:${botOptions.port}...`);
    bot = mineflayer.createBot(botOptions);

    // Event handler: Triggered once the client successfully registers and spawns inside the world
    bot.once('spawn', () => {
        console.log("[Bot Success] Logged in and spawned safely inside the server.");
        
        // Start random anti-kick movement checks every 15 seconds
        startAntiIdleMovement();

        // 90 minutes expressed in milliseconds (90 minutes * 60 seconds * 1000 ms)
        const RESTART_TIMER_MS = 5400000; 

        // Clear any orphaned interval timers if this function is re-running due to a crash recovery
        if (restartIntervalId) clearInterval(restartIntervalId);

        // Define the rolling 1 hour and 30 minute restart sequence
        restartIntervalId = setInterval(() => {
            console.log("[Automation Task] Beginning the 90-minute server restart sequence.");
            
            // 1. Broadcast clear warnings to players currently playing in the world
            bot.chat("/say Warning: Automated server restart in 60 seconds!");
            
            // 2. Queue the absolute kick string action via DeftAutoRestart exactly 60 seconds later
            setTimeout(() => {
                console.log("[Automation Task] Deploying execution command: /dar restart 0");
                bot.chat("/dar restart 0"); 
            }, 60000);

        }, RESTART_TIMER_MS);
    });

    // Event handler: Fired when the server shuts down or kicks the client
    bot.on('end', (reason) => {
        console.warn(`[Connection Alert] Bot disconnected from server. Reason: ${reason}`);
        if (restartIntervalId) {
            clearInterval(restartIntervalId);
            restartIntervalId = null;
        }
        
        // Wait 30 seconds before attempting a new handshake loop to allow the Aternos box time to boot up
        console.log("[Recovery] Attempting socket reconnection wrapper loop in 30 seconds...");
        setTimeout(createMinecraftBot, 30000);
    });

    // Event handler: Prevents node error bubbling from stopping the continuous wrapper execution thread
    bot.on('error', (err) => {
        console.error(`[Runtime Exception] Mineflayer error encountered: ${err.message}`);
    });
}

// Function to keep the bot moving randomly so Aternos doesn't flag it as AFK
function startAntiIdleMovement() {
    setInterval(() => {
        if (!bot || !bot.entity) return;
        
        // Toggle look angles or jump motions randomly
        const jumpChance = Math.random() > 0.5;
        if (jumpChance) {
            bot.setControlState('jump', true);
            setTimeout(() => {
                if (bot) bot.setControlState('jump', false);
            }, 500);
        } else {
            bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * Math.PI);
            bot.swingArm('right');
        }
    }, 15000);
}

// Kick off the initialization sequence
createMinecraftBot();
