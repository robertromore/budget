<!--
  Rule Builder Visual

  Visual node-based editor for creating and editing automation rules.
  Uses SvelteFlow for the drag-and-drop interface.

  This component is extracted from the main rule-builder for use with
  the tabbed interface that includes both visual and natural language views.
-->
<script lang="ts">
	import {
	  Background,
	  Controls,
	  MiniMap,
	  SvelteFlow,
	  addEdge,
	  type Connection,
	  type Edge,
	  type Node,
	  type Viewport,
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import type { EntityType, FlowState } from '$lib/types/automation';
	import { cn } from '$lib/utils';
	import { nanoid } from 'nanoid';
	import { nodeTypes } from './nodes';
	import AutoLayoutControl from './panels/auto-layout-control.svelte';
	import NodePalette from './panels/node-palette.svelte';
	import PropertiesPanel from './panels/properties-panel.svelte';
	import {
	  createDefaultFlow,
	  exportFlowState,
	  flowToRule,
	  importFlowState,
	  ruleToFlow,
	  validateFlow,
	  type RuleConfig,
	} from './utils';

	interface Props {
		/** Initial flow state to load (takes precedence over ruleConfig) */
		initialFlowState?: FlowState | null;
		/** Rule config to initialize from (used if no initialFlowState) */
		ruleConfig?: RuleConfig | null;
		/** Entity type for new nodes */
		entityType?: EntityType;
		/** Whether the editor is read-only */
		readonly?: boolean;
		/** Compact mode - hides minimap for use in sheets/dialogs */
		compact?: boolean;
		/** Called when flow changes (nodes/edges updated) */
		onFlowChange?: (flowState: FlowState, ruleConfig: RuleConfig) => void;
		/** Called on explicit save action */
		onSave?: (flowState: FlowState, ruleConfig: RuleConfig) => void;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		initialFlowState = null,
		ruleConfig: initialRuleConfig = null,
		entityType = 'transaction',
		readonly = false,
		compact = false,
		onFlowChange,
		onSave,
		class: className,
	}: Props = $props();

	// Flow state - using $state for reactive binding with SvelteFlow
	let nodes = $state<Node[]>([]);
	let edges = $state<Edge[]>([]);
	let viewport = $state<Viewport>({ x: 0, y: 0, zoom: 1 });
	let selectedNodeId = $state<string | null>(null);

	// Validation
	let validationErrors = $state<string[]>([]);

	// Track initialization to prevent double-loading
	let isInitialized = $state(false);

	// Add onUpdate callbacks to nodes loaded from external sources
	function attachUpdateCallbacks(loadedNodes: Node[]): Node[] {
		return loadedNodes.map((n) => ({
			...n,
			data: {
				...n.data,
				onUpdate: (newData: Record<string, unknown>) => updateNodeData(n.id, newData),
			},
		}));
	}

	// Initialize flow from initial state, rule config, or create default
	$effect(() => {
		if (isInitialized) return;

		if (initialRuleConfig) {
			// Find the trigger node ID from saved flow state to preserve position mapping
			const savedTriggerId = initialFlowState?.nodes?.find(n => n.type === 'trigger')?.id;

			// Always use ruleConfig as source of truth for conditions/actions
			// Pass triggerId so the generated node can match saved positions
			const flow = ruleToFlow(initialRuleConfig, { triggerId: savedTriggerId });

			// If we have a saved flow state, try to preserve node positions
			if (initialFlowState?.nodes?.length) {
				const positionMap = new Map(
					initialFlowState.nodes.map((n) => [n.id, n.position])
				);
				// Apply saved positions to matching nodes
				flow.nodes = flow.nodes.map((node) => {
					const savedPosition = positionMap.get(node.id);
					return savedPosition ? { ...node, position: savedPosition } : node;
				});
			}

			nodes = attachUpdateCallbacks(flow.nodes);
			edges = flow.edges;

			if (initialFlowState?.viewport) {
				viewport = initialFlowState.viewport;
			}
		} else if (initialFlowState) {
			// Fallback: use flow state directly if no rule config
			const imported = importFlowState(initialFlowState, entityType);
			nodes = attachUpdateCallbacks(imported.nodes);
			edges = imported.edges;
			if (initialFlowState.viewport) {
				viewport = initialFlowState.viewport;
			}
		} else {
			const defaultFlow = createDefaultFlow(entityType);
			nodes = attachUpdateCallbacks(defaultFlow.nodes);
			edges = defaultFlow.edges;
		}

		isInitialized = true;
	});

	// Get selected node - track from nodes array
	const selectedNode = $derived(nodes.find((n) => n.selected) || null);

	// Update selectedNodeId when selection changes
	$effect(() => {
		const selected = nodes.find((n) => n.selected);
		selectedNodeId = selected?.id || null;
	});

	// Check if trigger exists
	const hasTrigger = $derived(nodes.some((n) => n.type === 'trigger'));

	// Watch for node/edge changes and notify parent
	let prevNodesLength = $state(0);
	let prevEdgesLength = $state(0);

	$effect(() => {
		// Track meaningful changes (not just initial load)
		if (nodes.length !== prevNodesLength || edges.length !== prevEdgesLength) {
			prevNodesLength = nodes.length;
			prevEdgesLength = edges.length;
			notifyChange();
		}
	});

	// Handle new connections
	function onConnect(connection: Connection) {
		edges = addEdge(
			{
				...connection,
				id: `edge-${nanoid(6)}`,
			},
			edges
		);
		notifyChange();
	}

	// Add a new node
	function addNode(type: 'trigger' | 'condition' | 'action' | 'group') {
		const id = `${type}-${nanoid(6)}`;
		const position = {
			x: 400 + Math.random() * 100 - 50,
			y: 200 + nodes.length * 100,
		};

		let data: Record<string, unknown> = { id };

		switch (type) {
			case 'trigger':
				data = {
					id,
					entityType,
					event: '',
					onUpdate: (newData: Record<string, unknown>) => updateNodeData(id, newData),
				};
				break;
			case 'condition':
				data = {
					id,
					entityType,
					field: '',
					operator: 'equals',
					value: '',
					onUpdate: (newData: Record<string, unknown>) => updateNodeData(id, newData),
				};
				break;
			case 'action':
				data = {
					id,
					entityType,
					type: '',
					params: {},
					onUpdate: (newData: Record<string, unknown>) => updateNodeData(id, newData),
				};
				break;
			case 'group':
				data = {
					id,
					operator: 'AND',
					onUpdate: (newData: Record<string, unknown>) => updateNodeData(id, newData),
				};
				break;
		}

		nodes = [
			...nodes,
			{
				id,
				type,
				position,
				data,
			},
		];

		selectedNodeId = id;
		notifyChange();
	}

	// Update node data
	function updateNodeData(nodeId: string, newData: Record<string, unknown>) {
		nodes = nodes.map((n) =>
			n.id === nodeId
				? {
						...n,
						data: {
							...n.data, // Preserve existing data (like entityType)
							...newData, // Merge with new data
							onUpdate: (data: Record<string, unknown>) => updateNodeData(nodeId, data),
						},
					}
				: n
		);
		notifyChange();
	}

	// Delete a node
	function deleteNode(nodeId: string) {
		nodes = nodes.filter((n) => n.id !== nodeId);
		edges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
		if (selectedNodeId === nodeId) {
			selectedNodeId = null;
		}
		notifyChange();
	}

	// Duplicate a node
	function duplicateNode(nodeId: string) {
		const node = nodes.find((n) => n.id === nodeId);
		if (!node) return;

		const newId = `${node.type}-${nanoid(6)}`;

		// Deep clone data to avoid shared references (excluding onUpdate callback)
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { onUpdate, ...dataWithoutCallback } = node.data;
		const clonedData = JSON.parse(JSON.stringify(dataWithoutCallback));

		// Create a fresh node with only the essential properties
		// Don't spread ...node as it includes internal SvelteFlow state
		const newNode: Node = {
			id: newId,
			type: node.type,
			position: {
				x: node.position.x + 50,
				y: node.position.y + 50,
			},
			data: {
				...clonedData,
				id: newId,
				onUpdate: (data: Record<string, unknown>) => updateNodeData(newId, data),
			},
		};

		nodes = [...nodes, newNode];
		selectedNodeId = newId;
		notifyChange();
	}

	// Handle drop from palette
	function onDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();

		const type = event.dataTransfer?.getData('application/reactflow') as
			| 'trigger'
			| 'condition'
			| 'action'
			| 'group'
			| undefined;

		if (!type) return;

		addNode(type);
	}

	// Notify parent of changes
	function notifyChange() {
		validationErrors = validateFlow(nodes, edges);

		if (onFlowChange) {
			const flowState = exportFlowState(nodes, edges, viewport);
			try {
				const ruleConfig = flowToRule(nodes, edges);
				onFlowChange(flowState, ruleConfig);
			} catch {
				// Flow might not be valid yet (e.g., missing trigger)
				// Just send the flow state without rule config
			}
		}
	}

	// Save the rule
	export function save() {
		const errors = validateFlow(nodes, edges);
		if (errors.length > 0) {
			validationErrors = errors;
			return { success: false, errors };
		}

		const flowState = exportFlowState(nodes, edges, viewport);
		const ruleConfig = flowToRule(nodes, edges);

		onSave?.(flowState, ruleConfig);
		return { success: true, flowState, ruleConfig };
	}

	// Get current flow state
	export function getFlowState(): FlowState {
		return exportFlowState(nodes, edges, viewport);
	}

	// Get current rule config (may throw if flow is invalid)
	export function getRuleConfig(): RuleConfig {
		return flowToRule(nodes, edges);
	}

	// Get validation errors
	export function getValidationErrors(): string[] {
		return validateFlow(nodes, edges);
	}

	// Update flow from external RuleConfig (used when NL builder makes changes)
	export function updateFromRuleConfig(newRuleConfig: RuleConfig) {
		// Preserve the existing trigger ID to maintain node positions
		const existingTriggerId = nodes.find(n => n.type === 'trigger')?.id;
		const flow = ruleToFlow(newRuleConfig, { triggerId: existingTriggerId });

		// Preserve existing positions for matching nodes
		const positionMap = new Map(nodes.map(n => [n.id, n.position]));
		flow.nodes = flow.nodes.map(node => {
			const savedPosition = positionMap.get(node.id);
			return savedPosition ? { ...node, position: savedPosition } : node;
		});

		nodes = attachUpdateCallbacks(flow.nodes);
		edges = flow.edges;
	}
