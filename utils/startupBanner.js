const { cyan, magenta, white, green, yellow } = require('chalk');

function displayStartupBanner() {
    console.clear();
    console.log(cyan('╔══════════════════════════════════════════════════════════════╗'));
    console.log(cyan('║') + magenta('                         🌟 AURORA BOT 🌟                        ') + cyan('║'));
    console.log(cyan('║') + white('                     Discord Content Distribution Bot              ') + cyan('║'));
    console.log(cyan('╠══════════════════════════════════════════════════════════════╣'));
    console.log(cyan('║') + green(' 🚀 Starting up...                                               ') + cyan('║'));
    console.log(cyan('║') + green(' 📡 Initializing systems...                                      ') + cyan('║'));
    console.log(cyan('║') + green(' 🔗 Connecting to services...                                    ') + cyan('║'));
    console.log(cyan('╚══════════════════════════════════════════════════════════════╝'));
    console.log();
}

function displayReadyBanner(client) {
    console.log();
    console.log(green('╔══════════════════════════════════════════════════════════════╗'));
    console.log(green('║') + cyan('                         ✨ BOT READY! ✨                         ') + green('║'));
    console.log(green('╠══════════════════════════════════════════════════════════════╣'));
    console.log(green('║') + white(` 👤 Bot: ${client.user.tag}`.padEnd(61)) + green('║'));
    console.log(green('║') + white(` 🆔 ID: ${client.user.id}`.padEnd(61)) + green('║'));
    console.log(green('║') + white(` 🏠 Guilds: ${client.guilds.cache.size}`.padEnd(61)) + green('║'));
    console.log(green('║') + white(` 🌐 Ping: ${client.ws.ping}ms`.padEnd(61)) + green('║'));
    console.log(green('║') + white(` 💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`.padEnd(61)) + green('║'));
    console.log(green('╠══════════════════════════════════════════════════════════════╣'));
    console.log(green('║') + yellow(' 🔍 Running comprehensive health checks...                       ') + green('║'));
    console.log(green('╚══════════════════════════════════════════════════════════════╝'));
    console.log();
}

module.exports = { displayStartupBanner, displayReadyBanner };
