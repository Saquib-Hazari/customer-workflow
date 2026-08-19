import assert from "node:assert/strict";
import test from "node:test";
import { canManageApplication, canManageWorkItem } from "./permissions";

const manager = { id: "manager", role: "MANAGER" as const, teamId: "team-a" };
const executive = {
  id: "executive",
  role: "EXECUTIVE" as const,
  teamId: "team-a",
};

test("executives can manage only records assigned to them", () => {
  assert.equal(
    canManageApplication(executive, { assignedToId: "executive" }),
    true,
  );
  assert.equal(canManageApplication(executive, { assignedToId: null }), false);
  assert.equal(canManageWorkItem(executive, { assignedToId: "other" }), false);
});

test("managers can manage records in their team", () => {
  assert.equal(canManageApplication(manager, { teamId: "team-a" }), true);
  assert.equal(canManageWorkItem(manager, { teamId: "team-b" }), false);
});
