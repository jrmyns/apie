d3.json("./aiToolsData.json").then(function (data) {
  // Function to sort children by the name's length, this has an appealing
  //visual effect on reading the AI tools in the Pie
  function sortChildrenByName(node) {
    if (node.children && Array.isArray(node.children)) {
      // Sort the children array by the 'length of name' property
      node.children.sort((a, b) => a.name.length - b.name.length);
      // Recursively sort children of children
      node.children.forEach((child) => sortChildrenByName(child));
    }
  }
  // Start sorting from the root
  sortChildrenByName(data);

  const width = Math.min(window.innerWidth * 0.95, 960); // 90% of screen width, max 960px
  const height = Math.min(window.innerHeight * 0.95, 700); // 80% of screen height, max 700px

  const radius = Math.min(width, height) / 2;

  const customColors = [
    "#66c2a5", // Color 1 from Set2
    "#fc8d62", // Color 2 from Set2
    "#8da0cb", // Color 3 from Set2
    "#e78ac3", // Color 4 from Set2
    "#a6d854", // Color 5 from Set2
    "#ffd92f", // Color 6 from Set2
    "#e5c494", // Color 7 from Set2
    "#b3b3b3", // Color 8 from Set2
    "#cccc77", // Extra color 1 (Gray)
    "#ccccaa", // Extra color 2 (Lighter Gray)
  ];

  const color = d3.scaleOrdinal(customColors);

  const partition = d3.partition().size([2 * Math.PI, radius]);

  const root = d3
    .hierarchy(data)
    .sum((d) => d.value || 1)
    .sort((a, b) => b.value - a.value);

  partition(root);

  // Predefined factors for innerRadius and outerRadius based on depth
  const innerRadiusFactors = [0, 0.15, 0.37, 0.65];
  //the outerRadius of the level of depth nth is the innerRadius of the next level of depth(nth+1)
  const outerRadiusFactors = innerRadiusFactors.slice(1).concat(0.97); //this delete the first element in innerRadiusFactors list and add the last outer factor to the list

  const arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .innerRadius((d) => {
      // Use predefined factors for depths 0-6, otherwise fallback to d.y0
      return innerRadiusFactors[d.depth] !== null
        ? radius * innerRadiusFactors[d.depth]
        : d.y0;
    })
    .outerRadius((d) => {
      // Use predefined factors for depths 0-6, otherwise fallback to d.y1
      return outerRadiusFactors[d.depth] !== null
        ? radius * outerRadiusFactors[d.depth]
        : d.y1;
    });

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  svg
    .append("defs")
    .append("radialGradient")
    .attr("id", "sphere-gradient") //add a  spherical effect to the fill disc in the center of the pie
    .attr("cx", "50%")
    .attr("cy", "50%")
    .attr("r", "50%")
    .attr("fx", "50%")
    .attr("fy", "50%")
    .selectAll("stop")
    .data([
      { offset: "0%", color: "#099" }, // Light color at the center
      { offset: "100%", color: "#000" }, // Darker color at the edges
    ])
    .enter()
    .append("stop")
    .attr("offset", (d) => d.offset)
    .attr("stop-color", (d) => d.color);

  const tooltip = d3.select("#tooltip");

  function shadeColor(color, percent) {
    console.log("ShadeColor Input:", color, percent);
    if (!color) return "#ccc";

    let r, g, b;

    if (color.startsWith("rgb")) {
      //in case I switch to predefined colors scheme in the future, but in this project I used manually predefined colors
      color = color.substring(4, color.length - 1).replace(/ /g, "");
      [r, g, b] = color.split(",").map(Number);
    } else if (color.startsWith("#")) {
      r = parseInt(color.substring(1, 3), 16);
      g = parseInt(color.substring(3, 5), 16);
      b = parseInt(color.substring(5, 7), 16);
    } else {
      console.error("Invalid color format:", color);
      return "#ccc";
    }

    r = parseInt((r * (100 + percent)) / 100);
    g = parseInt((g * (100 + percent)) / 100);
    b = parseInt((b * (100 + percent)) / 100);

    r = r < 255 ? r : 255;
    g = g < 255 ? g : 255;
    b = b < 255 ? b : 255;

    let rr =
      r.toString(16).length === 1 ? "0" + r.toString(16) : r.toString(16);
    let gg =
      g.toString(16).length === 1 ? "0" + g.toString(16) : g.toString(16);
    let bb =
      b.toString(16).length === 1 ? "0" + b.toString(16) : b.toString(16);

    console.log("ShadeColor Output:", "#" + rr + gg + bb);
    return "#" + rr + gg + bb;
  }

  const allPaths = svg
    .selectAll("path")
    .data(root.descendants().filter((d) => d.depth))
    .enter()
    .append("path")
    .attr("d", arc)
    .style("stroke", "#7777");

  allPaths
    .style("fill", function (d) {
      console.log("Current Data (Depth):", d.depth);
      if (d.depth === 0) return "#fff";
      if (d.depth === 1) {
        return color(d.data.name);
      } else {
        let ancestor = d.ancestors()[1];
        let ancestorPath = allPaths
          .filter((a) => a.data.name === ancestor.data.name)
          .node();
        let ancestorColor = ancestorPath
          ? d3.select(ancestorPath).style("fill")
          : "#ccc";
        console.log("Ancestor Color:", ancestorColor);
        let percent = (d.depth - 1) * 7;
        console.log("Percent:", percent);
        console.log("About to call shadeColor with", ancestorColor, percent);

        if (ancestorColor && ancestorColor !== "none") {
          return shadeColor(ancestorColor, percent);
        } else {
          return "#ccc";
        }
      }
    })
    .on("mouseover", function (d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      const planTags = d.data.plan
        ? d.data.plan
            .map((plan) => {
              let color;
              if (plan === "Free") color = "blue";
              else if (plan === "Freemium") color = "green";
              else if (plan === "Paid") color = "darkorange";
              else if (plan === "Open") color = "teal";
              return `<span style="color: white; background-color: ${color}; padding: 2px 5px; border-radius: 3px; margin-right: 5px;">${plan}</span>`;
            })
            .join(" ")
        : "";
      tooltip
        .html(
          d.data.name +
            (d.data.plan ? "<br>" + planTags : "") +
            (d.data.description ? "<br>" + d.data.description : "")
        )
        .style("left", d3.event.pageX + "px")
        .style("top", d3.event.pageY - 28 + "px")
        .style("white-space", "pre-wrap")
        .style("max-width", 250 + "px")
        //.style("font-family","monospace")
        .style("text-align", "justify")
        .style("word-break", "break-word")
        .style("overflow-wrap", "break-word");
    })
    .on("mouseout", function (d) {
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", function (d) {
      if (d.data.url) {
        window.open(d.data.url, "_blank");
      }
    });

  // Add text labels for arcs

  svg
    .selectAll("g")
    .data(root.descendants().filter((d) => d.depth > 0 && d.value > 1))
    .enter()
    .append("g")
    .attr("class", "arc")
    .attr("transform", (d) => `translate(${arc.centroid(d)})`)
    .append("text")
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .style("font-size", (d) => {
      const arcLength = ((d.x1 - d.x0) ** 2 + (d.y1 - d.y0) ** 2) ** 0.5; // Approximate arc length
      const textLength = d.data.name.length * 8; // Approximate text length (8px per character)
      const fontSize = Math.min(12, (arcLength / textLength) * 40); // Adjust font size
      //const fontSize=12*(d.depth**0.05);
      return `${fontSize}px`;
    })

    .selectAll("tspan")
    .data((d) => {
      const maxChars = 16; // Maximum number of characters to display
      const text = d.data.name;

      // If the text is longer than maxChars, truncate it and add "..."
      const truncatedText =
        text.length > maxChars ? text.slice(0, maxChars) + "" : text;

      // Return the truncated text as a single-element array
      return [truncatedText];
    })
    .enter()
    .append("tspan")
    .attr("x", 0) // Align all lines horizontally
    .attr("dy", (d, i) => (i === 0 ? "0" : "1.2em")) // Add vertical spacing between lines
    .text((d) => d) // Render each line
    .filter(function (d, i, nodes) {
      // Apply rotation logic to the parent <text> element
      const textElement = d3.select(this.parentNode);
      const angle =
        (((d3.select(this.parentNode).datum().x0 +
          d3.select(this.parentNode).datum().x1) /
          2) *
          180) /
          Math.PI -
        90;

      // Check if the text is on the left side (angle between 90 and 270 degrees)
      if (angle > 90 && angle < 270) {
        textElement.attr("transform", `rotate(${angle + 180})`); // Rotate text upright
        textElement.attr("text-anchor", "middle"); // Center text horizontally
        textElement.attr("dy", "0.35em"); // Adjust vertical alignment
      } else {
        textElement.attr("transform", `rotate(${angle})`); // Keep text rotated to follow the arc
        textElement.attr("text-anchor", "middle"); // Center text horizontally
        textElement.attr("dy", "0.35em"); // Adjust vertical alignment
      }

      return true;
    });

  // Add a group for the circle and text
  const centerGroup = svg
    .append("g")
    .attr("class", "center-group")
    .on("mouseover", function () {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(data.description)
        .style("left", d3.event.pageX + "px")
        .style("top", d3.event.pageY - 28 + "px")
        .style("white-space", "pre-wrap")
        .style("max-width", "250px")
        .style("text-align", "justify")
        .style("word-break", "break-word")
        .style("overflow-wrap", "break-word");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", function () {
      window.open(data.url, "_blank");
    });

  // Add a full arc (circle) to the group in the center
  centerGroup
    .append("circle")
    .attr("r", radius * 0.12) // Adjust the radius to fit the text
    .style("fill", "url(#sphere-gradient)") // Apply the gradient
    .attr("class", "center-circle"); // Apply the CSS class
  // Add the main entry name "ApIe" to the group
  centerGroup
    .append("text")
    .attr("text-anchor", "middle")
    .attr("class", "center-root-text") // Apply the CSS class
    .attr("dy", ".35em")
    .text(data.name);
});
