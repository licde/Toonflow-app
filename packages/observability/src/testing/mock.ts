import type { LogEvent, LogSink } from "../types";
import { Observability } from "../observability";

export function createMockObservability() {
  const events: LogEvent[] = [];
  const sink: LogSink = async (e) => {
    events.push(structuredClone(e));
  };
  const obs = new Observability({ appId: "mock", switches: { enabled: true } });
  obs.registerSink(sink);
  return { obs, events, sink };
}
