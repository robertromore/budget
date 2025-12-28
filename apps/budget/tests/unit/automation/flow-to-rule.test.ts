/**
 * Flow to Rule Converter Unit Tests
 *
 * Tests for converting SvelteFlow nodes/edges into rule configuration.
 */

import { describe, it, expect } from "bun:test";
import {
  flowToRule,
  validateFlow,
  exportFlowState,
} from "$lib/components/automation/rule-builder/utils/flow-to-rule";
import type { Node, Edge } from "@xyflow/svelte";

// =============================================================================
// Test Helpers
// =============================================================================

function createTriggerNode(
  id: string,
  entityType: string = "transaction",
  event: string = "created"
): Node {
  return {
    id,
    type: "trigger",
    position: { x: 0, y: 0 },
    data: {
      id,
      entityType,
      event,
    },
  };
}

function createConditionNode(
  id: string,
  field: string,
  operator: string,
  value: unknown,
  overrides?: Record<string, unknown>
): Node {
  return {
    id,
    type: "condition",
    position: { x: 0, y: 100 },
    data: {
      id,
      field,
      operator,
      value,
      ...overrides,
    },
  };
}

function createActionNode(
  id: string,
  type: string,
  params: Record<string, unknown> = {}
): Node {
  return {
    id,
    type: "action",
    position: { x: 0, y: 200 },
    data: {
      id,
      type,
      params,
    },
  };
}

function createGroupNode(id: string, operator: "AND" | "OR" = "AND"): Node {
  return {
    id,
    type: "group",
    position: { x: 0, y: 100 },
    data: {
      id,
      operator,
    },
  };
}

function createEdge(source: string, target: string, sourceHandle?: string): Edge {
  return {
    id: `edge-${source}-${target}`,
    source,
    target,
    sourceHandle,
  };
}

// =============================================================================
// flowToRule Tests
// =============================================================================

