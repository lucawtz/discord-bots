const path = require('path');
const { deployCommands } = require('../../../libs/deploy-commands');

deployCommands(path.join(__dirname, 'commands'), 'Soundboard');
