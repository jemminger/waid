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
	class="fixed top-4 right-4 z-50 rounded-full border border-border bg-background p-2 text-foreground shadow-sm hover:bg-accent"
	aria-label="Toggle dark mode"
>
	{#if dark}
		<Sun size={18} />
	{:else}
		<Moon size={18} />
	{/if}
</button>

{@render children()}
