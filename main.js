import './style.css';

// prettier-ignore
let nodeIdCounter = 0, linkIdCounter = 0;
// prettier-ignore
let nodes = [], links = [];
// prettier-ignore
let dragSourceNode = null, interimLink = null;

//////////////////////////////////////

const gData = {
  nodes: [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
  links: [
    { source: 0, target: 1 },
    { source: 0, target: 1 },
    { source: 1, target: 0 },
    { source: 1, target: 2 },
    { source: 2, target: 2 },
    { source: 2, target: 2 },
    { source: 2, target: 2 },
    { source: 2, target: 3 },
    { source: 3, target: 4 },
    { source: 4, target: 3 },
  ],
};

let selfLoopLinks = {};
let sameNodesLinks = {};
const curvatureMinMax = 0.5;

// 1. assign each link a nodePairId that combines their source and target independent of the links direction
// 2. group links together that share the same two nodes or are self-loops
gData.links.forEach((link) => {
  link.nodePairId =
    link.source <= link.target
      ? link.source + '_' + link.target
      : link.target + '_' + link.source;
  let map = link.source === link.target ? selfLoopLinks : sameNodesLinks;
  if (!map[link.nodePairId]) {
    map[link.nodePairId] = [];
  }
  map[link.nodePairId].push(link);
});

// Compute the curvature for self-loop links to avoid overlaps
Object.keys(selfLoopLinks).forEach((id) => {
  let links = selfLoopLinks[id];
  let lastIndex = links.length - 1;
  links[lastIndex].curvature = 1;
  let delta = (1 - curvatureMinMax) / lastIndex;
  for (let i = 0; i < lastIndex; i++) {
    links[i].curvature = curvatureMinMax + i * delta;
  }
});

// Compute the curvature for links sharing the same two nodes to avoid overlaps
Object.keys(sameNodesLinks)
  .filter((nodePairId) => sameNodesLinks[nodePairId].length > 1)
  .forEach((nodePairId) => {
    let links = sameNodesLinks[nodePairId];
    let lastIndex = links.length - 1;
    let lastLink = links[lastIndex];
    lastLink.curvature = curvatureMinMax;
    let delta = (2 * curvatureMinMax) / lastIndex;
    for (let i = 0; i < lastIndex; i++) {
      links[i].curvature = -curvatureMinMax + i * delta;
      if (lastLink.source !== links[i].source) {
        links[i].curvature *= -1; // flip it around, otherwise they overlap
      }
    }
  });

/////////////////////////////////////

const graphDiv = document.getElementById('graph');
const snapInDistance = 15;
const snapOutDistance = 25;

const updateGraphData = () =>
  Graph.graphData({
    nodes: gData.nodes,
    links: gData.links,
  });

const distance = (node1, node2) =>
  Math.sqrt(Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2));

const rename = (nodeOrLink, type) => {
  let value = prompt('Name this ' + type + ':', nodeOrLink.name);
  if (!value) return;
  nodeOrLink.name = value;
  updateGraphData();
};

const setInterimLink = (source, target) => {
  let linkId = linkIdCounter++;
  interimLink = {
    id: linkId,
    source: source,
    target: target,
    name: 'link_' + linkId,
  };
  gData.links.push(interimLink);
  updateGraphData();
};

const removeLink = (link) => links.splice(links.indexOf(link), 1);

const removeInterimLinkWithoutAddingIt = () => {
  removeLink(interimLink);
  interimLink = null;
  updateGraphData();
};

const removeNode = (node) => {
  gData.links
    .filter((link) => link.source === node || link.target === node)
    .forEach((link) => removeLink(link));
  gData.nodes.splice(gData.nodes.indexOf(node), 1);
};

const Graph = ForceGraph()(graphDiv)
  .linkCurvature('curvature')
  .linkDirectionalArrowLength(6)
  .linkDirectionalArrowRelPos(1)
  .onNodeDrag((dragNode) => {
    dragSourceNode = dragNode;
    for (let node of gData.nodes) {
      if (dragNode === node) {
        continue;
      }
      // close enough: snap onto node as target for suggested link
      if (!interimLink && distance(dragNode, node) < snapInDistance) {
        setInterimLink(dragSourceNode, node);
      }
      // close enough to other node: snap over to other node as target for suggested link
      if (
        interimLink &&
        node !== interimLink.target &&
        distance(dragNode, node) < snapInDistance
      ) {
        removeLink(interimLink);
        setInterimLink(dragSourceNode, node);
      }
    }
    // far away enough: snap out of the current target node
    if (
      interimLink &&
      distance(dragNode, interimLink.target) > snapOutDistance
    ) {
      removeInterimLinkWithoutAddingIt();
    }
  })
  .onNodeDragEnd(() => {
    dragSourceNode = null;
    interimLink = null;
    updateGraphData();
  })
  .nodeColor((node) =>
    node === dragSourceNode ||
    (interimLink &&
      (node === interimLink.source || node === interimLink.target))
      ? 'orange'
      : null
  )
  .linkColor((link) => (link === interimLink ? 'orange' : '#bbbbbb'))
  .linkLineDash((link) => (link === interimLink ? [2, 2] : []))
  .onNodeClick((node, event) => rename(node, 'node'))
  .onNodeRightClick((node, event) => removeNode(node))
  .onLinkClick((link, event) => rename(link, 'link'))
  .onLinkRightClick((link, event) => removeLink(link))
  .onBackgroundClick((event) => {
    let coords = Graph.screen2GraphCoords(event.layerX, event.layerY);
    let nodeId = nodeIdCounter++;
    gData.nodes.push({
      id: nodeId,
      x: coords.x,
      y: coords.y,
      name: 'node_' + nodeId,
    });
    updateGraphData();
  });
updateGraphData();
