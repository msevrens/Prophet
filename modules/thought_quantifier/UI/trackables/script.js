buildTrackablesVisualization = (function($){

	var globalData = {};

	var beaming = "M 13 21 C 13 43 50 43 50 21",
		happy = "M 17 30 S 28 48 48 30 53 34",
		pleasant = "M 19 34 S 27 41 46 35 50 33",
		neutral = "M 26 35 S 27 36 40 35 41 29",
		unpleasant = "M 19 34 S 29 30 46 35 50 33",
		sad = "M17, 35 C29,18 51,30 51,35",
		depressed = "M17, 35 C23,12 51,22 51,35";
	
	var states = [depressed, sad, unpleasant, neutral, pleasant, happy, beaming];

	/* Get URL Parameter */

	function getURLParameter(name) {
		return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
	}

	/* Update URL Parameters */

	function updateURL(uri, key, value) {
		var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");	
		var separator = uri.indexOf('?') !== -1 ? "&" : "?";
		if (uri.match(re)) {
			return uri.replace(re, '$1' + key + "=" + value + '$2');
		}
		else {
			return uri + separator + key + "=" + value;
		}
	}

	/* Find intermediate states between paths */

	function pathTween(d1, precision) {
		return function() {
		    var path0 = d3.select(".mouth").node(),
				path1 = path0.cloneNode(),
				n0 = path0.getTotalLength(),
				n1 = (path1.setAttribute("d", d1), path1).getTotalLength();

			// Uniform sampling of distance based on specified precision.
			var distances = [0], i = 0, dt = precision / Math.max(n0, n1);
			while ((i += dt) < 1) distances.push(i);
			distances.push(1);

			// Compute point-interpolators at each distance.
			var points = distances.map(function(t) {
				var p0 = path0.getPointAtLength(t * n0),
					p1 = path1.getPointAtLength(t * n1);
				return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
			});

			return function(t) {
				return t < 1 ? "M" + points.map(function(p) { return p(t); }).join("L") : d1;
			};
		};
	}

	/* Produce all transition functions */

	function stateLookup(states) {

		var path = d3.select(".mouth"),
			tFuncs = [],
			tFunc;

		for (var i = 0; i < states.length; i++) {
			if (i == states.length - 1) break
			path.attr("d", states[i])
			tFunc = pathTween(states[i + 1] , 4)()
			tFuncs.push(tFunc)
		}

		path.attr("d", neutral)

		return tFuncs

	}

	/* Prepare Data for Visualization */

	function formatData(data) {

		var trackable = [],
			format = d3.time.format("%Y-%m-%d");

		data.forEach(function(day) {
			if (parseFloat(day["trackable"], 10) != 0) {
				m_row = {
					"value" : parseFloat(day["value"], 10), 
					"key" : "trackable", 
					"date" : format.parse(day["date"])
				}
				trackable.push(m_row)
			}
				 
		})

		return trackable

	}

	/* Calculate Moving Average */
	function movingAvg(n) {
		return function (points) {
			points = points.map(function(each, index, array) {
				var to = index + n - 1;
				var subSeq, sum;
				if (to < points.length) {
					subSeq = array.slice(index, to + 1);
					sum = subSeq.reduce(function(a,b) { return [a[0] + b[0], a[1] + b[1]]; });
					return sum.map(function(each) { return each / n; });
				}
				return undefined;
			});
			points = points.filter(function(each) { return typeof each !== 'undefined' });
			pathDesc = d3.svg.line().interpolate("basis")(points)
			return pathDesc.slice(1, pathDesc.length);
		}
	}

	function updateChart() {

		var tag = $("select.tag-list").val(),
			method = d3.select("input.method-toggle").property("checked"),
			groupby = d3.select("input.groupby-toggle").property("checked"),
			url = updateURL(window.location.href, "tag", tag.substring(1));

		method = method == true ? "sum" : "average"
		groupby = groupby == true ? "week" : "day"
		url = updateURL(url, "method", method);
		url = updateURL(url, "groupby", groupby);

		window.location.href = url;

	}

	function buildChart(data) {

		globalData = data;

		var margin = 15,
			width = window.innerWidth - margin,
			height = window.innerHeight / 2.5,
			fatLineWidth = width / 40,
			legendWidth = 0.1 * width,
			legendWidth = (legendWidth > 100) ? 100 : legendWidth,
			chartWidth = width - legendWidth,
			faceSize = 0.7 * legendWidth,
			axisHeight = 20
			contextHeight = .15 * height,
			focusHeight = height - contextHeight;

		var svg = d3.select(".trackables-chart").append("svg")
			.attr("class", "main-svg")
			.attr("width", chartWidth)
			.attr("height", height + axisHeight);

		var context = svg.append("g")
			.attr("class", "context");

		var focus = svg.append("g")
    		.attr("class", "focus")
    		.attr("transform", "translate(0, " + contextHeight + ")");

		var legend = d3.select(".trackables-chart").append("svg")
			.attr("class", "legend")
			.attr("height", height)
			.attr("width", legendWidth);

		// Tooltip
		var tooltip = legend.append("text")
			.attr("x", 10)
			.attr("y", 10)

		var tooltipValue = legend.append("text")
			.attr("x", 10)
			.attr("y", 30)

		// Set Up Controls

		var tagDefault = getURLParameter("tag") ? getURLParameter("tag") : "temporalFocus",
			groupbyDefaultStr = getURLParameter("groupby") ? getURLParameter("groupby") : "week",
			groupbyDefault = groupbyDefaultStr == "week" ? true : false,
			methodDefaultStr = getURLParameter("method") ? getURLParameter("method") : "average",
			methodDefault = methodDefaultStr == "sum" ? true : false;

		var tagList = d3.select(".trackables-chart").append("select")
			.attr("class", "form-control form-control-sm tag-list")
			.on("change", updateChart)
			.style("float", "left")
			.style("width", "130px")
			.style("margin", "15px")

		var options = tagList.selectAll("option")
			.data(trackables.reverse())
			.enter()
			.append("option")
			.property("selected", function(d) {
			 	return d == "#" + tagDefault ? true : false
			})
			.text(function(d){return d});

		var methodSelect = d3.select(".trackables-chart").append("input")
			.attr("class", "method-toggle")
			.style("margin", "15px")
			.attr("type", "checkbox")
			.property("checked", methodDefault)
			.attr("data-toggle", "toggle")
			.attr("data-on", "Sum")
			.attr("data-off", "Average")

		var groupbyToggle = d3.select(".trackables-chart").append("input")
			.attr("class", "groupby-toggle")
			.style("margin", "15px")
			.attr("type", "checkbox")
			.property("checked", groupbyDefault)
			.attr("data-toggle", "toggle")
			.attr("data-on", "Weekly")
			.attr("data-off", "Daily")

		/*
		var maxMinToggle = d3.select(".trackables-chart").append("input")
			.attr("class", "max-min-toggle")
			.style("margin", "15px")
			.attr("type", "checkbox")
			.attr("data-toggle", "toggle")
			.attr("data-on", ":)")
			.attr("data-off", ":(") */

		// Set Listeners
		$('.groupby-toggle').change(updateChart)
		$('.method-toggle').change(updateChart)

		// Visual Y-Axis
		var faceContainer = legend.append("g")
			.attr("class", "face-container")
			.attr("transform", "translate(" + (legendWidth - faceSize) / 2 + ", 0)");

		faceContainer.append("circle")
			.attr("class", "face")
			.attr("fill", "#e8e8e8")
			.attr("r", faceSize / 2)
			.attr("cx", faceSize / 2)
			.attr("cy", height / 2);

		// Eyes
		faceContainer.append("circle")
			.attr("class", "eye")
			.attr("cx", (faceSize / 2) - (faceSize / 5))
			.attr("cy", (height / 2) - (faceSize / 6))
			.attr("r", faceSize / 28)
			.attr("fill", "black");

		faceContainer.append("circle")
			.attr("class", "eye")
			.attr("cx", (faceSize / 2) + (faceSize / 5))
			.attr("cy", (height / 2) - (faceSize / 6))
			.attr("r", faceSize / 28)
			.attr("fill", "black");

		// Set base face to neutral
		var mouthPosY = (height / 2) - (faceSize / 2) + (faceSize / 4),
			mouthPosX = 1.25,
			mouthScale = width / 960,
			mouthScale = (mouthScale > 1.043) ? 1.043 : mouthScale;

		faceContainer.append("path")
			.attr("class", "mouth")
			.attr("transform", "translate(" + mouthPosX + "," + mouthPosY + ")scale(" + mouthScale + "," + mouthScale + ")")
			.attr("d", neutral)

		// Get Facial State Map
		var stateMap = stateLookup(states);

		// Data
		var trackable = formatData(data);

		// Gradients
		var trackableRange = d3.extent(trackable, function(d) { return d["value"] }),
			format = d3.time.format("%Y-%m-%d"),
			timeRange = d3.extent(data, function(d) { return format.parse(d["date"])});

		var tag = "#" + tagDefault,
			trackableRange = tag == "#temporalFocus" ? [-1, 1] : trackableRange;

		var moodColors = ['#694a69', 'steelblue', 'yellow'],
			tfColors = ["#8E2B2B", "#3276B1", "#50457B"],
			colorGradient = tag == "#temporalFocus" ? tfColors : moodColors;

		var colorScale = d3.scale.linear().domain([-1, 0, 1]).range(colorGradient);

		var scaleMargin = fatLineWidth / 3,
			focusXScale = d3.time.scale().domain(timeRange).range([scaleMargin, chartWidth - scaleMargin]),
			contextXScale = d3.time.scale().domain(timeRange).range([0, chartWidth]),
			y = d3.scale.linear().domain([-1, 1]).range([height - scaleMargin, scaleMargin])
			mY = d3.scale.linear().domain(trackableRange).range([height - scaleMargin, scaleMargin])
			cy = d3.scale.linear().domain([-1, 1]).range([contextHeight, 0]),
			cmy = d3.scale.linear().domain(trackableRange).range([contextHeight, 0]);

		// Selection and Brushing
		var brush = d3.svg.brush()
			.x(contextXScale)
			.on("brush", function() {
				focusXScale.domain(brush.empty() ? timeRange : brush.extent());
				focus.selectAll("path").attr("d", line);
				focus.selectAll("circle")
					.attr("r", dotSize)
					.attr("cx", function(d) { return focusXScale(d.date); })
					.attr("cy", function(d) { return mY(d.value); });
				focus.select(".x.axis").call(XAxis);
			});

		var maSpread = globalData.length < 10 ? 2 : 5

		// Line 
		var line = d3.svg.line()
			.interpolate(movingAvg(maSpread))
			.x(function(d) { return focusXScale(d.date); })
			.y(function(d) { return mY(d.value); });

		// Line 
		var contextLine = d3.svg.line()
			.interpolate(movingAvg(maSpread))
			.x(function(d) { return focusXScale(d.date); })
			.y(function(d) { return cmy(d.value); });
		
		// Draw Axes
		var formatMillisecond = d3.time.format(".%L"),
		    formatSecond = d3.time.format(":%S"),
		    formatMinute = d3.time.format("%I:%M"),
		    formatHour = d3.time.format("%I %p"),
		    formatDay = d3.time.format("%a %d"),
		    formatWeek = d3.time.format("%b %d"),
		    formatMonth = d3.time.format("%b"),
		    formatYear = d3.time.format("%Y");

		function multiFormat(date) {
		  return (d3.time.second(date) < date ? formatMillisecond
		      : d3.time.minute(date) < date ? formatSecond
		      : d3.time.hour(date) < date ? formatMinute
		      : d3.time.day(date) < date ? formatHour
		      : d3.time.month(date) < date ? (d3.time.week(date) < date ? formatDay : formatWeek)
		      : d3.time.year(date) < date ? formatMonth
		      : formatYear)(date);
		}

		var XAxis = d3.svg.axis().scale(focusXScale).orient("bottom").tickFormat(multiFormat);
		
		var axis = focus.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0, " + height + ")")
			.call(XAxis);

		// Draw Moving Average
		focus.append("path")
			.datum(trackable)
			.attr("class", "fat-line")
			.attr("stroke-width", fatLineWidth + "px")
			.attr("d", line);

		var path = focus.append("path")
			.datum(trackable)
			.attr("class", "line")
			.attr("d", line);

		// Add Brush
		var contextPath = context.append("path")
			.datum(trackable)
			.style("stroke-width", "3px")
			.style("stroke", "#ececec")
			.style("fill", "none")
			.attr("d", contextLine);

		context.append("g")
			.attr("class", "x brush")
			.call(brush)
			.selectAll("rect")
			.attr("height", contextHeight);

		// Scatterplot
		var dotSize = (width > 800) ? 2 : 1; 

		focus.selectAll("dot")
			.data(trackable)
			.enter().append("circle")
			.attr("r", dotSize)
			.attr("cx", function(d) { return focusXScale(d.date); })
			.attr("cy", function(d) { return mY(d.value); });

		var pathEl = path.node(),
			pathLength = pathEl.getTotalLength();
		
		// Ghost Data
		if (methodDefaultStr == "sum") {
			var yAverage = pathEl.getPointAtLength(pathLength)["y"],
				yesterdayAverage = mY.invert(yAverage),
				now = new Date(),
				lastDateLogged = format.parse(globalData[globalData.length - 1]["date"]),
				millisElapsed = now - lastDateLogged,
				millisInPeriod = (groupbyDefaultStr == "week") ? 604800000 : 86400000,
				percentIntoDay = millisElapsed / millisInPeriod
				ghostY = percentIntoDay * yesterdayAverage;

			if (groupbyDefaultStr == "week") {
				if (millisElapsed < 604800000) {
					var ghostData = focus.append("circle")
						.attr("class", "ghost-data")
						.attr("r", dotSize)
						.attr("cx", chartWidth - 2)
						.attr("cy", function(d) { return mY(ghostY); });
				}
			} else {
				if (millisElapsed < 86400000) {
					var ghostData = focus.append("circle")
						.attr("class", "ghost-data")
						.attr("r", dotSize)
						.attr("cx", chartWidth - 2)
						.attr("cy", function(d) { return mY(ghostY); });
				}
			}

		}

		// Track Line
		var circle = focus.append("circle")
          .attr("cx", 100)
          .attr("cy", 350)
          .attr("r", 3)
          .attr("fill", "steelblue");

        var funcScale = d3.scale.linear().domain([-1, 1]).range([0, 6]),
        	timeFormat = d3.time.format("%m/%d/%Y");

		// Interactive Face
		focus.on("mousemove", function() {
			var mouse = d3.mouse(this),
				xPos = mouse[0],
				beginning = mouse[0], 
				end = pathLength;
				
			var target;
			var pos;

			while (true) {
				target = Math.floor((beginning + end) / 2);
				pos = pathEl.getPointAtLength(target);
				if ((target === end || target === beginning) && pos.x !== xPos) {
					break;
				}
				if (pos.x > xPos) end = target;
				else if (pos.x < xPos) beginning = target;
				else				break; //position found
			}

			circle
				.attr("opacity", 1)
				.attr("cx", pos.x)
				.attr("cy", pos.y);

			var scaledY = y.invert(pos.y),
				date = focusXScale.invert(pos.x),
				color = colorScale(scaledY),
				scaledIndex = funcScale(scaledY),
				funcToUse = Math.floor(scaledIndex),
				t = scaledIndex % 1,
				newMouthLine = stateMap[funcToUse](t);

			tooltipValue.text(Math.round(mY.invert(pos.y) * 100) / 100)
				.style("font-size", "11px")
				.style("font-family", "Quicksand")
				.style("fill", "grey");

			tooltip.text(timeFormat(date))
				.style("font-size", "11px")
				.style("font-family", "Quicksand")
				.style("fill", "grey");
			
			d3.select(".mouth")
				.attr("d", newMouthLine)

			var faceOpacity = tag == "#temporalFocus" ? 0.9 : 0.5;

			d3.select(".legend .face")
				.style("opacity", faceOpacity)
				.attr("fill", color);

  		});

		// Baseline
		focus.append("line")
			.style("stroke", "black")
			.style("opacity", 0.1)  // colour the line
			.attr("x1", 0)	 // x position of the first end of the line
			.attr("y1", height / 2)	  // y position of the first end of the line
			.attr("x2", chartWidth)	 // x position of the second end of the line
			.attr("y2", height / 2);	// y position of the second end of the line

		// Bottom of Context
		context.append("line")
			.style("stroke", "black")
			.style("opacity", 0.2)
			.attr("x1", 100)
			.attr("y1", contextHeight)
			.attr("x2", chartWidth - 100)
			.attr("y2", contextHeight);

		// Gradients
		svg.append("linearGradient")
			.attr("id", "temperature-gradient")
			.attr("gradientUnits", "userSpaceOnUse")
			.attr("x1", 0).attr("y1", y(-1))
			.attr("x2", 0).attr("y2", y(1))
			.selectAll("stop")
			.data([
				{offset: "0%", color: colorGradient[0]}, // black, red, purple
				{offset: "50%", color: colorGradient[1]},
				{offset: "100%", color: colorGradient[2]}
			])
			.enter().append("stop")
			.attr("offset", function(d) { return d.offset; })
			.attr("stop-color", function(d) { return d.color; });

	}

	return buildChart

})(jQuery);