<script lang="ts">
	import "../app.css";
	import { getTheme, applyTheme } from "$lib/theme";
	import { initWindowState } from "$lib/window-state";
	import { cloak } from "$lib/cloak.svelte";

	let { children } = $props();
	let cloakFading = $state(false);
	let cloakRemoved = $state(false);

	$effect(() => {
		const theme = getTheme();
		applyTheme(theme);
	});

	$effect(() => {
		initWindowState();
	});

	$effect(() => {
		if (!cloak.visible && !cloakFading) {
			cloakFading = true;
			setTimeout(() => {
				cloakRemoved = true;
			}, 300);
		}
	});
</script>

{@render children()}

{#if !cloakRemoved}
	<div
		class="fixed inset-0 z-[9999] bg-background transition-opacity duration-300"
		class:opacity-0={cloakFading}
	></div>
{/if}
