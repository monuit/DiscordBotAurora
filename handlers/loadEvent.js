const { white, green, red } = require("chalk");
const { readdirSync } = require('fs');

module.exports = async (client) => {
    const loadcommand = dirs => {
        const events = readdirSync(`./events/${dirs}/`).filter(d => d.endsWith('.js'));
        for (let file of events) {
            try {
                const evt = require(`../events/${dirs}/${file}`);
                const eName = file.split('.')[0];
                
                // Check if evt is a function
                if (typeof evt !== 'function') {
                    console.log(white('[') + red('ERROR') + white('] ') + red(`Event file ${file} does not export a function`));
                    continue;
                }
                
                client.on(eName, evt.bind(null, client));
                console.log(white('[') + green('EVENT') + white('] ') + green(`${eName} event loaded successfully`));
            } catch (error) {
                console.log(white('[') + red('ERROR') + white('] ') + red(`Failed to load event ${file}: ${error.message}`));
            }
        }
    };
    
    try {
        ["client", "guild"].forEach((x) => loadcommand(x));
        console.log(white('[') + green('INFO') + white('] ') + green('✅ Event ') + white('Events') + green(' Loaded!'));
    } catch (error) {
        console.log(white('[') + red('ERROR') + white('] ') + red(`Failed to load events: ${error.message}`));
    }
};