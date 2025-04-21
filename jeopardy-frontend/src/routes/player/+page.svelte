<script lang="ts">
    import { onMount } from 'svelte';
    import { ws } from '$lib/ws/WebSocketManager';
    import { goto } from "$app/navigation";
    import confetti from 'canvas-confetti';

    let playerName: string | null = null;
    let playerId: string | null = null;
    let buzzerLocked = false;
    let buzzSuccess = false;
    let clientInitialized = false;
    let playerPosition: number | null = null;
    let firstBuzzPlayer: string | null = null;

    function initializePlayer() {
        playerId = localStorage.getItem('playerId');
        playerName = localStorage.getItem('playerName');

        if (!playerId || !playerName) {
            goto('/');
        }
    }

    function handleMessage(event: MessageEvent) {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
            case 'reset':
                resetState();
                break;
            case 'position':
                updatePosition(msg.data);
                break;
            case 'buzzList':
                updateFirstBuzzPlayer(msg.data);
                break;
            case 'error':
                console.error(msg.message);
                break;
        }
    }

    function resetState() {
        buzzerLocked = false;
        buzzSuccess = false;
        playerPosition = null;
        firstBuzzPlayer = null;
    }

    function updatePosition(data: { position: number }) {
        playerPosition = data.position;

        if (data.position === 1) {
            buzzSuccess = true;
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { x: 0.5, y: 0.5 }
            });
        }
    }

    function updateFirstBuzzPlayer(buzzList: Array<{ playerName: string; playerId: string }>) {
        if (buzzList.length > 0) {
            const first = buzzList[0];
            firstBuzzPlayer = first.playerId === playerId ? 'You buzzed first!' : `${first.playerName} buzzed first.`;
        }
    }

    function buzzIn() {
        if (buzzerLocked || !playerId || !playerName) return;

        ws.send({
            type: 'buzz',
            data: { playerId, playerName }
        });

        buzzerLocked = true;

        ws.send({
            type: 'getPosition',
            data: { playerId }
        });

        ws.send({
            type: 'getBuzzList',
            data: {}
        });
    }

    onMount(() => {
        if (!ws.socket) {
            goto('/');
            return;
        }

        initializePlayer();

        ws.send({
            type: 'ready',
            data: { playerId, playerName }
        });

        ws.socket!.addEventListener('message', handleMessage);

        clientInitialized = true;
    });
</script>

<div class="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 flex flex-col">
    <header class="container mx-auto py-6 flex justify-center">
        <div class="flex items-center gap-2">
            <h1 class="text-3xl md:text-4xl font-bold text-white">Jeopardy Buzzer</h1>
        </div>
    </header>

    <main class="flex-1 container mx-auto flex flex-col items-center justify-center px-4">
        <div class="w-full max-w-md bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-2xl border border-blue-400/30">
            <div class="text-center mb-8">
                <h1 class="text-xl text-white mb-6">Player: {playerName}</h1>
                {#if playerPosition !== null}
                    <h2 class="text-white">Your position: {playerPosition}</h2>
                {:else}
                    <h2 class="text-white">Waiting for position...</h2>
                {/if}
                {#if firstBuzzPlayer}
                    <h3 class="text-blue-200 mt-2">{firstBuzzPlayer}</h3>
                {/if}
            </div>

            <div class="space-y-6">
                <div class="flex justify-center items-center space-y-6">
                    <button
                            class="w-52 h-52 rounded-full bg-red-600 text-white text-2xl font-bold flex items-center justify-center shadow-lg transition duration-200 transform hover:bg-red-500 focus:outline-none disabled:bg-gray-500 disabled:cursor-not-allowed"
                            on:click={buzzIn}
                            class:opacity-50={buzzerLocked || !clientInitialized}
                            disabled={buzzerLocked || !clientInitialized}
                    >
                        {#if !clientInitialized}
                            Loading...
                        {:else if buzzSuccess}
                            You buzzed in!
                        {:else if buzzerLocked}
                            Buzzer locked
                        {:else}
                            Buzz In
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </main>

    <footer class="container mx-auto py-6 text-center text-blue-200 text-sm">
        © {new Date().getFullYear()} Jeopardy Buzzer • Crafted with ❤️ by ThnksCJ
    </footer>
</div>
