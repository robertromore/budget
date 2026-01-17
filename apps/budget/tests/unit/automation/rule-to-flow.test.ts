/**
 * Rule to Flow Converter Unit Tests
 *
 * Tests for converting rule configuration into SvelteFlow nodes and edges.
 */

import { describe, it, expect } from "vitest";
import {
  ruleToFlow,
  createDefaultFlow,
  importFlowState,
  applyLayout,
  autoLayout,
  type LayoutDirection,
} from "$lib/components/automation/rule-builder/utils/rule-to-flow";
import type {
  TriggerConfig,
  ConditionGroup,
  ActionConfig,
  FlowState,
  EntityType,
} from "$lib/types/automation";

// =============================================================================
// Test Helpers
// =============================================================================

interface RuleConfig {
  trigger: TriggerConfig;
  conditions: ConditionGroup;
  actions: ActionConfig[];
}

function createSimpleRule(entityType: EntityType = "transaction"): RuleConfig {
  return {
    trigger: {
      entityType,
      event: "created",
    },
    conditions: {
      id: "group-root",
      operator: "AND",
      conditions: [],
    },
    actions: [
      {
        id: "action-1",
        type: "setCategory",
        params: { categoryId: 5 },
      },
    ],
  };
}

function createRuleWithConditions(): RuleConfig {
  return {
    trigger: {
      entityType: "transaction",
      event: "created",
    },
    conditions: {
      id: "group-root",
      operator: "AND",
      conditions: [
        {
          id: "condition-1",
          field: "amount",
          operator: "greaterThan",
          value: 100,
        },
        {
          id: "condition-2",
          field: "status",
          operator: "equals",
          value: "pending",
        },
      ],
    },
    actions: [
      {
        id: "action-1",
        type: "setStatus",
        params: { status: "cleared" },
      },
    ],
  };
}

function createRuleWithNestedGroups(): RuleConfig {
  return {
    trigger: {
      entityType: "transaction",
      event: "created",
    },
    conditions: {
      id: "group-root",
      operator: "AND",
      conditions: [
        {
          id: "condition-1",
          field: "amount",
          operator: "greaterThan",
          value: 100,
        },
        {
          id: "group-nested",
          operator: "OR",
          conditions: [
            {
              id: "condition-2",
              field: "status",
              operator: "equals",
              value: "pending",
            },
            {
              id: "condition-3",
              field: "status",
              operator: "equals",
              value: "scheduled",
            },
          ],
        },
      ],
    },
    actions: [
      {
        id: "action-1",
        type: "setCategory",
        params: { categoryId: 5 },
      },
    ],
  };
}

// =============================================================================
// ruleToFlow Tests
// =============================================================================

