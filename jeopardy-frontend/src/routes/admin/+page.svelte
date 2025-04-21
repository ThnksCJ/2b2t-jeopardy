<script lang="ts">
    import { onMount } from 'svelte';
    import { ws } from '$lib/ws/WebSocketManager';
    import { goto } from "$app/navigation";

    let buzzList: Array<{ playerId: string; playerName: string; timestamp: number }> = [];
    let leaderboard: Array<{ playerId: string; playerName: string; delta: number }> = [];
    let error: string | null = null;
    let clientInitialized = false;
    let clientCount = 0;

    onMount(() => {
        if (!ws.socket) {
            goto('/');
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);

            switch (msg.type) {
                case 'buzz':
                    buzzList = [...buzzList, msg.data];
                    break;
                case 'buzzList':
                    buzzList = msg.data;
                    clientInitialized = true;
                    break;
                case 'leaderboard':
                    leaderboard = msg.data;
                    break;
                case 'clientCount':
                    clientCount = msg.data.clientCount;
                    break;
                case 'error':
                    error = msg.message || 'Server error';
                    console.error(msg);
                    break;
            }
        };

        ws.socket!.addEventListener('message', handleMessage);

        ws.send({ type: 'getBuzzList' });
        ws.send({ type: 'getLeaderboard' });

        return () => {
            ws.socket!.removeEventListener('message', handleMessage);
        };
    });

    function resetBuzzers() {
        try {
            ws.send({ type: 'reset' });
            error = null;
            buzzList = [];
        } catch (err) {
            error = 'Failed to reset buzzers';
            console.error(err);
        }
    }

    function startBuzzers() {
        try {
            ws.send({ type: 'start' });
            error = null;
        } catch (err) {
            error = 'Failed to start buzzers';
            console.error(err);
        }
    }

    function adjustScore(playerId: string, delta: number) {
        ws.send({
            type: 'adjustScore',
            data: { playerId, delta }
        });
    }
</script>

<div class="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 flex flex-col">
    <header class="container mx-auto py-6 flex justify-center">
        <div class="flex items-center gap-2">
            <h1 class="text-3xl md:text-4xl font-bold text-white">Jeopardy Buzzer Admin</h1>
        </div>
    </header>

    <main class="flex-1 container mx-auto flex flex-col items-center justify-center px-4">

        <div class="w-full max-w-4xl bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-2xl border border-blue-400/30">
            {#if error}
                <div class="text-red-500 bg-red-100 p-4 rounded mb-4 text-center">{error}</div>
            {:else if !clientInitialized}
                <div class="p-8 text-center text-gray-500 italic">Loading admin console...</div>
            {:else}
                <div class="flex justify-center mb-8">
                    <button on:click={resetBuzzers} class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md transition duration-300">Reset Buzzers</button>
                </div>

                <div class="flex justify-center mb-8">
                    <button on:click={startBuzzers} class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md transition duration-300">Start Game</button>
                </div>

                <div class="flex gap-8 mb-8 w-full justify-between">
                    <!-- Buzz List -->
                    <div class="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-md overflow-hidden">
                        <h2 class="text-xl font-semibold text-center mb-4 text-white">Buzz Order</h2>

                        {#if buzzList.length === 0}
                            <p class="text-center text-gray-300">No buzzes yet</p>
                        {:else}
                            <table class="table-auto w-full text-left text-sm text-white">
                                <thead>
                                <tr class="border-b">
                                    <th class="px-4 py-2 font-medium">Position</th>
                                    <th class="px-4 py-2 font-medium">Player</th>
                                </tr>
                                </thead>
                                <tbody>
                                {#each buzzList as buzz, index}
                                    <tr class="border-b hover:bg-white/20">
                                        <td class="px-4 py-2">{index + 1}</td>
                                        <td class="px-4 py-2">{buzz.playerName}</td>
                                    </tr>
                                {/each}
                                </tbody>
                            </table>
                        {/if}
                    </div>

                    <!-- Leaderboard -->
                    <div class="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-md overflow-hidden">
                        <h2 class="text-xl font-semibold text-center mb-4 text-white">Leaderboard</h2>

                        {#if leaderboard.length === 0}
                            <p class="text-center text-gray-300">No players yet</p>
                        {:else}
                            <table class="table-auto w-full text-left text-sm text-white">
                                <thead>
                                <tr class="border-b">
                                    <th class="px-4 py-2 font-medium">Player</th>
                                    <th class="px-4 py-2 font-medium">Points</th>
                                    <th class="px-4 py-2 font-medium">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {#each leaderboard as player}
                                    <tr class="border-b hover:bg-white/20">
                                        <td class="px-4 py-2">{player.playerName}</td>
                                        <td class="px-4 py-2">{player.delta}</td>
                                        <td class="px-4 py-2 flex space-x-4">
                                            <button on:click={() => adjustScore(player.playerId, 1)} class="px-3 py-1 bg-green-500 hover:bg-green-400 text-white rounded-md font-bold">+</button>
                                            <button on:click={() => adjustScore(player.playerId, -1)} class="px-3 py-1 bg-red-500 hover:bg-red-400 text-white rounded-md font-bold">-</button>
                                        </td>
                                    </tr>
                                {/each}
                                </tbody>
                            </table>
                        {/if}
                    </div>
                </div>

                <div class="bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-md mt-8 text-center text-white">
                    <h3 class="text-lg font-semibold">Clients Connected: {clientCount}</h3>
                </div>
            {/if}
        </div>
    </main>

    <footer class="container mx-auto py-6 text-center text-blue-200 text-sm">
        © {new Date().getFullYear()} Jeopardy Buzzer • Crafted with ❤️ by ThnksCJ
    </footer>
</div>


