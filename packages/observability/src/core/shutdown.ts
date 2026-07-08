import type { WriteQueue } from "./writeQueue";

const hooks: Array<() => void | Promise<void>> = [];

export function onObsShutdown(fn: () => void | Promise<void>) {
  hooks.push(fn);
}

let registered = false;

export function registerShutdownHandlers(queue?: WriteQueue) {
  if (registered) return;
  registered = true;
  const run = async () => {
    for (const fn of hooks) await fn();
    if (queue) {
      queue.stop();
      await queue.flush();
    }
  };
  process.once("beforeExit", () => void run());
  process.once("SIGINT", () => void run().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void run().finally(() => process.exit(0)));
}
