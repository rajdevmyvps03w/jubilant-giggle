import forever from 'forever-monitor';

const boot = new forever.Monitor('src/index.js', {
    silent: false,
    args: []
});

boot.on('restart', () => {
    console.warn('⚠️  Bot crashed! Restarting for the next attempt...');
});

boot.on('exit', () => {
    console.error('⛔  src/index.js has exited permanently after multiple crashes.');
});

boot.start();