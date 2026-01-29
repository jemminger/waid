<script lang="ts">
  import { getAllTasks, createTask, updateTask, closeTask, reopenTask, deleteTask, reorderTask } from '$lib/tasks';
  import { dndzone } from 'svelte-dnd-action';
  import { slide } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { flipResize } from '$lib/flip-resize';
  import groupCompletedTasks, { getOpenTasks } from '$lib/buckets';
  import { formatTimestamp } from '$lib/dates';
  import type { Task } from '$lib/types';
  import { listen } from '@tauri-apps/api/event';
  import { checkForUpdates } from '$lib/updater';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '$lib/components/ui/dialog/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';

  let tasks = $state<Task[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let searchInput = $state<HTMLInputElement | null>(null);

  function matchesSearch(task: Task): boolean {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (task.name?.toLowerCase().includes(q) ?? false) || task.details.toLowerCase().includes(q);
  }

  // Periodic time update so buckets refresh at day boundaries
  let now = $state(new Date());
  $effect(() => {
    const interval = setInterval(() => { now = new Date(); }, 60_000);
    return () => clearInterval(interval);
  });

  let filteredTasks = $derived(tasks.filter(matchesSearch));
  let completedBuckets = $derived(groupCompletedTasks(filteredTasks, now));

  // Infinite scroll: limit visible buckets
  const BUCKETS_PER_PAGE = 5;
  let visibleBucketCount = $state(BUCKETS_PER_PAGE);

  function loadMoreBuckets() {
    visibleBucketCount += BUCKETS_PER_PAGE;
  }

  // Drag/drop state for open tasks
  const DND_TYPE = 'tasks';
  let openItems = $state<Task[]>([]);
  $effect(() => {
    openItems = getOpenTasks(filteredTasks);
  });

  // Today bucket as a separate drop target
  let todayBucket = $derived(completedBuckets.find(b => b.label === 'Today'));
  let todayItems = $state<Task[]>([]);
  $effect(() => {
    todayItems = todayBucket?.tasks ?? [];
  });
  let otherBuckets = $derived(completedBuckets.filter(b => b.label !== 'Today'));
  let visibleOtherBuckets = $derived(otherBuckets.slice(0, visibleBucketCount));
  let hasMoreOtherBuckets = $derived(visibleBucketCount < otherBuckets.length);

  // Collapsible bucket state: default collapsed except Today/Yesterday
  let collapsedBuckets: Record<string, boolean> = $state({});
  let bucketsInitialized = false;
  $effect(() => {
    if (!bucketsInitialized && completedBuckets.length > 0) {
      bucketsInitialized = true;
      const initial: Record<string, boolean> = {};
      for (const bucket of completedBuckets) {
        if (bucket.label !== 'Today' && bucket.label !== 'Yesterday') {
          initial[bucket.label] = true;
        }
      }
      collapsedBuckets = initial;
    }
  });

  function handleDndConsider(e: CustomEvent<{ items: Task[] }>) {
    openItems = e.detail.items;
  }

  async function handleDndFinalize(e: CustomEvent<{ items: Task[] }>) {
    openItems = e.detail.items;
    for (let i = 0; i < openItems.length; i++) {
      if (openItems[i].position !== i) {
        await reorderTask(openItems[i].id, i);
      }
    }
    await loadTasks();
  }

  function handleTodayConsider(e: CustomEvent<{ items: Task[] }>) {
    todayItems = e.detail.items;
  }

  async function handleTodayFinalize(e: CustomEvent<{ items: Task[] }>) {
    todayItems = e.detail.items;
    // Close any task that was just dropped here (not already closed)
    for (const task of todayItems) {
      if (!task.closed_at) {
        await closeTask(task.id);
      }
    }
    await loadTasks();
  }

  // Modal state
  let modalOpen = $state(false);
  let editingTask = $state<Task | null>(null);
  let taskName = $state('');
  let taskDetails = $state('');
  let nameInputRef = $state<HTMLInputElement | null>(null);

  $effect(() => {
    loadTasks();
  });

  // Check for updates silently after startup
  $effect(() => {
    const timeout = setTimeout(() => checkForUpdates(true), 3000);
    return () => clearTimeout(timeout);
  });


  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.metaKey && e.key === 'n') {
        e.preventDefault();
        handleAddClick();
        return;
      }
      if (e.key === '?' && !modalOpen && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchInput?.focus();
      }
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  // Listen for global shortcut event from Rust backend
  $effect(() => {
    const unlisten = listen('global-shortcut-new-task', () => {
      handleAddClick();
    });
    return () => { unlisten.then((fn) => fn()); };
  });

  async function loadTasks() {
    try {
      tasks = await getAllTasks();
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      loading = false;
    }
  }

  function getTaskTitle(task: Task): string {
    if (task.name) return task.name;
    if (task.details) return task.details.split('\n')[0];
    return 'Untitled';
  }

  function getTruncatedDetails(task: Task): string {
    if (!task.details) return '';
    const lines = task.details.split('\n');
    const detailText = task.name ? task.details : lines.slice(1).join('\n');
    if (!detailText.trim()) return '';
    return detailText.length > 120 ? detailText.slice(0, 120) + '...' : detailText;
  }


  function handleTaskClick(task: Task) {
    editingTask = task;
    taskName = task.name ?? '';
    taskDetails = task.details ?? '';
    confirmingDelete = false;
    modalOpen = true;
  }

  function handleAddClick() {
    editingTask = null;
    taskName = '';
    taskDetails = '';
    modalOpen = true;
  }

  function toggleBucket(label: string) {
    collapsedBuckets = { ...collapsedBuckets, [label]: !collapsedBuckets[label] };
  }

  async function handleCreate() {
    await createTask({ name: taskName || null, details: taskDetails });
    await loadTasks();
    modalOpen = false;
  }

  async function handleSave() {
    if (!editingTask) return;
    await updateTask(editingTask.id, { name: taskName || null, details: taskDetails });
    await loadTasks();
    modalOpen = false;
  }

  async function handleComplete() {
    if (!editingTask) return;
    await closeTask(editingTask.id);
    await loadTasks();
    modalOpen = false;
  }

  async function handleReopen() {
    if (!editingTask) return;
    await reopenTask(editingTask.id);
    await loadTasks();
    modalOpen = false;
  }

  let confirmingDelete = $state(false);

  function handleDelete() {
    confirmingDelete = true;
  }

  async function confirmDelete() {
    if (!editingTask) return;
    await deleteTask(editingTask.id);
    await loadTasks();
    confirmingDelete = false;
    modalOpen = false;
  }

  function cancelDelete() {
    confirmingDelete = false;
  }
