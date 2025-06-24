"use client"

import React, { useEffect, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

interface NetworkNode {
  id: string
  label: string
  type: 'topic' | 'keyword'
  size: number
  color: string
  cluster: number
}

interface NetworkEdge {
  source: string
  target: string
  weight: number
}

interface NetworkData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

interface NetworkTopicVisualizationProps {
  networkData?: NetworkData
  width?: number
  height?: number
}

export default function NetworkTopicVisualization({ 
  networkData, 
  width = 600, 
  height = 400 
}: NetworkTopicVisualizationProps) {
  const fgRef = useRef<any>()

  useEffect(() => {
    if (fgRef.current && networkData) {
      // Configura forze per migliore distribuzione
      setTimeout(() => {
        if (fgRef.current) {
          // Aumenta repulsione tra nodi
          fgRef.current.d3Force('charge')?.strength(-300)
          // Riduce attrazione verso il centro
          fgRef.current.d3Force('center')?.strength(0.05)
          // Auto-zoom con padding maggiore
          fgRef.current.zoomToFit(500, 100)
        }
      }, 100)
    }
  }, [networkData])

  if (!networkData || !networkData.nodes || networkData.nodes.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">🕸️</div>
          <p className="text-sm">Nessun dato di rete disponibile</p>
          <p className="text-xs">Esegui l'analisi per vedere il grafico</p>
        </div>
      </div>
    )
  }

  // Prepare data for react-force-graph
  const graphData = {
    nodes: networkData.nodes.map(node => ({
      id: node.id,
      name: node.label,
      type: node.type,
      val: node.size,
      color: node.color,
      cluster: node.cluster
    })),
    links: networkData.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      value: edge.weight
    }))
  }

  return (
    <div className="relative">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={width}
        height={height}
        nodeAutoColorBy="cluster"
        d3AlphaDecay={0.005}
        d3VelocityDecay={0.3}
        warmupTicks={100}
        cooldownTicks={200}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.name || node.id
          const fontSize = Math.max(12, 18 / globalScale)
          const nodeRadius = Math.sqrt(node.val || 1) * 7
          
          // Colori più contrastati
          const nodeColor = node.type === 'topic' 
            ? '#2563eb'  // Blu intenso per topic
            : '#10b981'  // Verde per keyword

          // Ombra per profondità
          ctx.shadowColor = 'rgba(0,0,0,0.4)'
          ctx.shadowBlur = 6
          ctx.shadowOffsetX = 3
          ctx.shadowOffsetY = 3
          
          // Draw node circle
          ctx.fillStyle = nodeColor
          ctx.beginPath()
          ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false)
          ctx.fill()

          // Reset shadow
          ctx.shadowColor = 'transparent'
          
          // Bordo più definito
          ctx.strokeStyle = node.type === 'topic' ? '#1e40af' : '#047857'
          ctx.lineWidth = node.type === 'topic' ? 4 : 3
          ctx.stroke()

          // Label con sfondo per leggibilità
          if (nodeRadius > 5 || globalScale > 1.2) {
            const labelY = node.y + nodeRadius + fontSize + 6
            
            // Misura il testo per lo sfondo
            ctx.font = `bold ${fontSize}px Arial, sans-serif`
            const textMetrics = ctx.measureText(label)
            const textWidth = textMetrics.width
            
            // Sfondo semi-trasparente
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
            ctx.fillRect(
              node.x - textWidth/2 - 6, 
              labelY - fontSize - 2, 
              textWidth + 12, 
              fontSize + 6
            )
            
            // Bordo dello sfondo
            ctx.strokeStyle = 'rgba(0,0,0,0.2)'
            ctx.lineWidth = 1
            ctx.strokeRect(
              node.x - textWidth/2 - 6, 
              labelY - fontSize - 2, 
              textWidth + 12, 
              fontSize + 6
            )
            
            // Testo
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = '#1f2937'
            ctx.fillText(label, node.x, labelY - fontSize/2)
          }
        }}
        linkAutoColorBy="value"
        linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D) => {
          const MAX_LINK_WIDTH = 6
          const linkWidth = Math.max(2, (link.value || 0.1) * MAX_LINK_WIDTH)
          
          // Colore basato sul peso del link
          const alpha = 0.4 + (link.value || 0.1) * 0.6
          ctx.strokeStyle = `rgba(100, 116, 139, ${alpha})`
          ctx.lineWidth = linkWidth
          
          // Linea con gradiente per migliore visibilità
          ctx.beginPath()
          ctx.moveTo(link.source.x, link.source.y)
          ctx.lineTo(link.target.x, link.target.y)
          ctx.stroke()
        }}
        linkDirectionalParticles={0}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const nodeRadius = Math.sqrt(node.val || 1) * 7
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(node.x, node.y, nodeRadius + 5, 0, 2 * Math.PI, false)
          ctx.fill()
        }}
        onNodeHover={(node: any) => {
          if (fgRef.current) {
            fgRef.current.canvas().style.cursor = node ? 'pointer' : null
          }
        }}
        onNodeClick={(node: any) => {
          console.log('Clicked node:', node)
          if (fgRef.current) {
            // Zoom più fluido verso il nodo
            fgRef.current.centerAt(node.x, node.y, 1500)
            fgRef.current.zoom(3, 2000)
          }
        }}
        onEngineStop={() => {
          // Auto-fit con padding generoso per evitare sovrapposizioni
          setTimeout(() => {
            fgRef.current?.zoomToFit(600, 150)
          }, 500)
        }}
      />
      
      {/* Legend migliorata */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-95 rounded-lg p-4 shadow-lg text-sm border">
        <h4 className="font-semibold mb-2 text-gray-700">Legenda</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-blue-800"></div>
            <span className="text-gray-700">Topic principali</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-700"></div>
            <span className="text-gray-700">Parole chiave</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-1 bg-gray-400"></div>
            <span className="text-gray-600 text-xs">Connessioni</span>
          </div>
        </div>
      </div>

      {/* Controls migliorati */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-95 rounded-lg p-3 shadow-lg">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => fgRef.current?.zoomToFit(600, 150)}
            className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            📏 Adatta
          </button>
          <button
            onClick={() => fgRef.current?.zoom(1, 1000)}
            className="px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            🔍 Reset
          </button>
        </div>
      </div>

      {/* Istruzioni d'uso */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg text-xs text-gray-600 max-w-xs">
        <p><strong>💡 Come usare:</strong></p>
        <p>• Clicca sui nodi per ingrandire</p>
        <p>• Trascina per esplorare</p>
        <p>• Usa rotellina mouse per zoom</p>
      </div>
    </div>
  )
}