describe("flowToRule", () => {
  describe("Basic conversion", () => {
    it("should convert a simple trigger → action flow", () => {
      const nodes = [
        createTriggerNode("trigger-1", "transaction", "created"),
        createActionNode("action-1", "setCategory", { categoryId: 5 }),
      ];
      const edges = [createEdge("trigger-1", "action-1")];

      const rule = flowToRule(nodes, edges);

      expect(rule.trigger.entityType).toBe("transaction");
      expect(rule.trigger.event).toBe("created");
      expect(rule.conditions.operator).toBe("AND");
      expect(rule.conditions.conditions).toHaveLength(0);
      expect(rule.actions).toHaveLength(1);
      expect(rule.actions[0].type).toBe("setCategory");
      expect(rule.actions[0].params).toEqual({ categoryId: 5 });
    });

    it("should convert trigger → condition → action flow", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        createConditionNode("condition-1", "amount", "greaterThan", 100),
        createActionNode("action-1", "appendNotes", { text: "Large transaction" }),
      ];
      const edges = [
        createEdge("trigger-1", "condition-1"),
        createEdge("condition-1", "action-1"),
      ];

      const rule = flowToRule(nodes, edges);

      expect(rule.conditions.conditions).toHaveLength(1);
      const condition = rule.conditions.conditions[0];
      expect(condition).toHaveProperty("field", "amount");
      expect(condition).toHaveProperty("operator", "greaterThan");
      expect(condition).toHaveProperty("value", 100);
    });

    it("should throw error when no trigger node exists", () => {
      const nodes = [createActionNode("action-1", "setCategory", {})];
      const edges: Edge[] = [];

      expect(() => flowToRule(nodes, edges)).toThrow("Rule must have a trigger node");
    });
  });

  describe("Multiple conditions", () => {
    it("should handle multiple conditions connected to trigger", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        createConditionNode("condition-1", "amount", "greaterThan", 100),
        createConditionNode("condition-2", "status", "equals", "pending"),
        createActionNode("action-1", "setStatus", { status: "cleared" }),
      ];
      const edges = [
        createEdge("trigger-1", "condition-1"),
        createEdge("trigger-1", "condition-2"),
        createEdge("condition-1", "action-1"),
      ];

      const rule = flowToRule(nodes, edges);

      expect(rule.conditions.conditions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Condition groups", () => {
    it("should handle AND group node", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        createGroupNode("group-1", "AND"),
        createConditionNode("condition-1", "amount", "greaterThan", 100),
        createConditionNode("condition-2", "status", "equals", "pending"),
        createActionNode("action-1", "setCategory", { categoryId: 5 }),
      ];
      const edges = [
        createEdge("trigger-1", "group-1"),
        createEdge("group-1", "condition-1"),
        createEdge("group-1", "condition-2"),
        createEdge("condition-1", "action-1"),
      ];

      const rule = flowToRule(nodes, edges);

      // Should have a nested group
      const nestedGroup = rule.conditions.conditions.find(
        (c) => "operator" in c && c.operator === "AND"
      );
      expect(nestedGroup).toBeDefined();
    });

    it("should handle OR group node", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        createGroupNode("group-1", "OR"),
        createConditionNode("condition-1", "amount", "greaterThan", 500),
        createConditionNode("condition-2", "amount", "lessThan", -500),
        createActionNode("action-1", "appendNotes", { text: "Large transaction" }),
      ];
      const edges = [
        createEdge("trigger-1", "group-1"),
        createEdge("group-1", "condition-1"),
        createEdge("group-1", "condition-2"),
        createEdge("condition-1", "action-1"),
      ];

      const rule = flowToRule(nodes, edges);

      const nestedGroup = rule.conditions.conditions.find(
        (c) => "operator" in c && c.operator === "OR"
      );
      expect(nestedGroup).toBeDefined();
    });
  });

  describe("Multiple actions", () => {
    it("should collect all action nodes", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        createActionNode("action-1", "setCategory", { categoryId: 5 }),
        createActionNode("action-2", "appendNotes", { text: "Auto-categorized" }),
      ];
      const edges = [
        createEdge("trigger-1", "action-1"),
        createEdge("trigger-1", "action-2"),
      ];

      const rule = flowToRule(nodes, edges);

      expect(rule.actions).toHaveLength(2);
      expect(rule.actions.map((a) => a.type)).toContain("setCategory");
      expect(rule.actions.map((a) => a.type)).toContain("appendNotes");
    });
  });

  describe("Condition properties", () => {
    it("should preserve value2 for between operator", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        createConditionNode("condition-1", "amount", "between", 100, { value2: 500 }),
        createActionNode("action-1", "setCategory", { categoryId: 5 }),
      ];
      const edges = [
        createEdge("trigger-1", "condition-1"),
        createEdge("condition-1", "action-1"),
      ];

      const rule = flowToRule(nodes, edges);

      const condition = rule.conditions.conditions[0];
      expect(condition).toHaveProperty("value", 100);
      expect(condition).toHaveProperty("value2", 500);
    });

    it("should preserve negate flag", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        createConditionNode("condition-1", "status", "equals", "cleared", { negate: true }),
        createActionNode("action-1", "setStatus", { status: "pending" }),
      ];
      const edges = [
        createEdge("trigger-1", "condition-1"),
        createEdge("condition-1", "action-1"),
      ];

      const rule = flowToRule(nodes, edges);

      const condition = rule.conditions.conditions[0];
      expect(condition).toHaveProperty("negate", true);
    });
  });

  describe("Action properties", () => {
    it("should preserve continueOnError flag", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        {
          ...createActionNode("action-1", "setCategory", { categoryId: 5 }),
          data: {
            id: "action-1",
            type: "setCategory",
            params: { categoryId: 5 },
            continueOnError: true,
          },
        },
      ];
      const edges = [createEdge("trigger-1", "action-1")];

      const rule = flowToRule(nodes, edges);

      expect(rule.actions[0].continueOnError).toBe(true);
    });
  });

  describe("Trigger properties", () => {
    it("should preserve debounceMs", () => {
      const nodes = [
        {
          ...createTriggerNode("trigger-1"),
          data: {
            id: "trigger-1",
            entityType: "transaction",
            event: "created",
            debounceMs: 1000,
          },
        },
        createActionNode("action-1", "setCategory", { categoryId: 5 }),
      ];
      const edges = [createEdge("trigger-1", "action-1")];

      const rule = flowToRule(nodes, edges);

      expect(rule.trigger.debounceMs).toBe(1000);
    });
  });
});

