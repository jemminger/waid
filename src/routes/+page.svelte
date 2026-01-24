<script lang="ts">
  import { getAllTasks, createTask, updateTask, closeTask, reopenTask, deleteTask, reorderTask } from '$lib/tasks';
  import { dndzone } from 'svelte-dnd-action';
  import { slide } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import groupCompletedTasks, { getOpenTasks } from '$lib/buckets';
  import type { Task } from '$lib/types';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '$lib/components/ui/dialog/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';

  let tasks = $state<Task[]>([]);
  let loading = $state(true);

  let completedBuckets = $derived(groupCompletedTasks(tasks));

  // Infinite scroll: limit visible buckets
  const BUCKETS_PER_PAGE = 5;
  let visibleBucketCount = $state(BUCKETS_PER_PAGE);
  let visibleBuckets = $derived(completedBuckets.slice(0, visibleBucketCount));
  let hasMoreBuckets = $derived(visibleBucketCount < completedBuckets.length);

  function loadMoreBuckets() {
    visibleBucketCount += BUCKETS_PER_PAGE;
  }

  // Drag/drop state for open tasks
  let openItems = $state<Task[]>([]);
  $effect(() => {
    openItems = getOpenTasks(tasks);
  });

  // Collapsible bucket state
  let collapsedBuckets: Record<string, boolean> = $state({});

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

  // Modal state
  let modalOpen = $state(false);
  let editingTask = $state<Task | null>(null);
  let taskName = $state('');
  let taskDetails = $state('');

  $effect(() => {
    loadTasks();
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

  function formatTimestamp(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function handleTaskClick(task: Task) {
    editingTask = task;
    taskName = task.name ?? '';
    taskDetails = task.details ?? '';
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

  async function handleDelete() {
    if (!editingTask) return;
    await deleteTask(editingTask.id);
    await loadTasks();
    modalOpen = false;
  }
</script>

<div class="min-h-screen bg-background pb-24">
  <div class="mx-auto max-w-2xl px-4 py-6">
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <p class="text-muted-foreground text-sm">Loading tasks...</p>
      </div>
    {:else}
      <!-- Current Tasks -->
      <section class="mb-8">
        <h2 class="mb-4 text-lg font-semibold text-foreground">Current Tasks</h2>
        {#if openItems.length === 0}
          <div class="py-16 text-center">
            <p class="text-muted-foreground text-sm">Nothing here</p>
          </div>
        {:else}
          <div
            class="flex flex-col gap-3"
            use:dndzone={{ items: openItems, flipDurationMs: 200 }}
            onconsider={handleDndConsider}
            onfinalize={handleDndFinalize}
          >
            {#each openItems as task (task.id)}
              <div animate:flip={{ duration: 200 }} transition:slide={{ duration: 200 }}>
                <Card
                  class="cursor-pointer transition-colors hover:bg-accent/50"
                  onclick={() => handleTaskClick(task)}
                >
                  <CardHeader class="pb-0">
                    <CardTitle class="text-sm">{getTaskTitle(task)}</CardTitle>
                    {#if getTruncatedDetails(task)}
                      <CardDescription class="line-clamp-2 text-xs">
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

      <!-- Completed Task Buckets -->
      {#if completedBuckets.length > 0}
        {#each visibleBuckets as bucket (bucket.label)}
          <section class="mb-6" transition:slide={{ duration: 200 }}>
            <button
              class="mb-3 flex w-full items-center gap-2 text-left"
              onclick={() => toggleBucket(bucket.label)}
            >
              <span class="text-xs text-muted-foreground/70 transition-transform {collapsedBuckets[bucket.label] ? '' : 'rotate-90'}">&#9654;</span>
              <h3 class="text-sm font-medium text-muted-foreground">{bucket.label}</h3>
              <span class="text-xs text-muted-foreground/70">({bucket.tasks.length})</span>
            </button>
            {#if !collapsedBuckets[bucket.label]}
              <div class="flex flex-col gap-2">
                {#each bucket.tasks as task (task.id)}
                  <Card
                    class="cursor-pointer opacity-70 transition-colors hover:opacity-90 hover:bg-accent/30"
                    onclick={() => handleTaskClick(task)}
                  >
                    <CardHeader class="pb-0">
                      <CardTitle class="text-sm text-muted-foreground">{getTaskTitle(task)}</CardTitle>
                      {#if getTruncatedDetails(task)}
                        <CardDescription class="line-clamp-2 text-xs">
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
        {#if hasMoreBuckets}
          <div class="py-4 text-center">
            <Button variant="outline" onclick={loadMoreBuckets}>
              Show older
            </Button>
          </div>
        {/if}
      {:else}
        <div class="py-16 text-center">
          <p class="text-muted-foreground text-sm">Nothing here</p>
        </div>
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
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
      <DialogDescription class="sr-only">
        {editingTask ? 'Edit an existing task' : 'Create a new task'}
      </DialogDescription>
    </DialogHeader>

    <div class="flex flex-col gap-4 py-2">
      <Input
        bind:value={taskName}
        placeholder="Task name (optional)"
      />
      <Textarea
        bind:value={taskDetails}
        placeholder="Details..."
      />
    </div>

    <DialogFooter>
      {#if editingTask}
        <Button variant="destructive" onclick={handleDelete}>Delete</Button>
        <div class="flex-1"></div>
        {#if editingTask.closed_at}
          <Button variant="outline" onclick={handleReopen}>Reopen</Button>
        {:else}
          <Button variant="outline" onclick={handleComplete}>Complete</Button>
        {/if}
        <Button onclick={handleSave}>Save</Button>
      {:else}
        <Button onclick={handleCreate}>Create</Button>
      {/if}
    </DialogFooter>
  </DialogContent>
</Dialog>
