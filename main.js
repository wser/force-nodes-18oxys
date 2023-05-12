import './style.css';

// prettier-ignore
let nodeIdCounter = 0, linkIdCounter = 0;
// prettier-ignore
let nodes = [], links = [];
// prettier-ignore
let dragSourceNode = null, interimLink = null;

const graphDiv = document.getElementById('graph');
const snapInDistance = 15;
const snapOutDistance = 25;

const updateGraphData = () => {
  Graph.graphData({ nodes: nodes, links: links });
};

const distance = (node1, node2) => {
  return Math.sqrt(
    Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2)
  );
};

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
  links.push(interimLink);
  updateGraphData();
};

const removeLink = (link) => links.splice(links.indexOf(link), 1);

const removeInterimLinkWithoutAddingIt = () => {
  removeLink(interimLink);
  interimLink = null;
  updateGraphData();
};

const removeNode = (node) => {
  links
    .filter((link) => link.source === node || link.target === node)
    .forEach((link) => removeLink(link));
  nodes.splice(nodes.indexOf(node), 1);
};

const Graph = ForceGraph()(graphDiv)
  .linkDirectionalArrowLength(4)
  .linkDirectionalArrowRelPos(1)
  .onNodeDrag((dragNode) => {
    dragSourceNode = dragNode;
    for (let node of nodes) {
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
    nodes.push({
      id: nodeId,
      x: coords.x,
      y: coords.y,
      name: 'node_' + nodeId,
    });
    updateGraphData();
  });
updateGraphData();