<script lang="ts">
    import {ws} from "$lib/ws/WebSocketManager";
    import {goto} from "$app/navigation";

    let playerName = '';
    let playerId = crypto.randomUUID();
    let error = '';

    function validateName(name: string): boolean {
        return name.trim().length > 1;
    }

    function joinAsPlayer() {
        if (!validateName(playerName)) {
            error = "Please enter a valid name (at least 2 characters).";
            return;
        }

        error = '';
        const trimmedName = playerName.trim();

        ws.send({
            type: 'join',
            data: {
                playerId,
                playerName: trimmedName
            }
        });

        localStorage.setItem('playerId', playerId);
        localStorage.setItem('playerName', trimmedName);

        goto('/player');
    }

    function joinAsAdmin() {
        if (!validateName(playerName)) {
            error = "Please enter a valid name (at least 2 characters).";
            return;
        }

        const apiKey = prompt('Enter API Key:');
        if (!apiKey) {
            error = "API Key is required to join as admin.";
            return;
        }

        error = '';
        const trimmedName = playerName.trim();

        ws.send({
            type: 'join',
            data: {
                playerId,
                playerName: trimmedName,
                apiKey
            }
        });

        localStorage.setItem('playerId', playerId);
        localStorage.setItem('playerName', trimmedName);

        goto('/admin');
    }
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
                <h2 class="text-2xl font-bold text-white mb-2">Ready to Play?</h2>
                <p class="text-blue-100">Enter your name and choose your role</p>
            </div>

            <div class="space-y-6">
                <div class="space-y-2">
                    <label for="playerName" class="text-sm font-medium text-blue-100">Your Name</label>
                    <input
                            id="playerName"
                            type="text"
                            bind:value={playerName}
                            placeholder="Enter your name"
                            class="w-full bg-white/20 border border-blue-300/30 text-white placeholder:text-blue-100 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {#if error}
                        <p class="text-red-400 text-sm mt-1">{error}</p>
                    {/if}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                            on:click={joinAsPlayer}
                            class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition disabled:bg-gray-400 disabled:text-gray-800 disabled:cursor-not-allowed"
                            disabled={!validateName(playerName)}
                    >
                        <span class="inline-flex items-center">
                            Join as Player
                        </span>
                    </button>

                    <button
                            on:click={joinAsAdmin}
                            class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition disabled:bg-gray-400 disabled:text-gray-800 disabled:cursor-not-allowed"
                            disabled={!validateName(playerName)}
                    >
                        <span class="inline-flex items-center">
                            Join as Admin
                        </span>
                    </button>
                </div>
            </div>
        </div>
    </main>

    <footer class="container mx-auto py-6 text-center text-blue-200 text-sm">
        © {new Date().getFullYear()} Jeopardy Buzzer • Crafted with ❤️ by ThnksCJ
    </footer>
</div>
