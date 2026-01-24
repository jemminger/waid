/**
 * Svelte action that animates grid children when the container resizes
 * using FLIP (First, Last, Invert, Play) technique.
 *
 * Uses double-buffering to ensure we always have "before" positions available.
 */

interface FlipResizeOptions {
  duration?: number;
  easing?: string;
}

interface Rect {
  left: number;
  top: number;
}

export function flipResize(node: HTMLElement, options: FlipResizeOptions = {}) {
  const { duration = 200, easing = 'ease-out' } = options;

  // Double-buffered position cache
  let prevPositions = new Map<Element, Rect>();
  let currPositions = new Map<Element, Rect>();
  let isAnimating = false;
  let lastColumnCount = 0;

  function getColumnCount(): number {
    // Estimate column count by checking how many items are on the first row
    const children = Array.from(node.children);
    if (children.length === 0) return 0;

    const firstTop = children[0].getBoundingClientRect().top;
    let count = 0;
    for (const child of children) {
      if (Math.abs(child.getBoundingClientRect().top - firstTop) < 5) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  function capturePositions(): Map<Element, Rect> {
    const positions = new Map<Element, Rect>();
    for (const child of node.children) {
      const rect = child.getBoundingClientRect();
      positions.set(child, { left: rect.left, top: rect.top });
    }
    return positions;
  }

  function animate() {
    if (isAnimating || prevPositions.size === 0) return;

    const newPositions = capturePositions();
    const animations: Animation[] = [];

    for (const child of node.children) {
      const oldRect = prevPositions.get(child);
      const newRect = newPositions.get(child);

      if (!oldRect || !newRect) continue;

      const deltaX = oldRect.left - newRect.left;
      const deltaY = oldRect.top - newRect.top;

      // Only animate significant movement
      if (Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) continue;

      const animation = child.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: 'translate(0, 0)' }
        ],
        { duration, easing, fill: 'none' }
      );
      animations.push(animation);
    }

    if (animations.length > 0) {
      isAnimating = true;
      Promise.all(animations.map(a => a.finished)).then(() => {
        isAnimating = false;
      });
    }
  }

  // Use ResizeObserver on the container
  const resizeObserver = new ResizeObserver(() => {
    if (isAnimating) return;

    const newColumnCount = getColumnCount();

    if (lastColumnCount !== 0 && newColumnCount !== lastColumnCount) {
      // Column count changed - animate!
      animate();
    }

    lastColumnCount = newColumnCount;

    // Swap buffers: current becomes previous
    prevPositions = currPositions;
    currPositions = capturePositions();
  });

  // Also track on animation frames for smoother detection during drag resize
  let rafId: number;
  function tick() {
    if (!isAnimating) {
      const newColumnCount = getColumnCount();

      if (lastColumnCount !== 0 && newColumnCount !== lastColumnCount) {
        animate();
        lastColumnCount = newColumnCount;
      }

      // Rotate buffers
      prevPositions = currPositions;
      currPositions = capturePositions();

      if (lastColumnCount === 0) {
        lastColumnCount = newColumnCount;
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  // Initialize
  currPositions = capturePositions();
  lastColumnCount = getColumnCount();
  resizeObserver.observe(node);
  rafId = requestAnimationFrame(tick);

  return {
    update(newOptions: FlipResizeOptions) {},
    destroy() {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId);
    }
  };
}
