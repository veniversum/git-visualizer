var access_token = 'f1aff3072a385154ffe18aed3b893aa46ce8577c';

var width = window.innerWidth;
var height = window.innerHeight;
var margin = 20;
var pad = margin / 2;
var root;
var treeData = [];

function getRepo() {
  var owner = $('input#owner').val(),
    repo = $('input#repo').val();
  $.ajax({
    url: "https://api.github.com/repos/" + owner + "/" + repo + "/commits",
    data: {
      access_token: access_token
    },
    success: function (data) {
      var sha = data[0].sha,
        url = "https://api.github.com/repos/" + owner + "/" + repo + "/git/trees/" + sha + "?recursive=1&access_token=" + access_token;
      init(url);
    }
  });
}

var color = d3.scale.category20b();

var force = d3.layout.force()
  .gravity(0.2)
  .charge(-220)
  .size([width, height])
  .linkStrength(0.9)
  .linkDistance(function (d) {
    return d.source.type === 'tree' && d.target.type === 'tree' ? 1 : 10;
  })
  .on("tick", tick);

var outer = d3.select("body").append("svg")
  .call(d3.behavior.zoom().on("zoom", rescale))
  .on("dblclick.zoom", null)
  .attr("width", width)
  .attr("height", height)
  .attr("pointer-events", "all");

var svg = outer.append('svg:g');

//Rescale function, called on zoom event
function rescale() {
  trans = d3.event.translate;
  scale = d3.event.scale;
  svg.attr("transform",
    "translate(" + trans + ")" + " scale(" + scale + ")");
}


var link = svg.selectAll(".link"),
  node = svg.selectAll(".node");

function init(url) {
  treeData = [];
  root = null;
  d3.json(url, function (error, json) {
    if (error) {
      return console.warn(error);
    }
    json.tree.forEach(function (o) {
      var indexSlash = o.path.lastIndexOf('/');
      if (indexSlash < 0) {
        o.parent = 'root';
        o.filename = o.path;
        o.name = o.path;
      } else {
        o.parent = o.path.substr(0, indexSlash);
        o.filename = o.path.substr(indexSlash + 1);
        o.name = o.path;
      }
    });
    json.tree.unshift({
      "path": "root",
      "type": "tree",
      "size": 0,
      "parent": null,
      "filename": "root",
      "name": "root"
    });
    var dataMap = json.tree.reduce(function (map, node) {
      map[node.path] = node;
      return map;
    }, {});
    json.tree.forEach(function (node) {
      // add to parent
      var parent = dataMap[node.parent];
      if (parent) {
        // create child array if it doesn't exist
        (parent.children || (parent.children = []))
        .push(node);
      } else {
        // parent is null or missing
        treeData.push(node);
      }
    });
    root = treeData[0];
    update();
  });
  //}
}

function update() {
  var nodes = flatten(root),
    links = d3.layout.tree().links(nodes);

  // Restart the force layout.
  force
    .nodes(nodes)
    .links(links)
    .start();

  // Update the links…
  link = link.data(links, function (d) {
    return d.target.id;
  });

  // Exit any old links.
  link.exit().remove();

  // Enter any new links.
  link.enter().insert("line", ".node")
    .attr("class", "link")
    .attr("x1", function (d) {
      return d.source.x;
    })
    .attr("y1", function (d) {
      return d.source.y;
    })
    .attr("x2", function (d) {
      return d.target.x;
    })
    .attr("y2", function (d) {
      return d.target.y;
    });

  // Update the nodes…
  node = node.data(nodes, function (d) {
    return d.id;
  }).style("fill", function (d) {
    return d.name === "root" ? '#f00' : d.type === "tree" ? "#ccc" : color(d.filename.lastIndexOf('.') >= 0 ? d.filename.substring(d.filename.lastIndexOf('.')) : "others");
  });

  // Exit any old nodes.
  node.exit().remove();

  // Enter any new nodes.
  node.enter().append("circle")
    .attr("class", "node")
    .attr("cx", function (d) {
      return d.x;
    })
    .attr("cy", function (d) {
      return d.y;
    })
    .attr("r", function (d) {
      return d.name === "root" ? 10 : d.type === 'tree' ? 7 : Math.log(d.size + 1) || 3;
    })
    .style("fill", function (d) {
      return d.name === "root" ? '#f00' : d.type === "tree" ? "#ccc" : color(d.filename.lastIndexOf('.') >= 0 ? d.filename.substring(d.filename.lastIndexOf('.')) : "others");
    })
    .on("click", click)
    .on('mouseover', function (d) {
      var ancestors = listAncestors(d);
      link.style('stroke-width', function (l) {
        if (ancestors.indexOf(l.target.name) >= 0)
          return 4;
        else
          return 2;
      });
      link.style('stroke', function (l) {
        if (ancestors.indexOf(l.target.name) >= 0)
          return "#ff8080";
        else
          return '#9ecae1';
      });
      node.style('stroke', function (n) {
        if (ancestors.indexOf(n.name) >= 0)
          return "#ff8080";
        else
          return '#3182bd';
      });
    })
    .on('mouseout', function () {
      link.style('stroke-width', 2);
      link.style('stroke', '#9ecae1');
      node.style('stroke', '#3182bd');
    });

  //Update legend
  var legend = outer.selectAll(".legend")
    .data(color.domain())
    .enter().append("g")
    .attr("class", "legend")
    .attr("transform", function (d, i) {
      return "translate(-5," + (i * 20 + 5) + ")";
    });

  legend.append("rect")
    .attr("x", width - 18)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", color);

  legend.append("text")
    .attr("x", width - 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(function (d) {
      return d;
    });

  var styleTooltip = function (name) {
    return "<p class='filename'>" + name + "</p>";
  };


  svg.selectAll("circle.node")
    .each(function (v) {
      $(this).tipsy({
        gravity: "w",
        opacity: 1,
        html: true,
        title: function () {
          var d = this.__data__;
          return styleTooltip(d.filename);
        }
      });
    });
}

function tick() {
  link.attr("x1", function (d) {
      return d.source.x;
    })
    .attr("y1", function (d) {
      return d.source.y;
    })
    .attr("x2", function (d) {
      return d.target.x;
    })
    .attr("y2", function (d) {
      return d.target.y;
    });

  node.attr("cx", function (d) {
      return d.x;
    })
    .attr("cy", function (d) {
      return d.y;
    });
}

// Toggle children on click.
function click(d) {
  //if (!d3.event.defaultPrevented) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update();
  // }
}

function listAncestors(d) {
  var ancestors = [];
  ancestors.push(d.name);
  var cur = d.parent;
  ancestors.push(cur);
  while (cur != null) {
    node.each(function (n) {
      if (n.name === cur) {
        cur = n.parent;
        ancestors.push(cur);
      }
    });
    return ancestors;
  }
}

// Returns a list of all nodes under the root.
function flatten(root) {
  var nodes = [],
    i = 0;

  function recurse(node) {
    if (node.children) node.children.forEach(recurse);
    if (!node.id) node.id = ++i;
    nodes.push(node);
  }

  recurse(root);
  return nodes;
}