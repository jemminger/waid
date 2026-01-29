let _windowReady = $state(false);
let _tasksReady = $state(false);

export const cloak = {
  get visible() {
    return !_windowReady || !_tasksReady;
  },
  markWindowReady() {
    _windowReady = true;
  },
  markTasksReady() {
    _tasksReady = true;
  },
};