</script>

<div class="min-h-screen bg-muted pb-24">
  <div class="w-full px-4 py-6">
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <p class="text-muted-foreground text-sm">Loading tasks...</p>
      </div>
    {:else}
      <!-- Search -->
      <div class="mb-4">
        <Input
          bind:value={searchQuery}
          bind:ref={searchInput}
          placeholder="Filter tasks... (press ? to focus)"
          class="bg-background"
        />
      </div>

      <!-- Current Tasks -->
      <section class="mb-8 rounded-lg bg-green-500/[0.07] p-4 dark:bg-green-400/[0.1]">
        <h2 class="mb-4 text-lg font-semibold text-foreground">Current Tasks</h2>
        {#if openItems.length === 0}
          <div class="py-16 text-center">
            <p class="text-muted-foreground text-sm">Nothing here</p>
          </div>
        {:else}
          <div
            class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3"
            use:dndzone={{ items: openItems, flipDurationMs: 200, type: DND_TYPE }}
            use:flipResize={{ duration: 200 }}
            onconsider={handleDndConsider}
            onfinalize={handleDndFinalize}
          >
            {#each openItems as task (task.id)}
              <div animate:flip={{ duration: 200 }} transition:slide={{ duration: 200 }}>
                <Card
                  class="aspect-[5/4] cursor-pointer overflow-hidden bg-background transition-colors hover:bg-accent/50"
                  onclick={() => handleTaskClick(task)}
                >
                  <CardHeader class="pb-0">
                    <CardTitle class="text-sm">{getTaskTitle(task)}</CardTitle>
                    {#if getTruncatedDetails(task)}
                      <CardDescription class="line-clamp-4 text-xs">
                        {getTruncatedDetails(task)}
                      </CardDescription>
                    {/if}
                  </CardHeader>
                  <CardContent class="pt-0">
                    <span class="text-muted-foreground text-[11px]">
                      {formatTimestamp(task.created_at)}
                    </span>
                  </CardContent>
                </Card>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Today bucket (drop target) -->
      <section class="mb-6 rounded-lg p-4 bg-blue-500/[0.07] dark:bg-blue-400/[0.1]">
        <button
          class="mb-3 flex w-full items-center gap-2 text-left"
          onclick={() => toggleBucket('Today')}
        >
          <span class="text-xs text-muted-foreground/70 transition-transform {collapsedBuckets['Today'] ? '' : 'rotate-90'}">&#9654;</span>
          <h3 class="text-sm font-medium text-muted-foreground">Today</h3>
          <span class="text-xs text-muted-foreground/70">({todayItems.length})</span>
        </button>
        {#if !collapsedBuckets['Today']}
          <div
            class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 min-h-[60px]"
            use:dndzone={{ items: todayItems, flipDurationMs: 200, type: DND_TYPE, dragDisabled: true }}
            use:flipResize={{ duration: 200 }}
            onconsider={handleTodayConsider}
            onfinalize={handleTodayFinalize}
          >
            {#each todayItems as task (task.id)}
              <div animate:flip={{ duration: 200 }}>
                <Card
                  class="aspect-[5/4] cursor-pointer overflow-hidden bg-background opacity-70 transition-colors hover:opacity-90 hover:bg-accent/30"
                  onclick={() => handleTaskClick(task)}
                >
                  <CardHeader class="pb-0">
                    <CardTitle class="text-sm text-muted-foreground">{getTaskTitle(task)}</CardTitle>
                    {#if getTruncatedDetails(task)}
                      <CardDescription class="line-clamp-4 text-xs">
                        {getTruncatedDetails(task)}
                      </CardDescription>
                    {/if}
                  </CardHeader>
                  <CardContent class="pt-0">
                    <span class="text-muted-foreground/70 text-[11px]">
                      {formatTimestamp(task.closed_at)}
                    </span>
                  </CardContent>
                </Card>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Other Completed Buckets -->
      {#if otherBuckets.length > 0}
        {#each visibleOtherBuckets as bucket (bucket.label)}
          <section class="mb-6 rounded-lg p-4 {bucket.label === 'Yesterday' ? 'bg-blue-500/[0.07] dark:bg-blue-400/[0.1]' : 'bg-black/[0.04] dark:bg-white/[0.04]'}" transition:slide={{ duration: 200 }}>
            <button
              class="mb-3 flex w-full items-center gap-2 text-left"
              onclick={() => toggleBucket(bucket.label)}
            >
              <span class="text-xs text-muted-foreground/70 transition-transform {collapsedBuckets[bucket.label] ? '' : 'rotate-90'}">&#9654;</span>
              <h3 class="text-sm font-medium text-muted-foreground">{bucket.label}</h3>
              <span class="text-xs text-muted-foreground/70">({bucket.tasks.length})</span>
            </button>
            {#if !collapsedBuckets[bucket.label]}
              <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2" use:flipResize={{ duration: 200 }}>
                {#each bucket.tasks as task (task.id)}
                  <Card
                    class="aspect-[5/4] cursor-pointer overflow-hidden bg-background opacity-70 transition-colors hover:opacity-90 hover:bg-accent/30"
                    onclick={() => handleTaskClick(task)}
                  >
                    <CardHeader class="pb-0">
                      <CardTitle class="text-sm text-muted-foreground">{getTaskTitle(task)}</CardTitle>
                      {#if getTruncatedDetails(task)}
                        <CardDescription class="line-clamp-4 text-xs">
                          {getTruncatedDetails(task)}
                        </CardDescription>
                      {/if}
                    </CardHeader>
                    <CardContent class="pt-0">
                      <span class="text-muted-foreground/70 text-[11px]">
                        {formatTimestamp(task.closed_at)}
                      </span>
                    </CardContent>
                  </Card>
                {/each}
              </div>
            {/if}
          </section>
        {/each}
        {#if hasMoreOtherBuckets}
          <div class="py-4 text-center">
            <Button variant="outline" onclick={loadMoreBuckets}>
              Show older
            </Button>
          </div>
        {/if}
      {/if}
    {/if}
  </div>

  <!-- Floating Add Button -->
  <div class="fixed bottom-6 right-6">
    <Button
      size="icon-lg"
      class="h-14 w-14 rounded-full shadow-lg text-xl"
      onclick={handleAddClick}
    >
      +
    </Button>
  </div>
</div>

<!-- Task Modal -->
<Dialog bind:open={modalOpen}>
  <DialogContent onOpenAutoFocus={(e) => { e.preventDefault(); nameInputRef?.focus(); }}>
    <DialogHeader>
      <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
      <DialogDescription class="sr-only">
        {editingTask ? 'Edit an existing task' : 'Create a new task'}
      </DialogDescription>
    </DialogHeader>

    <div class="flex flex-col gap-4 py-2">
      <Input
        bind:value={taskName}
        bind:ref={nameInputRef}
        placeholder="Task name (optional)"
      />
      <Textarea
        bind:value={taskDetails}
        placeholder="Details..."
        rows={8}
      />
    </div>

    <DialogFooter class="mt-8">
      {#if editingTask}
        {#if confirmingDelete}
          <div class="flex w-full flex-col items-center gap-3">
            <span class="text-sm text-destructive">Delete this task?</span>
            <div class="flex gap-2">
              <Button variant="outline" onclick={cancelDelete}>Cancel</Button>
              <Button variant="destructive" onclick={confirmDelete}>Confirm</Button>
            </div>
          </div>
        {:else}
          <Button onclick={handleSave} class="order-last">Save</Button>
          {#if editingTask.closed_at}
            <Button variant="outline" onclick={handleReopen} class="order-3">Reopen</Button>
          {:else}
            <Button variant="outline" onclick={handleComplete} class="order-3">Complete</Button>
          {/if}
          <div class="order-2 flex-1"></div>
          <Button variant="destructive" onclick={handleDelete} tabindex={-1} class="order-1">Delete</Button>
        {/if}
      {:else}
        <Button onclick={handleCreate}>Create</Button>
      {/if}
    </DialogFooter>
  </DialogContent>
</Dialog>
