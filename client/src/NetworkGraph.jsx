import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import ForceGraph2D from "react-force-graph-2d";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";

// Same 11 colours used in the R sigmajs script
const PALETTE = [
  "#cc61b1",
  "#7fcf52",
  "#7847c1",
  "#cab74e",
  "#4b3051",
  "#78caa7",
  "#cd6234",
  "#7994c2",
  "#aa4350",
  "#515d37",
  "#ccb0a2",
];

const PLAY_INTERVAL_MS = 300; // ms per animation step

function NetworkGraph({ networkData }) {
  const [mode, setMode] = useState("static"); // 'static' | 'timeline'
  const [edgeCount, setEdgeCount] = useState(0);
  const [playing, setPlaying] = useState(false);

  const containerRef = useRef(null);
  const fgRef = useRef();
  const playTimerRef = useRef(null);
  const [width, setWidth] = useState(800);

  // Responsive container width
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    );
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Stable color map: group → colour
  const groupColors = useMemo(() => {
    if (!networkData) return {};
    const groups = [...new Set(networkData.nodes.map((n) => n.group))].sort();
    return Object.fromEntries(
      groups.map((g, i) => [g, PALETTE[i % PALETTE.length]])
    );
  }, [networkData]);

  // Edges sorted chronologically
  const sortedEdges = useMemo(() => {
    if (!networkData) return [];
    return [...networkData.edges].sort((a, b) => a.date.localeCompare(b.date));
  }, [networkData]);

  // ---- Hover / neighbour highlight (mirrors R sg_neighbours()) ----
  const [hoverNode, setHoverNode] = useState(null);
  const highlightNodes = useRef(new Set());
  const highlightLinks = useRef(new Set());

  // Graph data derived from mode + edgeCount
  const graphData = useMemo(() => {
    if (!networkData) return { nodes: [], links: [] };
    const activeEdges =
      mode === "static" ? sortedEdges : sortedEdges.slice(0, edgeCount);
    const nodes = networkData.nodes.map((n) => ({
      ...n,
      color: groupColors[n.group] || "#aaa",
    }));
    const links = activeEdges.map((e) => ({
      ...e,
      source: e.source,
      target: e.target,
    }));
    return { nodes, links };
  }, [networkData, mode, edgeCount, sortedEdges, groupColors]);

  // Adjacency map (rebuilt when graphData.links changes)
  const adjacency = useMemo(() => {
    const adj = {};
    graphData.links.forEach((link) => {
      const s = typeof link.source === "object" ? link.source.id : link.source;
      const t = typeof link.target === "object" ? link.target.id : link.target;
      if (!adj[s]) adj[s] = new Set();
      if (!adj[t]) adj[t] = new Set();
      adj[s].add(t);
      adj[t].add(s);
    });
    return adj;
  }, [graphData.links]);

  const handleNodeHover = useCallback(
    (node) => {
      highlightNodes.current = new Set();
      highlightLinks.current = new Set();
      if (node) {
        highlightNodes.current.add(node.id);
        (adjacency[node.id] || new Set()).forEach((id) =>
          highlightNodes.current.add(id)
        );
        graphData.links.forEach((link) => {
          const s =
            typeof link.source === "object" ? link.source.id : link.source;
          const t =
            typeof link.target === "object" ? link.target.id : link.target;
          if (s === node.id || t === node.id) {
            highlightLinks.current.add(link);
          }
        });
      }
      setHoverNode(node || null);
    },
    [adjacency, graphData.links]
  );

  // ---- Play / pause logic ----
  useEffect(() => {
    if (!playing) {
      clearInterval(playTimerRef.current);
      return;
    }
    playTimerRef.current = setInterval(() => {
      setEdgeCount((c) => {
        if (c >= sortedEdges.length) {
          setPlaying(false);
          return c;
        }
        // Advance past all edges on the same date in one step
        const curDate = sortedEdges[c]?.date;
        let next = c + 1;
        while (
          next < sortedEdges.length &&
          sortedEdges[next].date === curDate
        ) {
          next++;
        }
        return next;
      });
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(playTimerRef.current);
  }, [playing, sortedEdges]);

  const switchMode = (newMode) => {
    setPlaying(false);
    setMode(newMode);
    setEdgeCount(newMode === "timeline" ? 0 : sortedEdges.length);
  };

  const currentDate =
    mode === "timeline" && edgeCount > 0
      ? sortedEdges[edgeCount - 1]?.date
      : null;

  // ---- Canvas renderers ----
  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
      const hasHighlight = highlightNodes.current.size > 0;
      const isHighlighted =
        !hasHighlight || highlightNodes.current.has(node.id);
      const r = 5;

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = isHighlighted
        ? node.color
        : node.color + "44"; // dim with alpha
      ctx.fill();

      // Label — only draw when zoomed in enough, or always on hover
      const showLabel = globalScale > 0.8 || hoverNode?.id === node.id;
      if (showLabel) {
        const fontSize = Math.max(6, 11 / globalScale);
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = isHighlighted ? "#222" : "#bbb";
        ctx.fillText(node.label, node.x, node.y + r + 1 / globalScale);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hoverNode]
  );

  const linkColor = useCallback(
    (link) => {
      const hasHighlight = highlightLinks.current.size > 0;
      return !hasHighlight || highlightLinks.current.has(link)
        ? "rgba(120,120,120,0.6)"
        : "rgba(200,200,200,0.15)";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hoverNode]
  );

  if (!networkData) return <p>Loading network…</p>;

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      {/* ---- Controls bar ---- */}
      <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
        <ButtonGroup>
          <Button
            variant={mode === "static" ? "primary" : "outline-primary"}
            onClick={() => switchMode("static")}
          >
            Static
          </Button>
          <Button
            variant={mode === "timeline" ? "primary" : "outline-primary"}
            onClick={() => switchMode("timeline")}
          >
            Timeline
          </Button>
        </ButtonGroup>

        {mode === "timeline" && (
          <>
            <ButtonGroup>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setEdgeCount(0);
                  setPlaying(false);
                }}
              >
                ⏮
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? "⏸" : "▶"}
              </Button>
            </ButtonGroup>

            <input
              type="range"
              min={0}
              max={sortedEdges.length}
              value={edgeCount}
              onChange={(e) => {
                setPlaying(false);
                setEdgeCount(Number(e.target.value));
              }}
              style={{ flex: 1, minWidth: 180 }}
            />

            <span
              style={{
                minWidth: "14ch",
                fontFamily: "monospace",
                fontSize: "0.9rem",
              }}
            >
              {currentDate ?? "—"}&nbsp;({edgeCount}/{sortedEdges.length})
            </span>
          </>
        )}

        {/* Colour legend */}
        <div className="d-flex flex-wrap gap-2 ms-auto">
          {Object.entries(groupColors).map(([group, color]) => (
            <span
              key={group}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <small>{group}</small>
            </span>
          ))}
        </div>
      </div>

      {/* ---- Graph canvas ---- */}
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={width}
        height={700}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => "replace"}
        linkColor={linkColor}
        linkWidth={0.8}
        onNodeHover={handleNodeHover}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.25}
        cooldownTime={3000}
        enableNodeDrag
      />
    </div>
  );
}

export default NetworkGraph;
