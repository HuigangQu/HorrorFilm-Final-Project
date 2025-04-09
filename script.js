// Load both CSV files concurrently.
Promise.all([
    d3.csv("data/Project Data - Horror Movies.csv"),
    d3.csv("data/Project Data - Non-Horror Movies.csv")
  ]).then(([horrorData, nonHorrorData]) => {
    
    // Parse numeric values for each dataset.
    horrorData.forEach(d => {
      d.Year = +d.Year;
      d["Combined Score"] = +d["Combined Score"];
    });
    nonHorrorData.forEach(d => {
      d.Year = +d.Year;
      d["Combined Score"] = +d["Combined Score"];
    });
    
    // For the horror movies file, make sure to filter by Genre (if needed).
    const horrorFilms = horrorData.filter(d => d.Genre === "Horror");
    // For non‑horror movies we assume the file contains only non‑horror films.
    
    // Create a graph for each dataset.
    const horrorGraph = createGraph(horrorFilms, "Horror Movies");
    const nonHorrorGraph = createGraph(nonHorrorData, "Non‑Horror Movies");
    
    // Create an outer container with a flex layout to display graphs side-by-side.
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexWrap = "wrap";
    container.style.justifyContent = "space-around";
    container.style.alignItems = "flex-start";
    container.style.gap = "20px";
    
    container.appendChild(horrorGraph);
    container.appendChild(nonHorrorGraph);
    
    // Append the container to the body.
    document.body.appendChild(container);
    
  }).catch(error => {
    console.error("Error loading CSV files:", error);
  });
  
  
  /* ------------------------------
     FUNCTION: createGraph
     ------------------------------
     Given an array of film objects and a title string, this function:
     • Sorts films by release year.
     • Computes per‑film label offsets and rotations based on whether the film’s
       Combined Score is a local peak or valley.
     • Creates an SVG line chart with circles and rotated text labels.
     • Adds a replay button to re‐animate the line drawing.
     • Wraps the SVG and button (with a title) in a container div and returns it.
  --------------------------------- */
  function createGraph(films, title) {
    // Sort films in ascending order by Year.
    films.sort((a, b) => a.Year - b.Year);
    
    // Compute label offsets and rotations.
    // For interior points: if a point’s score is higher than both neighbors, mark it as a peak.
    // If it is lower than both neighbors, it’s a valley.
    // For peaks, set labelOffset = –10 and rotation = 45°, for valleys, offset = +10 and rotation = –45°.
    // For the first and last points (or neutral points) default to offset –10 and no rotation.
    films.forEach((d, i, arr) => {
      if (i > 0 && i < arr.length - 1) {
        if (d["Combined Score"] > arr[i - 1]["Combined Score"] &&
            d["Combined Score"] > arr[i + 1]["Combined Score"]) {
          d.labelOffset = -10;
          d.labelRotation = 0;
        } else if (d["Combined Score"] < arr[i - 1]["Combined Score"] &&
                   d["Combined Score"] < arr[i + 1]["Combined Score"]) {
          d.labelOffset = 15;
          d.labelRotation = 0;
        } else {
          d.labelOffset = -10;
          d.labelRotation = 0;
        }
      } else {
        d.labelOffset = -10;
        d.labelRotation = 0;
      }
    });
    
    // Chart dimensions and margins.
    const width = 928;
    const height = 720;
    const marginTop = 20;
    const marginRight = 30;
    const marginBottom = 30;
    const marginLeft = 40;
    
    // Define positional scales.
    const x = d3.scaleLinear()
        .domain(d3.extent(films, d => d.Year)).nice()
        .range([marginLeft, width - marginRight]);
    
    const y = d3.scaleLinear()
        .domain([0, 100]) // Combined Score on a 0–100 scale.
        .range([height - marginBottom, marginTop]);
    
    // Define the line generator using a smooth curve.
    const lineGen = d3.line()
        .curve(d3.curveCatmullRom)
        .x(d => x(d.Year))
        .y(d => y(d["Combined Score"]));
    
    // Create the SVG element.
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;");
    
    // Add the x-axis.
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).ticks(width / 80).tickFormat(d3.format("d")))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("y2", -height)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", width - 4)
            .attr("y", -4)
            .attr("font-weight", "bold")
            .attr("text-anchor", "end")
            .attr("fill", "currentColor")
            .text("Year"));
    
    // Add the y-axis.
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).ticks(null).tickFormat(d => d))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width)
            .attr("stroke-opacity", 0.1))
        .call(g => g.select(".tick:last-of-type text").clone()
            .attr("x", 4)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text("Combined Score"));
    
    // Append the line path.
    const path = svg.append("path")
        .datum(films)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", lineGen);
    
    // Get the total length of the path (for animation purposes).
    const totalLength = path.node().getTotalLength();
    
    // Define a function to replay the line-drawing animation.
    function replayAnimation() {
      path.interrupt()
          .attr("stroke-dasharray", `0,${totalLength}`)
        .transition()
          .duration(5000)
          .ease(d3.easeLinear)
          .attr("stroke-dasharray", `${totalLength},${totalLength}`);
    }
    // Immediately start the animation.
    replayAnimation();
    
    // Add circles at each data point.
    svg.append("g")
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
      .selectAll("circle")
      .data(films)
      .join("circle")
        .attr("cx", d => x(d.Year))
        .attr("cy", d => y(d["Combined Score"]))
        .attr("r", 3);
    
    // Add film name labels for each data point.
    // Each text element is translated to its point (with an offset) and rotated by its computed angle.
    const labels = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
      .selectAll("text")
      .data(films)
      .join("text")
        .attr("text-anchor", "middle")
        .attr("transform", d =>
           `translate(${x(d.Year)},${y(d["Combined Score"]) + d.labelOffset}) rotate(${d.labelRotation})`
        )
        .attr("fill-opacity", 0)
        .text(d => d.Film)
        .attr("fill", "currentColor")
        // Use a white stroke behind text for better readability.
        .attr("stroke", "white")
        .attr("paint-order", "stroke");
    
    // Animate the appearance of the labels.
    labels.transition()
        .delay((d, i) => (i / films.length) * 5000)
        .attr("fill-opacity", 1);
    
    // Create a Replay button for this graph.
    const replayButton = document.createElement("button");
    replayButton.textContent = "Replay Animation";
    replayButton.style.display = "block";
    replayButton.style.margin = "20px auto";
    replayButton.addEventListener("click", replayAnimation);
    
    // Wrap the graph in a container with a title and replay button.
    const graphContainer = document.createElement("div");
    graphContainer.style.margin = "10px";
    graphContainer.style.flex = "1 1 auto";
    graphContainer.style.maxWidth = "960px";
    
    const titleEl = document.createElement("h2");
    titleEl.textContent = title;
    titleEl.style.textAlign = "center";
    
    graphContainer.appendChild(titleEl);
    graphContainer.appendChild(svg.node());
    graphContainer.appendChild(replayButton);
    
    return graphContainer;
  }
  