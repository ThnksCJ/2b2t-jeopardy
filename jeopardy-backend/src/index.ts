import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import WebSocket from 'ws';
import { logger } from './global';

interface BuzzEvent {
    playerId: string;
    playerName: string;
    timestamp: number;
}

interface Packet<T = any> {
    type: string;
    data: T;
}

interface JeopardyPlayer {
    playerId: string;
    playerName: string;
    isHost: boolean;
    delta: number;
}

const buzzEvents: BuzzEvent[] = [];
const players = new Map<string, { player: JeopardyPlayer; socket: WebSocket }>();

const send = (socket: WebSocket.WebSocket, type: string, data: any) => {
    socket.send(JSON.stringify({ type, data }));
};

const broadcastToHosts = (type: string, data: any) => {
    for (const { player, socket } of players.values()) {
        if (player.isHost) send(socket, type, data);
    }
};

const updateClientCount = () => {
    const clientCount = Array.from(players.values()).filter(({ player }) => !player.isHost).length;
    broadcastToHosts('clientCount', { clientCount });
};

const updateLeaderboard = () => {
    const leaderboard = Array.from(players.values())
        .map(({ player }) => ({ ...player }))
        .filter(player => !player.isHost)
        .sort((a, b) => b.delta - a.delta);

    broadcastToHosts('leaderboard', leaderboard);
};

const handlePlayerDisconnect = (playerId: string) => {
    const playerData = players.get(playerId);
    if (!playerData) return;

    const { player } = playerData;
    players.delete(playerId);

    logger.global.info(`${player.isHost ? 'Host' : 'Player'} ${player.playerName} disconnected! (${playerId})`);

    if (player.isHost) {
        broadcastToHosts('hostDisconnected', { playerId });
    }

    updateClientCount();
    updateLeaderboard();

    const index = buzzEvents.findIndex(event => event.playerId === playerId);
    if (index !== -1) buzzEvents.splice(index, 1);
};

const handlers: Record<string, (packet: Packet, socket: WebSocket.WebSocket) => void> = {
    'join': ({ data }, socket) => {
        const { playerId, playerName, apiKey } = data;

        if (players.has(playerId)) return send(socket, 'error', { message: `Player ${playerName} already exists!` });

        const isHost = apiKey === 'paw tuah';
        if (apiKey && !isHost) return send(socket, 'error', { message: 'erm... no.' });

        const player: JeopardyPlayer = { playerId, playerName, isHost, delta: 0 };
        players.set(playerId, { player, socket });

        logger.global.info(`${isHost ? 'Host' : 'Player'} ${playerName} joined the game! (${playerId})`);
        updateLeaderboard();
    },

    'ready': ({ data }) => {
        logger.global.info(`Player ${data.playerName} is ready! (${data.playerId})`);
        updateClientCount();
    },

    'buzz': ({ data }) => {
        const event: BuzzEvent = { ...data, timestamp: Date.now() };
        buzzEvents.push(event);
        logger.global.info(`Player ${data.playerName} buzzed! (${data.playerId})`);
        broadcastToHosts('buzz', event);
    },

    'getPosition': ({ data }, socket) => {
        const position = buzzEvents.findIndex(event => event.playerId === data.playerId) + 1;
        if (position === -1) return send(socket, 'error', { message: `Player ${data.playerId} not found in buzz list` });
        send(socket, 'position', { position });
    },

    'getBuzzList': (_, socket) => send(socket, 'buzzList', buzzEvents),

    'reset': () => {
        buzzEvents.length = 0;
        for (const { player, socket } of players.values()) {
            if (!player.isHost) send(socket, 'reset', {});
        }
        logger.global.info('Game reset!');
    },

    'start': () => {
        buzzEvents.length = 0;
        for (const { player } of players.values())
            player.delta = 0;
        updateLeaderboard();
        broadcastToHosts('start', {});
        logger.global.info('Game started!');
    },

    'getLeaderboard': () => updateLeaderboard(),

    'adjustScore': ({ data }) => {
        const playerData = players.get(data.playerId);
        if (!playerData) return;
        playerData.player.delta += data.delta;
        logger.global.info(`Adjusted ${playerData.player.playerName}'s score by ${data.delta}`);
        updateLeaderboard();
    },
};

(async () => {
    const fastify = Fastify();
    await fastify.register(websocket);

    fastify.get('/ws', { websocket: true }, (conn) => {
        conn.on('message', (raw) => {
            try {
                const packet = JSON.parse(raw.toString());

                const handler = handlers[packet.type];

                if (!handler) {
                    logger.global.error(`Unknown packet type: ${packet.type}`);
                    return send(conn, 'error', { message: `Unknown packet type: ${packet.type}` });
                }
                handler(packet, conn);
            } catch (err) {
                logger.global.error('Invalid message format:', err);
                send(conn, 'error', { message: 'Invalid message format' });
            }
        });

        conn.on('close', () => {
            for (const [playerId, { socket: s }] of players.entries()) {
                if (s === conn) {
                    handlePlayerDisconnect(playerId);
                    break;
                }
            }
        });

        setInterval(() => {
            for (const [playerId, { socket: s }] of players.entries()) {
                if (s.readyState === WebSocket.CLOSED) handlePlayerDisconnect(playerId);
            }
        }, 10000);
    });

    fastify.get('/', async () => ['Jeopardy Backend', { github: '/thnkscj', made: 'with ❤️ by ceejay' }]);
    fastify.get('/health', async () => ({ status: 'ok' }));

    await fastify.listen({ port: 25503, host: '0.0.0.0' });
    logger.global.info(`Server is running at http://localhost:25503`);
})();
