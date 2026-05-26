"use client"

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import {
  addEdge,
  Background,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  MiniMap,
  type Node,
  type NodeProps,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "reactflow"
import "reactflow/dist/style.css"
import Link from "next/link"
import {
  AlertCircle,
  Bot,
  GitBranch,
  List,
  MessageSquare,
  Plus,
  Save,
  Settings2,
  TimerReset,
  Trash2,
  Users,
} from "lucide-react"
import { authService } from "@/lib/auth"
import { useFlowBuilder } from "@/lib/context/FlowBuilderContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

type MatchType = "exact" | "contains" | "starts_with"
type FlowNodeType = "start" | "message" | "question" | "buttons" | "list" | "condition" | "end" | "vertical_action"

type ConditionBranch = {
  id: string
  value: string
}

type ButtonOption = {
  id: string
  title: string
  url?: string
}

type ListOption = {
  id: string
  title: string
  description?: string
}

type FlowNodeData = {
  label: string
  text?: string
  delay?: number
  saveAs?: string
  buttons?: ButtonOption[]
  items?: ListOption[]
  // Vertical action fields
  vertical?: string
  action?: string
  actionConfig?: Record<string, string>
  variable?: string
  branches?: ConditionBranch[]
}

// ── Vertical Action Registry ───────────────────────────────────────────────
// Add new verticals here — Flow Builder picks them up automatically
export const VERTICAL_ACTION_REGISTRY: Record<string, { label: string; color: string; actions: { id: string; label: string; description: string; configFields: { key: string; label: string; placeholder?: string }[] }[] }> = {
  healthcare: {
    label: 'Healthcare',
    color: 'teal',
    actions: [
      {
        id: 'book_appointment',
        label: 'Book Appointment',
        description: 'Creates an appointment record for the patient in the healthcare system',
        configFields: [
          { key: 'patientNameVar', label: 'Patient Name Variable', placeholder: 'e.g. {{patient_name}}' },
          { key: 'doctorId', label: 'Doctor ID or Variable', placeholder: 'Optional: dr_001 or {{doctor_id}}' },
          { key: 'dateVar', label: 'Date Variable', placeholder: 'e.g. {{appointment_date}} or 28/05/2026' },
          { key: 'timeVar', label: 'Time Variable', placeholder: 'e.g. {{appointment_time}} or 10:30' },
          { key: 'slotVar', label: 'Slot Variable', placeholder: 'Optional: {{selected_slot}} from check_slot' },
          { key: 'slotsVar', label: 'Saved Slots Variable', placeholder: 'available_slots' },
          { key: 'durationMinutes', label: 'Duration Minutes', placeholder: '30' },
          { key: 'visitType', label: 'Visit Type', placeholder: 'consultation / follow-up / procedure' },
        ],
      },
      {
        id: 'lookup_patient',
        label: 'Lookup Patient (WhatsApp)',
        description: 'Checks if the contact exists in patients DB and sets patient_exists / patientName',
        configFields: [],
      },
      {
        id: 'create_patient',
        label: 'Create / Find Patient',
        description: 'Finds existing patient by phone or creates a new patient record',
        configFields: [
          { key: 'nameVar', label: 'Name Variable', placeholder: 'e.g. {{patient_name}}' },
          { key: 'phoneVar', label: 'Phone Variable', placeholder: 'e.g. {{contact_phone}}' },
        ],
      },
      {
        id: 'check_slot',
        label: 'Check Available Slots',
        description: 'Fetches available appointment slots and returns them as a list',
        configFields: [
          { key: 'doctorId', label: 'Doctor ID or Variable', placeholder: 'e.g. dr_001' },
          { key: 'date', label: 'Date Variable', placeholder: 'e.g. {{selected_date}}' },
          { key: 'durationMinutes', label: 'Duration Minutes', placeholder: '30' },
          { key: 'saveAs', label: 'Save slots as variable', placeholder: 'e.g. available_slots' },
        ],
      },
    ],
  },
  // Future verticals:
  // ecommerce: { label: 'E-commerce', color: 'orange', actions: [ { id: 'place_order', ... } ] },
  // realestate: { label: 'Real Estate', color: 'blue', actions: [ { id: 'schedule_visit', ... } ] },
}

// ── Vertical Action Node ───────────────────────────────────────────────────
function VerticalActionNode({ data }: NodeProps<FlowNodeData>) {
  const verticalDef = data.vertical ? VERTICAL_ACTION_REGISTRY[data.vertical] : null
  const actionDef = verticalDef?.actions.find(a => a.id === data.action)
  const color = verticalDef?.color ?? 'teal'
  const colorMap: Record<string, string> = {
    teal: 'border-teal-300 bg-teal-50',
    orange: 'border-orange-300 bg-orange-50',
    blue: 'border-blue-300 bg-blue-50',
  }
  const badgeMap: Record<string, string> = {
    teal: 'bg-teal-100 text-teal-700',
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
  }
  return (
    <div style={baseNodeStyle} className={`${colorMap[color] ?? colorMap.teal} p-4`}>
      <Handle type="target" position={Position.Top} id="in" style={handleStyle} />
      <div className="mb-2">{sectionTitle(
        `⚡ ${verticalDef?.label ?? 'Vertical'} Action`,
        badgeMap[color] ?? badgeMap.teal
      )}</div>
      <div className="text-sm font-semibold text-slate-900">
        {actionDef?.label ?? data.action ?? 'Choose Action'}
      </div>
      {actionDef && (
        <div className="mt-1 text-xs text-slate-500">{actionDef.description}</div>
      )}
      {!data.action && (
        <div className="mt-1 text-xs text-amber-600">⚠ Select an action in the panel →</div>
      )}
      <Handle type="source" position={Position.Bottom} id="next" style={handleStyle} />
    </div>
  )
}

type FlowBot = {
  _id?: string
  name: string
  description?: string
  keywords: string[]
  matchType: MatchType
  replyType?: "text" | "template" | "workflow"
  isActive: boolean
  timeoutMinutes?: number
  triggerCount?: number
  successRate?: number
  replyContent?: {
    workflow?: unknown[]
    flowGraph?: {
      nodes?: Node<FlowNodeData>[]
      edges?: Edge[]
      viewport?: { x: number; y: number; zoom: number }
      version?: number
    } | null
  }
}

type MetaFormState = {
  name: string
  description: string
  keywords: string
  matchType: MatchType
  timeoutMinutes: number
  isActive: boolean
}

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

const baseNodeStyle: CSSProperties = {
  borderRadius: 16,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  minWidth: 260,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.1)",
}

