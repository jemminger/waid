<script lang="ts">
	import "../app.css";
	import { getTheme, applyTheme } from "$lib/theme";
	import { initWindowState } from "$lib/window-state";

	let { children } = $props();

	$effect(() => {
		const theme = getTheme();
		applyTheme(theme);
	});

	$effect(() => {
		initWindowState();
	});
</script>

{@render children()}