</script>

<div class={cn('flex flex-col gap-4', className)}>
	<!-- Top Panel: Node Palette & Properties side by side -->
	{#if !readonly}
		<div class="flex gap-4">
			<div class="flex-1">
				<NodePalette {entityType} onAddNode={addNode} {hasTrigger} />
			</div>
			<div class="flex-1">
				<PropertiesPanel
					{selectedNode}
					{entityType}
					onDeleteNode={deleteNode}
					onDuplicateNode={duplicateNode}
					onUpdateNodeData={updateNodeData}
				/>
			</div>
		</div>
	{/if}

	<!-- Flow Canvas -->
	<div
		class="h-80 overflow-hidden rounded-lg border bg-muted/20"
		ondragover={onDragOver}
		ondrop={onDrop}
		role="application"
		aria-label="Rule builder canvas"
	>
		<SvelteFlow
			bind:nodes
			bind:edges
			{nodeTypes}
			onconnect={onConnect}
			fitView
			fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
			snapGrid={[20, 20]}
			deleteKey={readonly ? null : 'Delete'}
			nodesDraggable={!readonly}
			nodesConnectable={!readonly}
			elementsSelectable={!readonly}
		>
			<Background />
			<Controls>
				{#if !readonly}
					<AutoLayoutControl />
				{/if}
			</Controls>
			{#if !compact}
				<MiniMap position="top-right" />
			{/if}
		</SvelteFlow>
	</div>

	<!-- Validation Errors -->
	{#if !readonly && validationErrors.length > 0}
		<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
			<h4 class="mb-2 text-sm font-medium text-destructive">Validation Errors</h4>
			<ul class="space-y-1 text-xs text-destructive">
				{#each validationErrors as error, i (i)}
					<li>{error}</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