// =============================================================================
// validateFlow Tests
// =============================================================================

describe("validateFlow", () => {
  describe("Trigger validation", () => {
    it("should return error when no trigger node exists", () => {
      const nodes = [createActionNode("action-1", "setCategory", {})];
      const edges: Edge[] = [];

      const errors = validateFlow(nodes, edges);

      expect(errors).toContain("Rule must have a trigger node");
    });

    it("should return error when multiple trigger nodes exist", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        createTriggerNode("trigger-2"),
        createActionNode("action-1", "setCategory", {}),
      ];
      const edges = [createEdge("trigger-1", "action-1")];

      const errors = validateFlow(nodes, edges);

      expect(errors).toContain("Rule can only have one trigger node");
    });

    it("should return error when trigger has no entity type", () => {
      const nodes = [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 0, y: 0 },
          data: { id: "trigger-1", event: "created" },
        } as Node,
        createActionNode("action-1", "setCategory", {}),
      ];
      const edges = [createEdge("trigger-1", "action-1")];

      const errors = validateFlow(nodes, edges);

      expect(errors).toContain("Trigger must have an entity type");
    });

    it("should return error when trigger has no event", () => {
      const nodes = [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 0, y: 0 },
          data: { id: "trigger-1", entityType: "transaction" },
        } as Node,
        createActionNode("action-1", "setCategory", {}),
      ];
      const edges = [createEdge("trigger-1", "action-1")];

      const errors = validateFlow(nodes, edges);

      expect(errors).toContain("Trigger must have an event");
    });
  });

  describe("Action validation", () => {
    it("should return error when no action nodes exist", () => {
      const nodes = [createTriggerNode("trigger-1")];
      const edges: Edge[] = [];

      const errors = validateFlow(nodes, edges);

      expect(errors).toContain("Rule must have at least one action node");
    });

    it("should return error when action has no type", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        {
          id: "action-1",
          type: "action",
          position: { x: 0, y: 100 },
          data: { id: "action-1", params: {} },
        } as Node,
      ];
      const edges = [createEdge("trigger-1", "action-1")];

      const errors = validateFlow(nodes, edges);

      expect(errors).toContain("Action must have a type");
    });
  });

  describe("Connection validation", () => {
    it("should return error when trigger is not connected", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        createActionNode("action-1", "setCategory", {}),
      ];
      const edges: Edge[] = [];

      const errors = validateFlow(nodes, edges);

      expect(errors).toContain("Trigger must be connected to at least one condition or action");
    });

    it("should return error when action is not reachable from trigger", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        createConditionNode("condition-1", "amount", "greaterThan", 100),
        createActionNode("action-1", "setCategory", {}),
      ];
      const edges = [
        createEdge("trigger-1", "condition-1"),
        // action-1 is not connected
      ];

      const errors = validateFlow(nodes, edges);

      expect(errors.some((e) => e.includes("not connected to the trigger"))).toBe(true);
    });
  });

  describe("Condition validation", () => {
    it("should return error when condition has no field", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        {
          id: "condition-1",
          type: "condition",
          position: { x: 0, y: 100 },
          data: { id: "condition-1", operator: "equals", value: 100 },
        } as Node,
        createActionNode("action-1", "setCategory", {}),
      ];
      const edges = [
        createEdge("trigger-1", "condition-1"),
        createEdge("condition-1", "action-1"),
      ];

      const errors = validateFlow(nodes, edges);

      expect(errors).toContain("Condition must have a field");
    });

    it("should return error when condition has no operator", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        {
          id: "condition-1",
          type: "condition",
          position: { x: 0, y: 100 },
          data: { id: "condition-1", field: "amount", value: 100 },
        } as Node,
        createActionNode("action-1", "setCategory", {}),
      ];
      const edges = [
        createEdge("trigger-1", "condition-1"),
        createEdge("condition-1", "action-1"),
      ];

      const errors = validateFlow(nodes, edges);

      expect(errors).toContain("Condition must have an operator");
    });
  });

  describe("Group validation", () => {
    it("should return error when group has invalid operator", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        {
          id: "group-1",
          type: "group",
          position: { x: 0, y: 100 },
          data: { id: "group-1", operator: "INVALID" },
        } as Node,
        createActionNode("action-1", "setCategory", {}),
      ];
      const edges = [
        createEdge("trigger-1", "group-1"),
        createEdge("group-1", "action-1"),
      ];

      const errors = validateFlow(nodes, edges);

      expect(errors).toContain("Group must have a valid operator (AND/OR)");
    });
  });

  describe("Valid flows", () => {
    it("should return empty array for valid simple flow", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        createActionNode("action-1", "setCategory", { categoryId: 5 }),
      ];
      const edges = [createEdge("trigger-1", "action-1")];

      const errors = validateFlow(nodes, edges);

      expect(errors).toHaveLength(0);
    });

    it("should return empty array for valid complex flow", () => {
      const nodes = [
        createTriggerNode("trigger-1"),
        createConditionNode("condition-1", "amount", "greaterThan", 100),
        createActionNode("action-1", "setCategory", { categoryId: 5 }),
        createActionNode("action-2", "appendNotes", { text: "Large transaction" }),
      ];
      const edges = [
        createEdge("trigger-1", "condition-1"),
        createEdge("condition-1", "action-1"),
        createEdge("condition-1", "action-2"),
      ];

      const errors = validateFlow(nodes, edges);

      expect(errors).toHaveLength(0);
    });
  });
});

