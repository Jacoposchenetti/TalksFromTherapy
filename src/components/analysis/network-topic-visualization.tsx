"use client"

import { useEffect, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff } from 'lucide-react'

interface NetworkNode {
  id: string
  label: string
  type: string
  size: number
  color: string
  cluster: number
  weight?: number
  x?: number
  y?: number
  fx?: number
  fy?: number
}

interface NetworkEdge {
  source: string
  target: string
  weight: number
  type?: string
}

interface NetworkData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

interface NetworkTopicVisualizationProps {
  networkData: NetworkData
  width?: number
  height?: number
}

export default function NetworkTopicVisualization({ 
  networkData, 
  width = 600, 
  height = 400 
}: NetworkTopicVisualizationProps) {
  const fgRef = useRef<any>()
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [showKeywords, setShowKeywords] = useState(true)
  const [showConnections, setShowConnections] = useState(true)  // Configura le forze D3 per spaziare i nodi mantenendo i link visibili
  useEffect(() => {
    if (fgRef.current) {
      const fg = fgRef.current;
      
      // Configura le forze esistenti di D3 per layout ottimale
      setTimeout(() => {
        // Forza dei link - distanza media ma link più forti
        if (fg.d3Force('link')) {
          fg.d3Force('link')
            .distance(150)     // Distanza moderata
            .strength(0.3);    // Link più forti per mantenerli visibili
        }
        
        // Forza di repulsione - bilanciata
        if (fg.d3Force('charge')) {
          fg.d3Force('charge')
            .strength(-1200)   // Repulsione media
            .distanceMax(800); // Distanza massima ragionevole
        }
        
        // Centro leggermente attrattivo
        if (fg.d3Force('center')) {
          fg.d3Force('center')
            .strength(0.03);   // Leggera attrazione al centro
        }
        
        // Zoom iniziale ragionevole - SOLO una volta
        setTimeout(() => {
          fg.zoomToFit(1200, 60); // Tempo e padding moderati
        }, 600);
      }, 100);
    }
  }, [networkData]);  // Filtra dati in base alle opzioni di visualizzazione
  const filteredNodes = networkData.nodes.filter(node => 
    node.type === 'topic' || (node.type === 'keyword' && showKeywords)
  )
  
  const filteredData = {
    nodes: filteredNodes,
    links: networkData.edges.filter(edge => {
      if (!showConnections) return false
      // Verifica che sia source che target esistano nei nodi filtrati
      const sourceExists = filteredNodes.some(n => n.id === edge.source)
      const targetExists = filteredNodes.some(n => n.id === edge.target)
      if (!showKeywords) {
        // Mostra solo connessioni tra topic se keywords sono nascoste
        return edge.type === 'topic_similarity' && sourceExists && targetExists
      }
      return sourceExists && targetExists
    })
  }

  // Debug: log del numero di nodi e link
  console.log(`Network: ${filteredData.nodes.length} nodes, ${filteredData.links.length} links, showConnections: ${showConnections}, showKeywords: ${showKeywords}`)

  const handleNodeClick = (node: NetworkNode) => {
    setSelectedNode(node)
    // Centra il grafo sul nodo cliccato
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000)
      fgRef.current.zoom(3, 2000)
    }
  }
  const resetView = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(1000, 60) // Zoom ragionevole con padding moderato
      setSelectedNode(null)
    }
  }

  const zoomIn = () => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom()
      fgRef.current.zoom(currentZoom * 1.5, 500)
    }
  }

  const zoomOut = () => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom()
      fgRef.current.zoom(currentZoom * 0.7, 500)
    }
  }

  const getNodeLabel = (node: NetworkNode) => {
    if (node.type === 'topic') {
      return node.label
    }
    return node.label
  }

  const getNodeSize = (node: NetworkNode) => {
    if (node.type === 'topic') {
      return Math.max(8, node.size * 0.8)
    }
    return Math.max(4, node.size * 0.6)
  }
  const getLinkWidth = (link: NetworkEdge) => {
    return Math.max(2, link.weight * 4) // Spessore minimo aumentato da 1 a 2
  }

  const getLinkColor = (link: NetworkEdge) => {
    switch (link.type) {
      case 'topic_keyword':
        return '#64748B' // Gray più scuro per migliore visibilità
      case 'keyword_cooccurrence':
      case 'cooccurrence':
        return '#059669' // Green più intenso
      case 'topic_similarity':
        return '#D97706' // Amber più intenso
      default:
        return '#64748B' // Gray più scuro
    }
  }

  return (
    <div className="w-full h-full relative bg-gray-50 rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={zoomIn}
            className="bg-white/90"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={zoomOut}
            className="bg-white/90"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetView}
            className="bg-white/90"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={showKeywords ? "default" : "outline"}
            onClick={() => setShowKeywords(!showKeywords)}
            className="bg-white/90 text-xs"
          >
            {showKeywords ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Keywords
          </Button>
          <Button
            size="sm"
            variant={showConnections ? "default" : "outline"}
            onClick={() => setShowConnections(!showConnections)}
            className="bg-white/90 text-xs"
          >
            {showConnections ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Links
          </Button>
        </div>
      </div>

      {/* Node Info Panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 z-10 bg-white/95 p-3 rounded-lg shadow-lg max-w-xs">
          <div className="font-semibold text-sm">{selectedNode.label}</div>
          <div className="text-xs text-gray-600 mt-1">
            Type: {selectedNode.type === 'topic' ? 'Tema' : 'Parola Chiave'}
          </div>
          <div className="text-xs text-gray-600">
            Weight: {selectedNode.weight?.toFixed(3) || 'N/A'}
          </div>
          <div className="text-xs text-gray-600">
            Cluster: {selectedNode.cluster}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedNode(null)}
            className="mt-2 text-xs"
          >
            Chiudi
          </Button>
        </div>
      )}      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 p-3 rounded-lg shadow-lg">
        <div className="text-xs font-semibold mb-2">Legenda</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Tema 1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Tema 2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Tema 3</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span>Altre parole</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-gray-500"></div>
            <span>Co-occorrenze</span>
          </div>
        </div>
      </div>      {/* Force Graph */}
      <ForceGraph2D
        ref={fgRef}
        graphData={filteredData}
        width={width}
        height={height}
        nodeLabel={getNodeLabel}
        nodeVal={getNodeSize}
        nodeColor={(node: any) => node.color}        linkWidth={getLinkWidth}
        linkColor={getLinkColor}
        linkDirectionalParticles={2} // Più particelle per migliore visibilità
        linkDirectionalParticleWidth={2} // Particelle più grandi
        linkDirectionalParticleSpeed={0.006} // Velocità moderata
        linkOpacity={0.8} // Opacity dei link
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => setSelectedNode(null)}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.label
          const fontSize = Math.max(10, 14 / globalScale) // Font più grande
          ctx.font = `bold ${fontSize}px Sans-Serif` // Font grassetto per migliore leggibilità
          
          // Disegna il nodo - più grande per migliore visibilità
          const nodeRadius = getNodeSize(node) * 1.2 // Nodi il 20% più grandi
          ctx.fillStyle = node.color
          ctx.beginPath()
          ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false)
          ctx.fill()
          
          // Bordo sempre visibile per migliore definizione
          ctx.strokeStyle = '#FFFFFF'
          ctx.lineWidth = 2
          ctx.stroke()
          
          // Disegna il bordo se selezionato
          if (selectedNode?.id === node.id) {
            ctx.strokeStyle = '#1F2937'
            ctx.lineWidth = 3
            ctx.stroke()
          }
            // Disegna l'etichetta SENZA sfondo bianco
          const textWidth = ctx.measureText(label).width
          
          // Testo dell'etichetta con ombra per leggibilità          
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          
          // Ombra del testo per migliore leggibilità
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
          ctx.lineWidth = 3
          ctx.strokeText(label, node.x, node.y + nodeRadius + 15)
          
          // Testo principale
          ctx.fillStyle = '#1F2937'
          ctx.fillText(label, node.x, node.y + nodeRadius + 15)
        }}        // Parametri di base per il layout
        cooldownTicks={300}
        onEngineStop={() => {
          // Non fare zoom automatico quando finisce l'engine - mantieni il zoom impostato
          console.log('Network simulation stopped')
        }}
      />
    </div>
  )
}
