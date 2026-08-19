import assert from "node:assert/strict";
import test from "node:test";
import { canTransition } from "./workflow";

test("allows the supported application transitions", () => {
  assert.equal(canTransition("NEW", "IN_PROGRESS"), true);
  assert.equal(canTransition("IN_PROGRESS", "UNDER_REVIEW"), true);
  assert.equal(canTransition("UNDER_REVIEW", "COMPLETED"), true);
});

test("rejects invalid and completed transitions", () => {
  assert.equal(canTransition("NEW", "COMPLETED"), false);
  assert.equal(canTransition("COMPLETED", "IN_PROGRESS"), false);
});
