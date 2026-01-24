<script lang="ts">
	import "../app.css";
	import { getTheme, applyTheme, toggleTheme } from "$lib/theme";

	let { children } = $props();
	let dark = $state(false);

	$effect(() => {
		const theme = getTheme();
		dark = theme === "dark";
		applyTheme(theme);
	});

	function handleToggle() {
		const next = toggleTheme();
		dark = next === "dark";
	}
</script>

<button
	onclick={handleToggle}
	class="fixed top-4 right-4 z-50 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground shadow-sm hover:bg-accent"
>
	{dark ? "Light" : "Dark"}
</button>

{@render children()}
