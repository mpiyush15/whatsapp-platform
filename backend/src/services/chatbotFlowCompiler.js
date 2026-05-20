const START_NODE_TYPES = new Set(['start']);
const TERMINAL_NODE_TYPES = new Set(['end']);

const normalizeString = (value) => String(value || '').trim();

const normalizeArray = (value) => Array.isArray(value) ? value : [];

const buildEdgeMaps = (edges = []) => {
  const outgoing = new Map();

  edges.forEach((edge) => {
    if (!edge?.source || !edge?.target) return;
    const list = outgoing.get(edge.source) || [];
    list.push(edge);
    outgoing.set(edge.source, list);
  });

  return { outgoing };
};

const getNodeLabel = (node) => normalizeString(node?.data?.label || node?.data?.title || node?.type || 'Step');

const getNextEdge = (edges = []) => {
  return edges.find((edge) => !edge?.sourceHandle || edge.sourceHandle === 'next' || edge.sourceHandle === 'default') || null;
};

const getOptionEdgeMap = (edges = [], prefix) => {
  const optionMap = new Map();
  edges.forEach((edge) => {
    const handle = normalizeString(edge?.sourceHandle);
    if (!handle.startsWith(prefix)) return;
    optionMap.set(handle.slice(prefix.length), edge);
  });
  return optionMap;
};

const compileNodeToStep = (node, outgoingEdges = [], nodeMap) => {
  const nodeType = normalizeString(node?.type).toLowerCase();
  const data = node?.data || {};
  const nodeId = String(node?.id);

  if (START_NODE_TYPES.has(nodeType)) {
    return { step: null, nextTargets: getNextEdge(outgoingEdges)?.target ? [getNextEdge(outgoingEdges).target] : [] };
  }

  if (TERMINAL_NODE_TYPES.has(nodeType)) {
    const terminalText = normalizeString(data.text || data.label);
    const step = terminalText
      ? {
          id: nodeId,
          type: 'text',
          text: terminalText,
          delay: Number(data.delay || 0),
          waitForResponse: false,
        }
      : null;

    return { step, nextTargets: [] };
  }

  const defaultNextTarget = getNextEdge(outgoingEdges)?.target || null;

  if (nodeType === 'message' || nodeType === 'text') {
    return {
      step: {
        id: nodeId,
        type: 'text',
        text: normalizeString(data.text || data.label || getNodeLabel(node)),
        delay: Number(data.delay || 0),
        waitForResponse: false,
      },
      nextTargets: defaultNextTarget ? [defaultNextTarget] : [],
    };
  }

  if (nodeType === 'question') {
    return {
      step: {
        id: nodeId,
        type: 'question',
        text: normalizeString(data.text || data.label || getNodeLabel(node)),
        delay: Number(data.delay || 0),
        saveAs: normalizeString(data.saveAs || data.variableName),
        waitForResponse: true,
      },
      nextTargets: defaultNextTarget ? [defaultNextTarget] : [],
    };
  }

  if (nodeType === 'buttons') {
    const buttonEdges = getOptionEdgeMap(outgoingEdges, 'button:');
    const buttons = normalizeArray(data.buttons).map((button, index) => {
      const buttonId = normalizeString(button?.id || `button-${index + 1}`);
      const targetEdge = buttonEdges.get(buttonId);
      return {
        id: buttonId,
        title: normalizeString(button?.title || `Button ${index + 1}`),
        url: normalizeString(button?.url) || undefined,
        nextStepId: targetEdge?.target || defaultNextTarget || undefined,
      };
    });

    const nextTargets = [defaultNextTarget, ...buttons.map((button) => button.nextStepId)]
      .filter(Boolean);

    return {
      step: {
        id: nodeId,
        type: 'buttons',
        text: normalizeString(data.text || data.label || getNodeLabel(node)),
        delay: Number(data.delay || 0),
        waitForResponse: true,
        buttons,
      },
      nextTargets,
    };
  }

  if (nodeType === 'list') {
    const itemEdges = getOptionEdgeMap(outgoingEdges, 'item:');
    const listItems = normalizeArray(data.items || data.listItems).map((item, index) => {
      const itemId = normalizeString(item?.id || `item-${index + 1}`);
      const targetEdge = itemEdges.get(itemId);
      return {
        id: itemId,
        title: normalizeString(item?.title || `Item ${index + 1}`),
        description: normalizeString(item?.description) || undefined,
        nextStepId: targetEdge?.target || defaultNextTarget || undefined,
      };
    });

    const nextTargets = [defaultNextTarget, ...listItems.map((item) => item.nextStepId)]
      .filter(Boolean);

    return {
      step: {
        id: nodeId,
        type: 'list',
        text: normalizeString(data.text || data.label || getNodeLabel(node)),
        delay: Number(data.delay || 0),
        waitForResponse: true,
        listItems,
      },
      nextTargets,
    };
  }

  if (nodeType === 'vertical_action') {
    const actionConfig = (data.actionConfig && typeof data.actionConfig === 'object') ? data.actionConfig : {};
    return {
      step: {
        id: nodeId,
        type: 'vertical_action',
        text: normalizeString(data.text || data.label || getNodeLabel(node)),
        delay: Number(data.delay || 0),
        waitForResponse: false,
        vertical: normalizeString(data.vertical || 'whatsapp').toLowerCase(),
        action: normalizeString(data.action),
        actionConfig,
      },
      nextTargets: defaultNextTarget ? [defaultNextTarget] : [],
    };
  }

  if (nodeType === 'condition') {
    const branchEdges = getOptionEdgeMap(outgoingEdges, 'branch:');
    const branches = normalizeArray(data.branches).map((branch, index) => {
      const branchKey = normalizeString(branch?.id || branch?.value || `branch-${index + 1}`);
      const targetEdge = branchEdges.get(branchKey);
      return {
        value: normalizeString(branch?.value ?? branchKey),
        nextStepId: targetEdge?.target || undefined,
      };
    });

    return {
      step: {
        id: nodeId,
        type: 'condition',
        text: normalizeString(data.text || data.label || 'Condition'),
        delay: Number(data.delay || 0),
        waitForResponse: false,
        condition: {
          variable: normalizeString(data.variable || data.saveAs),
          branches,
          defaultNextStepId: defaultNextTarget || undefined,
        },
      },
      nextTargets: [defaultNextTarget, ...branches.map((b) => b.nextStepId)].filter(Boolean),
    };
  }

  // Unknown nodes are ignored but traversal continues through default edge.
  return {
    step: null,
    nextTargets: defaultNextTarget ? [defaultNextTarget] : [],
  };
};