describe("ruleToFlow", () => {
  describe("Basic conversion", () => {
    it("should create trigger node for simple rule", () => {
      const rule = createSimpleRule();
      const { nodes, edges } = ruleToFlow(rule);

      const triggerNode = nodes.find((n) => n.type === "trigger");
      expect(triggerNode).toBeDefined();
      expect(triggerNode?.data.entityType).toBe("transaction");
      expect(triggerNode?.data.event).toBe("created");
    });

    it("should create action node for simple rule", () => {
      const rule = createSimpleRule();
      const { nodes } = ruleToFlow(rule);

      const actionNode = nodes.find((n) => n.type === "action");
      expect(actionNode).toBeDefined();
      expect(actionNode?.data.type).toBe("setCategory");
      expect(actionNode?.data.params).toEqual({ categoryId: 5 });
    });

    it("should create edge from trigger to action for simple rule", () => {
      const rule = createSimpleRule();
      const { nodes, edges } = ruleToFlow(rule);

      const triggerNode = nodes.find((n) => n.type === "trigger");
      const actionNode = nodes.find((n) => n.type === "action");

      const edge = edges.find(
        (e) => e.source === triggerNode?.id && e.target === actionNode?.id
      );
      expect(edge).toBeDefined();
    });
  });

  describe("Conditions", () => {
    it("should create condition nodes", () => {
      const rule = createRuleWithConditions();
      const { nodes } = ruleToFlow(rule);

      const conditionNodes = nodes.filter((n) => n.type === "condition");
      // May have group node instead of individual conditions for multiple
      expect(conditionNodes.length + nodes.filter((n) => n.type === "group").length).toBeGreaterThan(0);
    });

    it("should preserve condition properties", () => {
      const rule: RuleConfig = {
        trigger: { entityType: "transaction", event: "created" },
        conditions: {
          id: "group-root",
          operator: "AND",
          conditions: [
            {
              id: "condition-1",
              field: "amount",
              operator: "between",
              value: 100,
              value2: 500,
              negate: true,
            },
          ],
        },
        actions: [{ id: "action-1", type: "setCategory", params: { categoryId: 5 } }],
      };

      const { nodes } = ruleToFlow(rule);
      const conditionNode = nodes.find((n) => n.type === "condition");

      expect(conditionNode?.data.value).toBe(100);
      expect(conditionNode?.data.value2).toBe(500);
      expect(conditionNode?.data.negate).toBe(true);
    });

    it("should handle single condition without creating group", () => {
      const rule: RuleConfig = {
        trigger: { entityType: "transaction", event: "created" },
        conditions: {
          id: "group-root",
          operator: "AND",
          conditions: [
            {
              id: "condition-1",
              field: "amount",
              operator: "greaterThan",
              value: 100,
            },
          ],
        },
        actions: [{ id: "action-1", type: "setCategory", params: {} }],
      };

      const { nodes } = ruleToFlow(rule);

      const conditionNode = nodes.find((n) => n.type === "condition");
      expect(conditionNode).toBeDefined();
    });
  });

  describe("Nested groups", () => {
    it("should create group nodes for nested conditions", () => {
      const rule = createRuleWithNestedGroups();
      const { nodes } = ruleToFlow(rule);

      const groupNodes = nodes.filter((n) => n.type === "group");
      expect(groupNodes.length).toBeGreaterThan(0);
    });

    it("should preserve group operator", () => {
      const rule = createRuleWithNestedGroups();
      const { nodes } = ruleToFlow(rule);

      const groupNode = nodes.find(
        (n) => n.type === "group" && n.data.operator === "OR"
      );
      expect(groupNode).toBeDefined();
    });
  });

  describe("Multiple actions", () => {
    it("should create multiple action nodes", () => {
      const rule: RuleConfig = {
        trigger: { entityType: "transaction", event: "created" },
        conditions: { id: "group-root", operator: "AND", conditions: [] },
        actions: [
          { id: "action-1", type: "setCategory", params: { categoryId: 5 } },
          { id: "action-2", type: "appendNotes", params: { text: "Auto-categorized" } },
        ],
      };

      const { nodes } = ruleToFlow(rule);

      const actionNodes = nodes.filter((n) => n.type === "action");
      expect(actionNodes).toHaveLength(2);
    });

    it("should position multiple actions horizontally", () => {
      const rule: RuleConfig = {
        trigger: { entityType: "transaction", event: "created" },
        conditions: { id: "group-root", operator: "AND", conditions: [] },
        actions: [
          { id: "action-1", type: "setCategory", params: {} },
          { id: "action-2", type: "appendNotes", params: {} },
        ],
      };

      const { nodes } = ruleToFlow(rule);

      const actionNodes = nodes.filter((n) => n.type === "action");
      // Check that actions are at the same Y position but different X
      expect(actionNodes[0].position.y).toBe(actionNodes[1].position.y);
      expect(actionNodes[0].position.x).not.toBe(actionNodes[1].position.x);
    });
  });

  describe("Entity type context", () => {
    it("should pass entity type to action nodes", () => {
      const rule = createSimpleRule("account");
      const { nodes } = ruleToFlow(rule);

      const actionNode = nodes.find((n) => n.type === "action");
      expect(actionNode?.data.entityType).toBe("account");
    });

    it("should pass entity type to condition nodes", () => {
      const rule: RuleConfig = {
        trigger: { entityType: "payee", event: "created" },
        conditions: {
          id: "group-root",
          operator: "AND",
          conditions: [
            { id: "condition-1", field: "name", operator: "contains", value: "Amazon" },
          ],
        },
        actions: [{ id: "action-1", type: "setPayeeDefaultCategory", params: {} }],
      };

      const { nodes } = ruleToFlow(rule);

      const conditionNode = nodes.find((n) => n.type === "condition");
      expect(conditionNode?.data.entityType).toBe("payee");
    });
  });
});