type FlowLead = {
  _id: string
  customerPhone: string
  status: string
  responses?: Record<string, string>
  createdAt: string
}

type LeftPanelTab = "flows" | "settings" | "leads"

const handleStyle = {
  width: 10,
  height: 10,
  borderRadius: 999,
  background: "#16a34a",
  border: "2px solid #ffffff",
} satisfies CSSProperties

const sectionTitle = (title: string, accent: string) => (
  <div className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${accent}`}>
    {title}
  </div>
)

function StartNode({ data }: NodeProps<FlowNodeData>) {
  return (
    <div style={baseNodeStyle} className="border-emerald-200 bg-emerald-50 p-4">
      <div className="mb-2">{sectionTitle("Start", "bg-emerald-100 text-emerald-700")}</div>
      <div className="text-sm font-semibold text-slate-900">{data.label || "Flow Trigger"}</div>
      <div className="mt-1 text-xs text-slate-600">Entry point for the chatbot workflow</div>
      <Handle type="source" position={Position.Bottom} id="next" style={handleStyle} />
    </div>
  )
}

function MessageNode({ data }: NodeProps<FlowNodeData>) {
  return (
    <div style={baseNodeStyle} className="p-4">
      <Handle type="target" position={Position.Top} id="in" style={handleStyle} />
      <div className="mb-2">{sectionTitle("Message", "bg-slate-100 text-slate-700")}</div>
      <div className="line-clamp-4 text-sm text-slate-800">{data.text || "Send a message"}</div>
      {data.delay ? <div className="mt-3 text-[11px] text-slate-500">Delay: {data.delay}s</div> : null}
      <Handle type="source" position={Position.Bottom} id="next" style={handleStyle} />
    </div>
  )
}

function QuestionNode({ data }: NodeProps<FlowNodeData>) {
  return (
    <div style={baseNodeStyle} className="border-blue-200 bg-blue-50 p-4">
      <Handle type="target" position={Position.Top} id="in" style={handleStyle} />
      <div className="mb-2">{sectionTitle("Question", "bg-blue-100 text-blue-700")}</div>
      <div className="line-clamp-4 text-sm font-medium text-slate-900">{data.text || "Ask a question"}</div>
      <div className="mt-2 text-[11px] text-blue-700">Save as: {data.saveAs || "response"}</div>
      <Handle type="source" position={Position.Bottom} id="next" style={handleStyle} />
    </div>
  )
}

function ButtonsNode({ data }: NodeProps<FlowNodeData>) {
  const buttons = data.buttons || []
  return (
    <div style={baseNodeStyle} className="border-amber-200 bg-amber-50 p-4">
      <Handle type="target" position={Position.Top} id="in" style={handleStyle} />
      <div className="mb-2">{sectionTitle("Buttons", "bg-amber-100 text-amber-700")}</div>
      <div className="line-clamp-3 text-sm font-medium text-slate-900">{data.text || "Present button choices"}</div>
      <div className="mt-3 space-y-1">
        {buttons.length === 0 ? <div className="text-[11px] text-slate-500">No buttons added yet</div> : null}
        {buttons.map((button, index) => {
          const topOffset = `${26 + index * 24}px`
          return (
            <div key={button.id} className="relative rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs text-slate-700">
              {button.title || `Button ${index + 1}`}
              <Handle
                type="source"
                position={Position.Right}
                id={`button:${button.id}`}
                style={{ ...handleStyle, top: topOffset, right: -6, background: "#f59e0b" }}
              />
            </div>
          )
        })}
      </div>
      <Handle type="source" position={Position.Bottom} id="next" style={handleStyle} />
    </div>
  )
}

function ListNode({ data }: NodeProps<FlowNodeData>) {
  const items = data.items || []
  return (
    <div style={baseNodeStyle} className="border-violet-200 bg-violet-50 p-4">
      <Handle type="target" position={Position.Top} id="in" style={handleStyle} />
      <div className="mb-2">{sectionTitle("List", "bg-violet-100 text-violet-700")}</div>
      <div className="line-clamp-3 text-sm font-medium text-slate-900">{data.text || "Present list choices"}</div>
      <div className="mt-3 space-y-1">
        {items.length === 0 ? <div className="text-[11px] text-slate-500">No list items yet</div> : null}
        {items.map((item, index) => {
          const topOffset = `${26 + index * 28}px`
          return (
            <div key={item.id} className="relative rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs text-slate-700">
              <div className="font-medium">{item.title || `Item ${index + 1}`}</div>
              {item.description ? <div className="text-[10px] text-slate-500">{item.description}</div> : null}
              <Handle
                type="source"
                position={Position.Right}
                id={`item:${item.id}`}
                style={{ ...handleStyle, top: topOffset, right: -6, background: "#8b5cf6" }}
              />
            </div>
          )
        })}
      </div>
      <Handle type="source" position={Position.Bottom} id="next" style={handleStyle} />
    </div>
  )
}

function ConditionNode({ data }: NodeProps<FlowNodeData>) {
  const branches = data.branches || []
  return (
    <div style={baseNodeStyle} className="border-indigo-200 bg-indigo-50 p-4">
      <Handle type="target" position={Position.Top} id="in" style={handleStyle} />
      <div className="mb-2">{sectionTitle("Condition", "bg-indigo-100 text-indigo-700")}</div>
      <div className="text-sm font-medium text-slate-900">If {data.variable || "variable"}</div>
      <div className="mt-3 space-y-1">
        {branches.length === 0 ? (
          <div className="text-[11px] text-slate-500">Add branches in the panel →</div>
        ) : null}
        {branches.map((branch, index) => {
          const topOffset = `${26 + index * 24}px`
          return (
            <div key={branch.id} className="relative rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-xs text-slate-700">
              = {branch.value || `branch ${index + 1}`}
              <Handle
                type="source"
                position={Position.Right}
                id={`branch:${branch.id}`}
                style={{ ...handleStyle, top: topOffset, right: -6, background: "#6366f1" }}
              />
            </div>
          )
        })}
      </div>
      <Handle type="source" position={Position.Bottom} id="next" style={handleStyle} />
    </div>
  )
}

function EndNode({ data }: NodeProps<FlowNodeData>) {
  return (
    <div style={baseNodeStyle} className="border-rose-200 bg-rose-50 p-4">
      <Handle type="target" position={Position.Top} id="in" style={handleStyle} />
      <div className="mb-2">{sectionTitle("End", "bg-rose-100 text-rose-700")}</div>
      <div className="text-sm font-semibold text-slate-900">{data.text || "Workflow complete"}</div>
      <div className="mt-1 text-xs text-slate-600">Conversation finishes after this node</div>
    </div>
  )
}

const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  question: QuestionNode,
  buttons: ButtonsNode,
  list: ListNode,
  condition: ConditionNode,
  end: EndNode,
  vertical_action: VerticalActionNode,
}

const buildStarterGraph = () => {
  const startId = makeId("start")
  const messageId = makeId("message")
  const endId = makeId("end")

  return {
    nodes: [
      {
        id: startId,
        type: "start",
        position: { x: 80, y: 120 },
        data: { label: "Keyword Trigger" },
      },
      {
        id: messageId,
        type: "message",
        position: { x: 80, y: 280 },
        data: { label: "Welcome", text: "Hi! Welcome to our WhatsApp assistant.", delay: 0 },
      },
      {
        id: endId,
        type: "end",
        position: { x: 80, y: 460 },
        data: { label: "Complete", text: "Thanks for contacting us." },
      },
    ] as Node<FlowNodeData>[],
    edges: [
      {
        id: `${startId}-${messageId}`,
        source: startId,
        target: messageId,
        sourceHandle: "next",
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: `${messageId}-${endId}`,
        source: messageId,
        target: endId,
        sourceHandle: "next",
        markerEnd: { type: MarkerType.ArrowClosed },
      },
    ] as Edge[],
  }
}

const workflowToFlowGraph = (workflow: any[] = []) => {
  if (!Array.isArray(workflow) || workflow.length === 0) {
    return buildStarterGraph()
  }

  const nodes: Node<FlowNodeData>[] = []
  const edges: Edge[] = []
  const startId = makeId("start")

  nodes.push({
    id: startId,
    type: "start",
    position: { x: 80, y: 80 },
    data: { label: "Keyword Trigger" },
  })

  let previousId = startId
  const idMap = new Map<string, string>()

  workflow.forEach((step, index) => {
    const stepType = ["text", "message"].includes(step?.type) ? "message" : step?.type === "question" ? "question" : step?.type === "buttons" ? "buttons" : step?.type === "list" ? "list" : "message"
    const nodeId = String(step?.id || makeId(`step-${index + 1}`))
    idMap.set(String(step?.id || nodeId), nodeId)
    nodes.push({
      id: nodeId,
      type: stepType,
      position: { x: 80 + (index % 2) * 300, y: 220 + index * 180 },
      data: {
        label: stepType,
        text: step?.text || "",
        delay: Number(step?.delay || 0),
        saveAs: step?.saveAs || "",
        buttons: (step?.buttons || []).map((button: any, buttonIndex: number) => ({
          id: String(button?.id || `button-${buttonIndex + 1}`),
          title: button?.title || `Button ${buttonIndex + 1}`,
          url: button?.url || "",
        })),
        items: (step?.listItems || []).map((item: any, itemIndex: number) => ({
          id: String(item?.id || `item-${itemIndex + 1}`),
          title: item?.title || `Item ${itemIndex + 1}`,
          description: item?.description || "",
        })),
      },
    })

    edges.push({
      id: `${previousId}-${nodeId}`,
      source: previousId,
      target: nodeId,
      sourceHandle: "next",
      markerEnd: { type: MarkerType.ArrowClosed },
    })
    previousId = nodeId
  })

  const endId = makeId("end")
  nodes.push({
    id: endId,
    type: "end",
    position: { x: 80, y: 240 + workflow.length * 180 },
    data: { label: "Complete", text: "Workflow completed" },
  })
  edges.push({
    id: `${previousId}-${endId}`,
    source: previousId,
    target: endId,
    sourceHandle: "next",
    markerEnd: { type: MarkerType.ArrowClosed },
  })

  workflow.forEach((step) => {
    const sourceNodeId = idMap.get(String(step?.id))
    if (!sourceNodeId) return

    ;(step?.buttons || []).forEach((button: any) => {
      const targetId = idMap.get(String(button?.nextStepId))
      if (!targetId) return
      edges.push({
        id: `${sourceNodeId}-button-${button.id}-${targetId}`,
        source: sourceNodeId,
        target: targetId,
        sourceHandle: `button:${button.id}`,
        markerEnd: { type: MarkerType.ArrowClosed },
      })
    })

    ;(step?.listItems || []).forEach((item: any) => {
      const targetId = idMap.get(String(item?.nextStepId))
      if (!targetId) return
      edges.push({
        id: `${sourceNodeId}-item-${item.id}-${targetId}`,
        source: sourceNodeId,
        target: targetId,
        sourceHandle: `item:${item.id}`,
        markerEnd: { type: MarkerType.ArrowClosed },
      })
    })
  })

  return { nodes, edges }
}

function FlowBuilderStudioInner({ projectId, vertical = 'whatsapp' }: { projectId: string; vertical?: string }) {
  const { setStatus } = useFlowBuilder()
  const [flows, setFlows] = useState<FlowBot[]>([])
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const [meta, setMeta] = useState<MetaFormState>({
    name: "",
    description: "",
    keywords: "",
    matchType: "contains",
    timeoutMinutes: 1,
    isActive: true,
  })
  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>(buildStarterGraph().nodes)
  const [edges, setEdges] = useState<Edge[]>(buildStarterGraph().edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [leftTab, setLeftTab] = useState<LeftPanelTab>("flows")
  const [leads, setLeads] = useState<FlowLead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) || null, [nodes, selectedNodeId])

  const authHeaders = () => {
    const token = authService.getToken()
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  const loadFlows = async (preferredFlowId?: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/chatbots?projectId=${projectId}`, {
        headers: authHeaders(),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || "Failed to load flows")
      }

      const list = (payload?.data?.bots || payload?.bots || []).filter((bot: FlowBot) => bot.replyType === "workflow")
      setFlows(list)

      const nextId = preferredFlowId || selectedFlowId || list[0]?._id || null
      if (nextId) {
        const selected = list.find((bot: FlowBot) => bot._id === nextId)
        if (selected) {
          hydrateEditor(selected)
          return
        }
      }

      if (list.length === 0) {
        createBlankFlow()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load flows")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFlows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadLeads = async (chatbotId: string) => {
    try {
      setLeadsLoading(true)
      const response = await fetch(`${API_URL}/chatbots/${chatbotId}/leads?projectId=${projectId}`, {
        headers: authHeaders(),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        setLeads([])
        return
      }
      setLeads(payload?.data?.leads || payload?.leads || [])
    } catch {
      setLeads([])
    } finally {
      setLeadsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedFlowId) {
      loadLeads(selectedFlowId)
    } else {
      setLeads([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFlowId, projectId])

  useEffect(() => {
    if (error) {
      setStatus({ type: "error", message: error })
      return
    }
    if (notice) {
      setStatus({ type: "success", message: notice })
      const timer = window.setTimeout(() => {
        setNotice(null)
        setStatus(null)
      }, 4000)
      return () => window.clearTimeout(timer)
    }
    setStatus(null)
  }, [error, notice, setStatus])

  const hydrateEditor = (flow: FlowBot) => {
    setSelectedFlowId(flow._id || null)
    setMeta({
      name: flow.name || "",
      description: flow.description || "",
      keywords: (flow.keywords || []).join(", "),
      matchType: flow.matchType || "contains",
      timeoutMinutes: Number(flow.timeoutMinutes || 1),
      isActive: flow.isActive !== false,
    })

    const graph = flow.replyContent?.flowGraph
      ? {
          nodes: flow.replyContent.flowGraph.nodes || [],
          edges: flow.replyContent.flowGraph.edges || [],
        }
      : workflowToFlowGraph(flow.replyContent?.workflow || [])

    setNodes(graph.nodes.length > 0 ? graph.nodes : buildStarterGraph().nodes)
    setEdges(graph.edges.length > 0 ? graph.edges : buildStarterGraph().edges)
    setSelectedNodeId(null)
    setNotice(null)
    setError(null)
  }

  const createBlankFlow = () => {
    const starter = buildStarterGraph()
    setSelectedFlowId(null)
    setMeta({
      name: "",
      description: "",
      keywords: "",
      matchType: "contains",
      timeoutMinutes: 1,
      isActive: true,
    })
    setNodes(starter.nodes)
    setEdges(starter.edges)
    setSelectedNodeId(null)
    setNotice(null)
    setError(null)
  }

  const onNodesChange = (changes: NodeChange[]) => setNodes((current) => applyNodeChanges(changes, current))
  const onEdgesChange = (changes: EdgeChange[]) => setEdges((current) => applyEdgeChanges(changes, current))
  const onConnect = (connection: Connection) => {
    setEdges((current) => addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed } }, current))
  }

  const addNode = (type: FlowNodeType) => {
    const id = makeId(type)
    const baseY = 120 + nodes.length * 70
    const newNode: Node<FlowNodeData> = {
      id,
      type,
      position: { x: 140 + (nodes.length % 3) * 260, y: baseY },
      data:
        type === "start"
          ? { label: "Keyword Trigger" }
          : type === "message"
          ? { label: "Message", text: "New message", delay: 0 }
          : type === "question"
          ? { label: "Question", text: "What should we ask?", saveAs: "response", delay: 0 }
          : type === "buttons"
          ? { label: "Buttons", text: "Choose an option", buttons: [{ id: makeId("button"), title: "Option 1", url: "" }] }
          : type === "list"
          ? { label: "List", text: "Pick from the list", items: [{ id: makeId("item"), title: "Item 1", description: "" }] }
          : type === "condition"
          ? {
              label: "Condition",
              variable: "response",
              branches: [{ id: makeId("branch"), value: "yes" }, { id: makeId("branch"), value: "no" }],
            }
          : type === "vertical_action"
          ? { label: "Vertical Action", vertical, action: '', actionConfig: {} }
          : { label: "End", text: "Thanks, we will get back to you." },
    }

    setNodes((current) => [...current, newNode])
    setSelectedNodeId(id)
  }

  const updateSelectedNode = (updates: Partial<FlowNodeData>) => {
    if (!selectedNodeId) return
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            }
          : node
      )
    )
  }

  const removeSelectedNode = () => {
    if (!selectedNodeId) return
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId))
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId))
    setSelectedNodeId(null)
  }

  const saveFlow = async () => {
    try {
      setSaving(true)
      setError(null)
      setNotice(null)

      if (!meta.name.trim()) {
        throw new Error("Flow name is required")
      }

      const keywords = meta.keywords.split(",").map((item) => item.trim()).filter(Boolean)
      if (keywords.length === 0) {
        throw new Error("At least one trigger keyword is required")
      }

      const flowGraph = {
        version: 1,
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
      }

      const payload = {
        name: meta.name.trim(),
        description: meta.description.trim(),
        keywords,
        matchType: meta.matchType,
        replyType: "workflow",
        timeoutMinutes: meta.timeoutMinutes,
        isActive: meta.isActive,
        projectId,
        replyContent: {
          flowGraph,
        },
      }

      const url = selectedFlowId
        ? `${API_URL}/chatbots/${selectedFlowId}?projectId=${projectId}`
        : `${API_URL}/chatbots?projectId=${projectId}`

      const response = await fetch(url, {
        method: selectedFlowId ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || result?.message || "Failed to save flow")
      }

      const savedFlowId = result?.data?._id || result?.data?.bot?._id || selectedFlowId || null
      setSelectedFlowId(savedFlowId)
      setLeftTab("flows")
      setNotice(
        savedFlowId
          ? "Flow saved — it appears in “My flows” and runs when customers send your keywords on WhatsApp."
          : "Flow saved successfully"
      )
      await loadFlows(savedFlowId || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save flow")
    } finally {
      setSaving(false)
    }
  }

  const deleteFlow = async (flowId?: string) => {
    if (!flowId) return
    if (!window.confirm("Delete this flow? This removes the chatbot rule as well.")) return

    try {
      setSaving(true)
      const response = await fetch(`${API_URL}/chatbots/${flowId}?projectId=${projectId}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || "Failed to delete flow")
      }
      setNotice("Flow deleted")
      createBlankFlow()
      await loadFlows()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete flow")
    } finally {
      setSaving(false)
    }
  }

  const leftTabBtn = (tab: LeftPanelTab, label: string, icon: ReactNode) => (
    <button
      type="button"
      onClick={() => setLeftTab(tab)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        leftTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 flex-col p-3 lg:p-4">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)_380px]">
        <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:min-h-0">
          <div className="flex gap-1 border-b border-slate-100 bg-slate-50 p-2">
            {leftTabBtn("flows", "My flows", <Bot className="h-4 w-4" />)}
            {leftTabBtn("settings", "Settings", <Settings2 className="h-4 w-4" />)}
            {leftTabBtn("leads", "Leads", <Users className="h-4 w-4" />)}
          </div>
          <div className="flex gap-2 border-b border-slate-100 px-3 py-2">
            <button
              type="button"
              onClick={createBlankFlow}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
            <button
              type="button"
              onClick={saveFlow}
              disabled={saving}
              className="inline-flex flex-[1.4] items-center justify-center gap-1.5 rounded-lg bg-green-600 px-2 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "…" : "Save"}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {leftTab === "flows" ? (
              <div className="space-y-3">
                {loading ? <p className="text-sm text-slate-500">Loading flows…</p> : null}
                {!loading && flows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
                    <p className="font-medium text-slate-800">No saved flows yet</p>
                    <p className="mt-2">Use Settings for name/keywords, build on the canvas, then Save flow.</p>
                  </div>
                ) : null}
                {flows.map((flow) => (
                  <button
                    key={flow._id}
                    type="button"
                    onClick={() => {
                      hydrateEditor(flow)
                      setLeftTab("flows")
                    }}
                    className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                      selectedFlowId === flow._id ? "border-green-400 bg-green-50 ring-1 ring-green-200" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{flow.name}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{flow.keywords?.join(", ") || "No keywords"}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${flow.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {flow.isActive ? "Live" : "Off"}
                      </span>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">{flow.triggerCount || 0} triggers</div>
                  </button>
                ))}
              </div>
            ) : null}

            {leftTab === "settings" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Flow name</label>
                  <input value={meta.name} onChange={(e) => setMeta((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" placeholder="Lead qualification flow" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                  <textarea value={meta.description} onChange={(e) => setMeta((prev) => ({ ...prev, description: e.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" placeholder="Optional" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Trigger keywords</label>
                  <input value={meta.keywords} onChange={(e) => setMeta((prev) => ({ ...prev, keywords: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" placeholder="hi, help, pricing" />
                  <p className="mt-1.5 text-xs text-slate-500">Comma-separated. Customer sends one on WhatsApp to start this flow.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Match</label>
                    <select value={meta.matchType} onChange={(e) => setMeta((prev) => ({ ...prev, matchType: e.target.value as MatchType }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                      <option value="contains">Contains</option>
                      <option value="exact">Exact</option>
                      <option value="starts_with">Starts with</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Reply timeout</label>
                    <select value={meta.timeoutMinutes} onChange={(e) => setMeta((prev) => ({ ...prev, timeoutMinutes: Number(e.target.value) }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                      <option value={1}>1 min</option>
                      <option value={2}>2 min</option>
                      <option value={5}>5 min</option>
                      <option value={10}>10 min</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={meta.isActive} onChange={(e) => setMeta((prev) => ({ ...prev, isActive: e.target.checked }))} className="h-4 w-4" />
                  Flow is active on WhatsApp
                </label>
                {selectedFlowId ? (
                  <button type="button" onClick={() => deleteFlow(selectedFlowId)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100">
                    <Trash2 className="h-4 w-4" /> Delete this flow
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">Save once to enable delete.</p>
                )}
              </div>
            ) : null}

            {leftTab === "leads" ? (
              <div className="space-y-3">
                {!selectedFlowId ? (
                  <p className="text-sm leading-relaxed text-slate-600">Save and select a flow to see people who completed it.</p>
                ) : leadsLoading ? (
                  <p className="text-sm text-slate-500">Loading leads…</p>
                ) : leads.length === 0 ? (
                  <p className="text-sm leading-relaxed text-slate-600">No leads yet. Created when someone finishes your flow (question steps collect answers).</p>
                ) : (
                  leads.slice(0, 20).map((lead) => (
                    <div key={lead._id} className="rounded-xl border border-slate-200 p-3">
                      <div className="font-medium text-slate-900">{lead.customerPhone}</div>
                      <div className="mt-1 text-xs capitalize text-slate-500">{lead.status}</div>
                      {lead.responses && Object.keys(lead.responses).length > 0 ? (
                        <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                          {Object.entries(lead.responses).slice(0, 3).map(([k, v]) => (
                            <div key={k}>
                              <span className="font-medium">{k}:</span> {String(v)}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
                <Link href={`/projects/${projectId}/leads`} className="inline-block text-sm font-medium text-green-700 hover:text-green-800">
                  View all project leads →
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            fitView
            className="bg-slate-50"
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background gap={16} size={1} color="#dbe4ef" />
            <MiniMap pannable zoomable />
            <Controls />
            <Panel position="top-left">
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
                <button onClick={() => addNode("message")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"><MessageSquare className="h-3.5 w-3.5" /> Message</button>
                <button onClick={() => addNode("question")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"><Bot className="h-3.5 w-3.5" /> Question</button>
                <button onClick={() => addNode("buttons")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"><GitBranch className="h-3.5 w-3.5" /> Buttons</button>
                <button onClick={() => addNode("list")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"><List className="h-3.5 w-3.5" /> List</button>
                <button onClick={() => addNode("condition")} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"><GitBranch className="h-3.5 w-3.5" /> Condition</button>
                <button onClick={() => addNode("end")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"><TimerReset className="h-3.5 w-3.5" /> End</button>
                {vertical && VERTICAL_ACTION_REGISTRY[vertical] && (
                  <button onClick={() => addNode("vertical_action")} className="inline-flex items-center gap-1 rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100">
                    ⚡ {VERTICAL_ACTION_REGISTRY[vertical].label} Action
                  </button>
                )}
              </div>
            </Panel>
          </ReactFlow>
        </div>

        <div className="flex min-h-[420px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm xl:min-h-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Node inspector</h2>
            <p className="mt-0.5 text-xs text-slate-500">Click any node on the canvas to edit it</p>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {!selectedNode ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm leading-relaxed text-slate-500">
                Select a node on the canvas to edit message text, buttons, list items, or condition branches.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="font-semibold text-slate-900">{selectedNode.type}</div>
                  <div className="mt-1 text-xs text-slate-500">Node ID: {selectedNode.id}</div>
                </div>

                {selectedNode.type !== "start" ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Message Text</label>
                    <textarea value={selectedNode.data.text || ""} onChange={(e) => updateSelectedNode({ text: e.target.value })} className="h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Type node message" />
                  </div>
                ) : null}

                {["message", "question"].includes(selectedNode.type || "") ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Delay (seconds)</label>
                    <input type="number" min={0} max={60} value={selectedNode.data.delay || 0} onChange={(e) => updateSelectedNode({ delay: Number(e.target.value || 0) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                ) : null}

                {selectedNode.type === "question" ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Save Response As</label>
                    <input value={selectedNode.data.saveAs || ""} onChange={(e) => updateSelectedNode({ saveAs: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="name, email, issue" />
                  </div>
                ) : null}

                {selectedNode.type === "buttons" ? (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-slate-600">Buttons</div>
                    {(selectedNode.data.buttons || []).map((button, index) => (
                      <div key={button.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Button {index + 1}</span>
                          <button
                            onClick={() => updateSelectedNode({ buttons: (selectedNode.data.buttons || []).filter((item) => item.id !== button.id) })}
                            className="text-xs font-medium text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                        <input value={button.title} onChange={(e) => updateSelectedNode({ buttons: (selectedNode.data.buttons || []).map((item) => item.id === button.id ? { ...item, title: e.target.value } : item) })} className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Button title" />
                        <input value={button.url || ""} onChange={(e) => updateSelectedNode({ buttons: (selectedNode.data.buttons || []).map((item) => item.id === button.id ? { ...item, url: e.target.value } : item) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Optional URL sent when clicked" />
                      </div>
                    ))}
                    <button onClick={() => updateSelectedNode({ buttons: [...(selectedNode.data.buttons || []), { id: makeId("button"), title: `Option ${(selectedNode.data.buttons || []).length + 1}`, url: "" }] })} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                      <Plus className="h-4 w-4" /> Add Button
                    </button>
                  </div>
                ) : null}

                {selectedNode.type === "condition" ? (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-slate-600">Variable to check</label>
                    <input
                      value={selectedNode.data.variable || ""}
                      onChange={(e) => updateSelectedNode({ variable: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    {(selectedNode.data.branches || []).map((branch) => (
                      <input
                        key={branch.id}
                        value={branch.value}
                        onChange={(e) =>
                          updateSelectedNode({
                            branches: (selectedNode.data.branches || []).map((b) =>
                              b.id === branch.id ? { ...b, value: e.target.value } : b
                            ),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedNode({
                          branches: [...(selectedNode.data.branches || []), { id: makeId("branch"), value: "new" }],
                        })
                      }
                      className="text-sm text-indigo-600"
                    >
                      + Add branch
                    </button>
                  </div>
                ) : null}

                {selectedNode.type === "list" ? (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-slate-600">List Items</div>
                    {(selectedNode.data.items || []).map((item, index) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Item {index + 1}</span>
                          <button
                            onClick={() => updateSelectedNode({ items: (selectedNode.data.items || []).filter((entry) => entry.id !== item.id) })}
                            className="text-xs font-medium text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                        <input value={item.title} onChange={(e) => updateSelectedNode({ items: (selectedNode.data.items || []).map((entry) => entry.id === item.id ? { ...entry, title: e.target.value } : entry) })} className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Item title" />
                        <input value={item.description || ""} onChange={(e) => updateSelectedNode({ items: (selectedNode.data.items || []).map((entry) => entry.id === item.id ? { ...entry, description: e.target.value } : entry) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Optional description" />
                      </div>
                    ))}
                    <button onClick={() => updateSelectedNode({ items: [...(selectedNode.data.items || []), { id: makeId("item"), title: `Item ${(selectedNode.data.items || []).length + 1}`, description: "" }] })} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                      <Plus className="h-4 w-4" /> Add Item
                    </button>
                  </div>
                ) : null}

                {selectedNode.type === "end" ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    End nodes compile into the final message step. Leave text blank if you want the workflow to simply finish silently.
                  </div>
                ) : null}

                {selectedNode.type === "vertical_action" ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Vertical</label>
                      <select
                        value={selectedNode.data.vertical || vertical}
                        onChange={(e) => updateSelectedNode({ vertical: e.target.value, action: '', actionConfig: {} })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        {Object.keys(VERTICAL_ACTION_REGISTRY).map((v) => (
                          <option key={v} value={v}>{VERTICAL_ACTION_REGISTRY[v].label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Action</label>
                      <select
                        value={selectedNode.data.action || ''}
                        onChange={(e) => updateSelectedNode({ action: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">Select action</option>
                        {(VERTICAL_ACTION_REGISTRY[selectedNode.data.vertical || vertical]?.actions || []).map((action) => (
                          <option key={action.id} value={action.id}>{action.label}</option>
                        ))}
                      </select>
                    </div>

                    {(VERTICAL_ACTION_REGISTRY[selectedNode.data.vertical || vertical]?.actions || [])
                      .find((action) => action.id === selectedNode.data.action)
                      ?.configFields
                      .map((field) => (
                        <div key={field.key}>
                          <label className="mb-1 block text-xs font-medium text-slate-600">{field.label}</label>
                          <input
                            value={selectedNode.data.actionConfig?.[field.key] || ''}
                            onChange={(e) => updateSelectedNode({
                              actionConfig: {
                                ...(selectedNode.data.actionConfig || {}),
                                [field.key]: e.target.value,
                              },
                            })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder={field.placeholder || ''}
                          />
                        </div>
                      ))}
                  </div>
                ) : null}

                {selectedNode.type !== "start" ? (
                  <button onClick={removeSelectedNode} className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                    <Trash2 className="h-4 w-4" /> Remove Node
                  </button>
                ) : null}

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                  <div className="mb-1 flex items-center gap-2 font-semibold"><AlertCircle className="h-3.5 w-3.5" /> Flow runtime notes</div>
                  <ul className="space-y-1 pl-4 list-disc">
                    <li>Connect from the node bottom handle for sequential flow.</li>
                    <li>Buttons and list items expose dedicated branch handles on the right.</li>
                    <li>Question nodes save one reply and continue on the default next edge.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FlowBuilderStudio({ projectId, vertical = 'whatsapp' }: { projectId: string; vertical?: string }) {
  return (
    <ReactFlowProvider>
      <FlowBuilderStudioInner projectId={projectId} vertical={vertical} />
    </ReactFlowProvider>
  )
}