// =============================================================================
// exportFlowState Tests
// =============================================================================

describe("exportFlowState", () => {
  it("should export nodes with correct structure", () => {
    const nodes = [
      createTriggerNode("trigger-1"),
      createConditionNode("condition-1", "amount", "greaterThan", 100),
      createActionNode("action-1", "setCategory", { categoryId: 5 }),
    ];
    const edges = [
      createEdge("trigger-1", "condition-1"),
      createEdge("condition-1", "action-1"),
    ];

    const state = exportFlowState(nodes, edges);

    expect(state.nodes).toHaveLength(3);
    state.nodes.forEach((node) => {
      expect(node).toHaveProperty("id");
      expect(node).toHaveProperty("type");
      expect(node).toHaveProperty("position");
      expect(node).toHaveProperty("data");
    });
  });

  it("should export edges with correct structure", () => {
    const nodes = [
      createTriggerNode("trigger-1"),
      createActionNode("action-1", "setCategory", {}),
    ];
    const edges = [createEdge("trigger-1", "action-1")];

    const state = exportFlowState(nodes, edges);

    expect(state.edges).toHaveLength(1);
    expect(state.edges[0]).toHaveProperty("id");
    expect(state.edges[0]).toHaveProperty("source", "trigger-1");
    expect(state.edges[0]).toHaveProperty("target", "action-1");
  });

  it("should include viewport if provided", () => {
    const nodes = [createTriggerNode("trigger-1")];
    const edges: Edge[] = [];
    const viewport = { x: 100, y: 200, zoom: 1.5 };

    const state = exportFlowState(nodes, edges, viewport);

    expect(state.viewport).toEqual(viewport);
  });

  it("should not include viewport if not provided", () => {
    const nodes = [createTriggerNode("trigger-1")];
    const edges: Edge[] = [];

    const state = exportFlowState(nodes, edges);

    expect(state.viewport).toBeUndefined();
  });

  it("should preserve source handles on edges", () => {
    const nodes = [
      createTriggerNode("trigger-1"),
      createGroupNode("group-1", "OR"),
      createConditionNode("condition-1", "amount", "greaterThan", 100),
    ];
    const edges = [
      createEdge("trigger-1", "group-1"),
      { ...createEdge("group-1", "condition-1"), sourceHandle: "out-1" },
    ];

    const state = exportFlowState(nodes, edges);

    const edgeWithHandle = state.edges.find((e) => e.source === "group-1");
    expect(edgeWithHandle?.sourceHandle).toBe("out-1");
  });
});