// =============================================================================
// createDefaultFlow Tests
// =============================================================================

describe("createDefaultFlow", () => {
  it("should create trigger, condition, and action nodes", () => {
    const { nodes } = createDefaultFlow();

    expect(nodes.find((n) => n.type === "trigger")).toBeDefined();
    expect(nodes.find((n) => n.type === "condition")).toBeDefined();
    expect(nodes.find((n) => n.type === "action")).toBeDefined();
  });

  it("should create edges connecting all nodes", () => {
    const { nodes, edges } = createDefaultFlow();

    expect(edges).toHaveLength(2);

    const triggerId = nodes.find((n) => n.type === "trigger")?.id;
    const conditionId = nodes.find((n) => n.type === "condition")?.id;
    const actionId = nodes.find((n) => n.type === "action")?.id;

    expect(edges.find((e) => e.source === triggerId && e.target === conditionId)).toBeDefined();
    expect(edges.find((e) => e.source === conditionId && e.target === actionId)).toBeDefined();
  });

  it("should use provided entity type", () => {
    const { nodes } = createDefaultFlow("account");

    const triggerNode = nodes.find((n) => n.type === "trigger");
    expect(triggerNode?.data.entityType).toBe("account");
  });

  it("should default to transaction entity type", () => {
    const { nodes } = createDefaultFlow();

    const triggerNode = nodes.find((n) => n.type === "trigger");
    expect(triggerNode?.data.entityType).toBe("transaction");
  });

  it("should have empty event on trigger", () => {
    const { nodes } = createDefaultFlow();

    const triggerNode = nodes.find((n) => n.type === "trigger");
    expect(triggerNode?.data.event).toBe("");
  });

  it("should have empty field on condition", () => {
    const { nodes } = createDefaultFlow();

    const conditionNode = nodes.find((n) => n.type === "condition");
    expect(conditionNode?.data.field).toBe("");
  });

  it("should have empty type on action", () => {
    const { nodes } = createDefaultFlow();

    const actionNode = nodes.find((n) => n.type === "action");
    expect(actionNode?.data.type).toBe("");
  });
});

// =============================================================================
// importFlowState Tests
// =============================================================================

describe("importFlowState", () => {
  it("should return empty arrays for null input", () => {
    const result = importFlowState(null, "transaction");

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("should return empty arrays for undefined input", () => {
    const result = importFlowState(undefined, "transaction");

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("should restore nodes from flow state", () => {
    const flowState: FlowState = {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 100, y: 50 },
          data: { entityType: "transaction", event: "created" },
        },
        {
          id: "action-1",
          type: "action",
          position: { x: 100, y: 200 },
          data: { type: "setCategory", params: { categoryId: 5 } },
        },
      ],
      edges: [
        { id: "edge-1", source: "trigger-1", target: "action-1" },
      ],
    };

    const result = importFlowState(flowState, "transaction");

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });

  it("should restore node positions", () => {
    const flowState: FlowState = {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 150, y: 75 },
          data: { entityType: "transaction", event: "created" },
        },
      ],
      edges: [],
    };

    const result = importFlowState(flowState, "transaction");

    expect(result.nodes[0].position).toEqual({ x: 150, y: 75 });
  });

  it("should inject entity type context into condition nodes", () => {
    const flowState: FlowState = {
      nodes: [
        {
          id: "condition-1",
          type: "condition",
          position: { x: 100, y: 100 },
          data: { field: "amount", operator: "greaterThan", value: 100 },
        },
      ],
      edges: [],
    };

    const result = importFlowState(flowState, "account");

    expect(result.nodes[0].data.entityType).toBe("account");
  });

  it("should inject entity type context into action nodes", () => {
    const flowState: FlowState = {
      nodes: [
        {
          id: "action-1",
          type: "action",
          position: { x: 100, y: 100 },
          data: { type: "setCategory", params: {} },
        },
      ],
      edges: [],
    };

    const result = importFlowState(flowState, "payee");

    expect(result.nodes[0].data.entityType).toBe("payee");
  });

  it("should restore edge handles", () => {
    const flowState: FlowState = {
      nodes: [
        { id: "group-1", type: "group", position: { x: 0, y: 0 }, data: { operator: "OR" } },
        { id: "condition-1", type: "condition", position: { x: 0, y: 100 }, data: {} },
      ],
      edges: [
        { id: "edge-1", source: "group-1", target: "condition-1", sourceHandle: "out-1" },
      ],
    };

    const result = importFlowState(flowState, "transaction");

    expect(result.edges[0].sourceHandle).toBe("out-1");
  });
});

