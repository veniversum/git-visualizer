var getContents = function (owner, repo, path) {
  'use strict';
  var tmp = null;
  $.ajax({
    async: false,
    url: "https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path,
    data: {
      access_token: '<INSERT YOUR OWN>'
    },
    success: function (data) {
      for (c in data) {
        if (data[c].type == 'dir') {
          data[c].children = getContents(owner, repo, data[c].path);
        }
      }
      tmp = data;
    }
  });
  return tmp;
}

var getRepo = function (owner, repo) {
  if (owner == "atom" && repo == "atom")
    return
  return getContents(owner, repo, '');
}


var width = window.innerWidth * 0.98;
var height = window.innerHeight * 0.98;
var margin = 20;
var pad = margin / 2;

var root;
var treeData = [];

var color = d3.scale.category20b();

var force = d3.layout.force()
  .gravity(0.2)
  .charge(-100)
  .size([width, height])
  .linkStrength(1)
  .distance(5)
  .on("tick", tick);

var outer = d3.select("body").append("svg")
  .call(d3.behavior.zoom().on("zoom", rescale))
  .on("dblclick.zoom", null)
  .attr("width", width)
  .attr("height", height)
  .attr("pointer-events", "all");

var svg = outer.append('svg:g')

//Rescale function, called on zoom event
function rescale() {
  trans = d3.event.translate;
  scale = d3.event.scale;
  svg.attr("transform",
    "translate(" + trans + ")" + " scale(" + scale + ")");
}

var link = svg.selectAll(".link"),
  node = svg.selectAll(".node");

function init() {
  if ($('input#owner').val() == "atom" && $('input#repo').val() == "atom") {
    d3.json("/data/atom.json", function (error, json) {
      if (error) return console.warn(error);
      root = {
        "name": "root",
        "children": json
      };
      update();
    });
  } else if ($('input#owner').val() == "Microsoft" && $('input#repo').val() == "CNTK") {
    d3.json("/data/CNTK.json", function (error, json) {
      if (error) return console.warn(error);
      root = {
        "name": "root",
        "children": json
      };
      update();
    });
  } else {
    /*var json = getRepo($('input#owner').val(), $('input#repo').val());
    root = {
      "name": "root",
      "children": json
    };
    update();*/
    d3.json("/data/meta.json", function (error, json) {
      if (error) return console.warn(error);
      console.log(json)
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
      console.log(dataMap);
      json.tree.forEach(function (node) {
        // add to parent
        var parent = dataMap[node.parent];
        if (parent) {
          // create child array if it doesn't exist
          (parent.children || (parent.children = []))
          // add node to child array
          .push(node);
        } else {
          // parent is null or missing
          treeData.push(node);
        }
      });
      root = treeData[0];
      update();
    });
  }
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
    return d.name == "root" ? '#f00' : d.type == "dir" ? "#777" : color(d.name.lastIndexOf('.') >= 0 ? d.name.substring(d.name.lastIndexOf('.')) : "Other");
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
      return d.name == "root" ? 10 : Math.log(d.size + 1) || 3;
    })
    .style("fill", function (d) {
      return d.name == "root" ? '#f00' : d.type == "dir" ? "#777" : color(d.name.lastIndexOf('.') >= 0 ? d.name.substring(d.name.lastIndexOf('.')) : "others");
    })
    .on("click", click)
    /*.on("mouseover", function (d, i) {
      addTooltip(d, d3.select(this));
    })
    .on("mouseout", function (d, i) {
      d3.select("#tooltip").remove();
    })*/
    .call(force.drag);

  var legend = outer.selectAll(".legend")
    .data(color.domain())
    .enter().append("g")
    .attr("class", "legend")
    .attr("transform", function (d, i) {
      return "translate(0," + i * 20 + ")";
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

  /*svg.append("g")
    .attr("class", "legend")
    .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; })
  .append("rect")
    .attr("x", width - 18)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", "#f00")
    .append("text")
    .attr("x", width - 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text("ROOT");*/
  var styleTooltip = function (name) {
    return "<p class='description'>" + name + "</p>";
  };


  svg.selectAll("circle.node")
    .each(function (v) {
      $(this).tipsy({
        gravity: "w",
        opacity: 1,
        html: true,
        title: function () {
          var d = this.__data__;
          return styleTooltip(d.name)
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

// Color leaf nodes orange, and packages white or blue.
/*function color(d) {
  return d.name=="root" ? 
          "#ff0000" : 
          d.type=="dir" ? "#777777": d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
}*/



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

function mouseover(d) {
  d.append("text")
    .text(function (d) {
      return d.x;
    })
    .attr("x", function (d) {
      return x(d.x);
    })
    .attr("y", function (d) {
      return y(d.y);
    });
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

// Generates a tooltip for a SVG circle element based on its ID
function addTooltip(d, circle) {
  var x = parseFloat(circle.attr("cx"));
  var y = parseFloat(circle.attr("cy"));
  var r = parseFloat(circle.attr("r"));

  var tooltip = d3.select("svg")
    .append("text")
    .text(d.name)
    .attr("x", x)
    .attr("y", y)
    .attr("dy", -r * 2)
    .attr("id", "tooltip");

  var offset = tooltip.node().getBBox().width / 2;

  if ((x - offset) < 0) {
    tooltip.attr("text-anchor", "start");
    tooltip.attr("dx", -r);
  } else if ((x + offset) > (width - margin)) {
    tooltip.attr("text-anchor", "end");
    tooltip.attr("dx", r);
  } else {
    tooltip.attr("text-anchor", "middle");
    tooltip.attr("dx", 0);
  }
}