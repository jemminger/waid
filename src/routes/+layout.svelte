<script lang="ts">
	import "../app.css";
	import { getTheme, applyTheme, toggleTheme } from "$lib/theme";
	import { initWindowState } from "$lib/window-state";
	import Sun from "@lucide/svelte/icons/sun";
	import Moon from "@lucide/svelte/icons/moon";

	let { children } = $props();
	let dark = $state(false);

	$effect(() => {
		const theme = getTheme();
		dark = theme === "dark";
		applyTheme(theme);
	});

	$effect(() => {
		initWindowState();
	});

	function handleToggle() {
		const next = toggleTheme();
		dark = next === "dark";
	}
</script>

<button
	onclick={handleToggle}
	class="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg hover:bg-accent"
	aria-label="Toggle dark mode"
>
	{#if dark}
		<Sun size={24} />
	{:else}
		<Moon size={24} />
	{/if}
</button>

{@render children()}
