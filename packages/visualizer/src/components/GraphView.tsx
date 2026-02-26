/**
 * GraphView component - Main React Flow visualization
 */

import React, { useCallback } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type Node as FlowNode,
  MiniMap,
  type NodeTypes,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useGraphStore } from '../store/useGraphStore'
import type { GraphEdge, GraphNode } from '../types'
import { DependencyNode } from './DependencyNode'

const nodeTypes: NodeTypes = {
  dependencyNode: DependencyNode,
}

export function GraphView() {
  const { nodes: storeNodes, edges: storeEdges, selectNode } = useGraphStore()

  // Convert GraphNode to FlowNode
  const flowNodes: FlowNode[] = storeNodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  }))

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges)

  // Update nodes/edges when store changes
  React.useEffect(() => {
    const flowNodes = storeNodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    }))
    console.log(
      '[GraphView] Updating nodes:',
      flowNodes.length,
      'Sample positions:',
      flowNodes.slice(0, 3).map((n) => ({
        id: n.id,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
      }))
    )
    setNodes(flowNodes)
  }, [storeNodes, setNodes])

  React.useEffect(() => {
    setEdges(storeEdges)
  }, [storeEdges, setEdges])

  const onConnect = useCallback((_connection: Connection) => {
    // We don't allow adding new edges in read-only mode
  }, [])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      selectNode(node.id)
    },
    [selectNode]
  )

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: FlowNode) => {
    // TODO: Open file in editor
    console.log('Double clicked node:', node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  return (
    <div className="h-full w-full">
      <ReactFlow
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: 'rgba(0, 240, 255, 0.4)',
            strokeWidth: 2,
          },
        }}
        edges={edges}
        fitView
        maxZoom={3}
        minZoom={0.02}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodesChange={onNodesChange}
        onPaneClick={onPaneClick}
        panOnDrag={true}
        panOnScroll
        selectionOnDrag
        zoomOnDoubleClick={false}
        zoomOnPinch={true}
        zoomOnScroll={true}
      >
        <Background
          gap={24}
          size={2}
          style={{
            backgroundColor: 'transparent',
          }}
          variant={BackgroundVariant.Dots}
        />
        <Controls className="!bg-black/60 !backdrop-blur-xl !border !border-white/10 [&>button]:!bg-white/5 [&>button]:!border-white/10 [&>button]:!text-white [&>button:hover]:!bg-white/10" />
        <MiniMap
          className="!bg-black/60 !backdrop-blur-xl !border !border-white/10"
          maskColor="rgba(0, 0, 0, 0.6)"
          nodeColor={(node) => {
            const data = node.data as GraphNode['data']
            const scopeColors: Record<string, string> = {
              app: '#00F0FF',
              workspace: '#00FF94',
              external: '#FF006E',
              internal: '#FFBE0B',
              other: '#8B5CF6',
            }
            return scopeColors[data.aiNode.scope] || '#6B7280'
          }}
        />
      </ReactFlow>
    </div>
  )
}
