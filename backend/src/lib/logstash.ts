import { env } from "../config.js";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogDataset = "server" | "auth" | "security" | "game" | "errors";

type SendLogParams = {
  level: LogLevel;
  dataset: LogDataset;
  message: string;
  action?: string;
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  clientIp?: string;
};

async function sendLog({
  level,
  dataset,
  message,
  action,
  requestId,
  userId,
  method,
  path,
  clientIp,
}: SendLogParams): Promise<void> {
  const payload: Record<string, unknown> = {
    "@timestamp": new Date().toISOString(),
    message,
    "log.level": level,
    "service.name": "backend",
    "event.dataset": dataset,
  };

  if (action) payload["event.action"] = action;
  if (requestId) payload["request.id"] = requestId;
  if (userId) payload["user.id"] = userId;
  if (method) payload["http.request.method"] = method;
  if (path) payload["url.path"] = path;
  if (clientIp) payload["client.ip"] = clientIp;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);

  try {
    const response = await fetch(env.LOGSTASH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(
        `Failed to send log to Logstash: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`Logstash request timed out after ${500}ms`);
    } else {
      console.error("Failed to send log to Logstash:", error);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export { sendLog };
export type { LogLevel, LogDataset, SendLogParams };