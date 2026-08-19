import assert from "node:assert/strict";
import test from "node:test";
import { sendToMockExternalSystem } from "./application-sync";

test("mock synchronization succeeds by default", async () => {
  const previous = process.env.MOCK_SYNC_FAILURE;
  delete process.env.MOCK_SYNC_FAILURE;
  await assert.doesNotReject(() => sendToMockExternalSystem("application-1"));
  if (previous === undefined) delete process.env.MOCK_SYNC_FAILURE;
  else process.env.MOCK_SYNC_FAILURE = previous;
});

test("mock synchronization failure mode is retryable", async () => {
  const previous = process.env.MOCK_SYNC_FAILURE;
  process.env.MOCK_SYNC_FAILURE = "true";
  await assert.rejects(
    () => sendToMockExternalSystem("application-1"),
    /unavailable/,
  );
  delete process.env.MOCK_SYNC_FAILURE;
  await assert.doesNotReject(() => sendToMockExternalSystem("application-1"));
  if (previous !== undefined) process.env.MOCK_SYNC_FAILURE = previous;
});
