import assert from "node:assert/strict";
import test from "node:test";
import {
  isApplicationStatus,
  isPriority,
  isValidEmail,
  isWorkItemStatus,
} from "./validation";

test("validates customer email addresses", () => {
  assert.equal(isValidEmail("person@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
});

test("validates application and work-item enum values", () => {
  assert.equal(isApplicationStatus("UNDER_REVIEW"), true);
  assert.equal(isApplicationStatus("DONE"), false);
  assert.equal(isPriority("URGENT"), true);
  assert.equal(isPriority("CRITICAL"), false);
  assert.equal(isWorkItemStatus("COMPLETED"), true);
  assert.equal(isWorkItemStatus("FINISHED"), false);
});
