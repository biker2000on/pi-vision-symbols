(function (PV) {
	"use strict";

	function symbolVis() { };
	PV.deriveVisualizationFromBase(symbolVis);

	var definition = { 
		typeName: "plotlyHistogram",
		displayName: "Histogram",
		visObjectType: symbolVis,
		datasourceBehavior: PV.Extensibility.Enums.DatasourceBehaviors.Single,
		getDefaultConfig: function(){ 
			return { 
				DataShape: 'Timeseries',
				Height: 150,
				Width: 150,
				backgroundColor: 'white',
				traceColor: 'blue',
				cumulative: false, 
				title: "Histogram",
				Intervals: 10000,
			} 
		},
		configOptions: function () {
			return [{
					title: 'Format Symbol',
					mode: 'format'
			}];
		},
	}

	symbolVis.prototype.init = function(scope, elem) { 
		this.onDataUpdate = dataUpdate 
		// this.onConfigChange = configChange 
		this.onResize = resize 

		// Get container div
		var container = elem.find('#hist')[0]
		container.id = 'histogram_' + scope.symbol.Name
		// Create a variable to hold the custom visualization object
		var customVisualizationObject = false;
		// Create a variable to hold the combined data array
		var dataArray = [];

		function dataUpdate(data) {
			// If there is indeed new data in the update
			// console.log("New data received: ", data);
			if (data !== null && data.Data) {
				dataArray = [ [] ];
				// Check for an error
				if (data.Data[0].ErrorDescription) {
					console.log(data.Data[0].ErrorDescription);
				}
				// If the custom visualization hasn't been made yet... create the custom visualization!
				// Custom code begins here:
				// -----------------------------------------------------------------------------------------
				if (data.Data[0]) {
					
					// Store all of the 3 data item labels in the data item labels global variable
					if (data.Data[0].Label && data.Data[0].Units) {
						scope.config.title = data.Data[0].Label + " (" + data.Data[0].Units + ")";;
					}

					// Format the data as a new array that can be easily plotted
					for (var i = 0; i < data.Data[0].Values.length; i++) {
						// Try to parse the values
						var newXValue = parseFloat( ("" + data.Data[0].Values[i].Value).replace(",", "") );
						if (!isNaN(newXValue)) {
							dataArray[0].push(newXValue);
						}
					}
				}
				console.log("Data array: ", dataArray);
				// Create the custom visualization
				if (!customVisualizationObject) {
					customVisualizationObject = true;
					var plotlydata = [
						{
							// opacity:0.8,
							type: 'histogram',
							// cumulative: {enabled: scope.config.cumulative},
							x: dataArray[0],
							marker: {
								color: scope.config.traceColor,
							}
						}
					];
					var layout = {
						title: scope.config.title,
						// autosize: true,
						// paper_bgcolor: scope.config.backgroundColor
					};
					// var config = {
					// 	showLink: false,
					// 	displaylogo: false,
					// 	editable: false,
					// 	modeBarButtonsToRemove: ["sendDataToCloud"]
					// };
					setTimeout(function() {
						var out = Plotly.validate(plotlydata, layout)
						console.log("Data: ", plotlydata)
						console.log("layout: ", layout)
						console.log("Validate: ", out)
						Plotly.newPlot(container, plotlydata, layout);
					}, 3000)
				} else {
					// Update the data
					var plotlydata = [
						{
							opacity:0.8,
							type: 'histogram',
							// cumulative: {enabled: scope.config.cumulative},
							x: dataArray[0],
							marker: {
								color: scope.config.traceColor,
							}
						}
					];
					var layout = {
						title: scope.config.title,
					}
					var out = Plotly.validate(plotlydata)
					console.log("Validate: ", out)
					// Refresh the graph
					Plotly.react(container, plotlydata, layout);
				}
			}
		}

		function resize() {
			Plotly.Plots.resize(container);
		}

	};

	PV.symbolCatalog.register(definition); 
})(window.PIVisualization); 
