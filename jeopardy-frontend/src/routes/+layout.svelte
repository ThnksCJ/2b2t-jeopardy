<script lang="ts">
    import "../app.css";
    import { onMount } from 'svelte';
    import { ws } from '$lib/ws/WebSocketManager';

    onMount(() => {
        ws.connect();
    });
</script>

<slot />