export const compileFlowGraph = (flowGraph = {}) => {
  const nodes = normalizeArray(flowGraph?.nodes);
  const edges = normalizeArray(flowGraph?.edges);

  if (nodes.length === 0) {
    return [];
  }

  const nodeMap = new Map(nodes.map((node) => [String(node.id), node]));
  const { outgoing } = buildEdgeMaps(edges);
  const startNode = nodes.find((node) => START_NODE_TYPES.has(normalizeString(node?.type).toLowerCase())) || nodes[0];

  const visited = new Set();
  const orderedSteps = [];

  const walk = (nodeId) => {
    const normalizedNodeId = String(nodeId || '');
    if (!normalizedNodeId || visited.has(normalizedNodeId)) return;
    const node = nodeMap.get(normalizedNodeId);
    if (!node) return;

    visited.add(normalizedNodeId);

    const { step, nextTargets } = compileNodeToStep(node, outgoing.get(normalizedNodeId) || [], nodeMap);
    if (step) {
      orderedSteps.push(step);
    }

    nextTargets.forEach((targetId) => walk(targetId));
  };

  walk(startNode.id);

  // Include any disconnected nodes after reachable set so data is not silently dropped.
  nodes.forEach((node) => {
    if (!visited.has(String(node.id))) {
      walk(node.id);
    }
  });

  return orderedSteps;
};

export default {
  compileFlowGraph,
};