// =============================================================================
// Layout Tests
// =============================================================================

describe("Layout Functions", () => {
  const createTestNodes = () => {
    const { nodes, edges } = createDefaultFlow();
    return { nodes, edges };
  };

  describe("applyLayout", () => {
    it("should apply vertical layout", () => {
      const { nodes, edges } = createTestNodes();
      const layoutedNodes = applyLayout(nodes, edges, "vertical");

      // Trigger should be at top
      const triggerNode = layoutedNodes.find((n) => n.type === "trigger");
      const conditionNode = layoutedNodes.find((n) => n.type === "condition");
      const actionNode = layoutedNodes.find((n) => n.type === "action");

      expect(triggerNode!.position.y).toBeLessThan(conditionNode!.position.y);
      expect(conditionNode!.position.y).toBeLessThan(actionNode!.position.y);
    });

    it("should apply horizontal layout", () => {
      const { nodes, edges } = createTestNodes();
      const layoutedNodes = applyLayout(nodes, edges, "horizontal");

      const triggerNode = layoutedNodes.find((n) => n.type === "trigger");
      const conditionNode = layoutedNodes.find((n) => n.type === "condition");
      const actionNode = layoutedNodes.find((n) => n.type === "action");

      expect(triggerNode!.position.x).toBeLessThan(conditionNode!.position.x);
      expect(conditionNode!.position.x).toBeLessThan(actionNode!.position.x);
    });

    it("should apply tree layout", () => {
      const { nodes, edges } = createTestNodes();
      const layoutedNodes = applyLayout(nodes, edges, "tree");

      // Should return nodes with positions
      expect(layoutedNodes).toHaveLength(3);
      layoutedNodes.forEach((node) => {
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe("number");
        expect(typeof node.position.y).toBe("number");
      });
    });

    it("should apply compact layout", () => {
      const { nodes, edges } = createTestNodes();
      const layoutedNodes = applyLayout(nodes, edges, "compact");

      // Compact should have tighter spacing than vertical
      const verticalNodes = applyLayout(nodes, edges, "vertical");

      const compactYSpacing = getYSpacing(layoutedNodes);
      const verticalYSpacing = getYSpacing(verticalNodes);

      // Compact spacing should be smaller or equal
      expect(compactYSpacing).toBeLessThanOrEqual(verticalYSpacing);
    });

    it("should handle empty nodes array", () => {
      const layoutedNodes = applyLayout([], [], "vertical");
      expect(layoutedNodes).toHaveLength(0);
    });

    it("should handle nodes without trigger", () => {
      const nodes = [
        {
          id: "action-1",
          type: "action" as const,
          position: { x: 0, y: 0 },
          data: { type: "setCategory", params: {} },
        },
      ];
      const layoutedNodes = applyLayout(nodes, [], "vertical");

      // Should return original nodes unchanged
      expect(layoutedNodes).toHaveLength(1);
    });
  });

  describe("autoLayout (deprecated)", () => {
    it("should apply horizontal layout", () => {
      const { nodes, edges } = createTestNodes();
      const layoutedNodes = autoLayout(nodes, edges);

      const triggerNode = layoutedNodes.find((n) => n.type === "trigger");
      const conditionNode = layoutedNodes.find((n) => n.type === "condition");

      // autoLayout uses horizontal, so X should increase
      expect(triggerNode!.position.x).toBeLessThan(conditionNode!.position.x);
    });
  });
});

// =============================================================================
// Helper Functions
// =============================================================================

function getYSpacing(nodes: { position: { y: number }; type?: string }[]): number {
  const triggerNode = nodes.find((n) => n.type === "trigger");
  const conditionNode = nodes.find((n) => n.type === "condition");

  if (!triggerNode || !conditionNode) return 0;
  return conditionNode.position.y - triggerNode.position.y;
}
