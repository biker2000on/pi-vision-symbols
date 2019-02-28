(function (PV) {
	"use strict";

	function symbolVis() { };
	PV.deriveVisualizationFromBase(symbolVis);

	var definition = { 
		typeName: "plotlyECDF",
		displayName: "Durational Curves",
		visObjectType: symbolVis,
		datasourceBehavior: PV.Extensibility.Enums.DatasourceBehaviors.Multiple,
		getDefaultConfig: function(){ 
			return { 
				DataShape: 'Timeseries',
				Height: 300,
				Width: 300,
				backgroundColor: 'white',
				defaultTraceColor: 'blue',
				traceColor: [],
				cumulative: false, 
				title: "Durational Curve",
				Intervals: 10000,
				labels: [],
			} 
		},
		configOptions: function () {
			return [{
					title: 'Format Symbol',
					mode: 'format'
			}];
		},
		configure: {
			deleteTrace: configDeleteTrace
		}
	}

	symbolVis.prototype.init = function(scope, elem) { 
		this.onDataUpdate = dataUpdate 
		this.onConfigChange = configChange 
		this.onResize = resize 

		// Get container div
		var container = elem.find('#ecdf')[0]
		container.id = 'ecdf_' + scope.symbol.Name
		// Create a variable to hold the custom visualization object
		var customVisualizationObject = false;
		// Create a variable to hold the combined data array
		var dataArray = [];
		var indexArray = []
		var plotlydata = []


		function dataUpdate(data) {
			// If there is indeed new data in the update
			// console.log("New data received: ", data);
			// console.log(data.Data)
			if (data !== null && data.Data) {
				dataArray = [ [] ];
				indexArray = [[]]
				// Check for an error
				if (data.Data[0].ErrorDescription) {
					console.log(data.Data[0].ErrorDescription);
				}
				// If the custom visualization hasn't been made yet... create the custom visualization!
				// Custom code begins here:
				// -----------------------------------------------------------------------------------------
				if (data.Data[0]) {
					if (scope.config.traceColor.length !== scope.symbol.DataSources.length) {
						data.Data.map((c,i) => scope.config.traceColor.push(scope.config.defaultTraceColor))
					}
					// Store all of the 3 data item labels in the data item labels global variable
					if (data.Data[0].Label && scope.config.labels.length !== scope.symbol.DataSources.length) {
						console.log("updated labels")
						scope.config.labels = []
						data.Data.map((c,i) => {
							scope.config.labels.push(c.Label)
						})
					}

					// Format the data as a new array that can be easily plotted
					data.Data.map((c,j) => {
						dataArray.push([])
						indexArray.push([])
						for (var i = 0, len = c.Values.length; i < len; i++) {
							// Try to parse the values
							if (!isNaN(c.Values[i].Value)) {
								var newXValue = parseFloat( ("" + c.Values[i].Value).replace(",", "") );
								dataArray[j].push(newXValue);
								indexArray[j].push(i / len)
							}
						}
					})
					dataArray.forEach(e =>  {
						e.sort((a,b) => a - b)
					})
				}
				// console.log("Data array: ", dataArray);
				// Create the custom visualization
				if (!customVisualizationObject) {
					customVisualizationObject = true;
					plotlydata = []
					dataArray.map((c,i) => {
						let trace = {
							type: 'scatter',
							mode: 'lines',
							y: c,
							x: indexArray[i],
							marker: {
								color: scope.config.traceColor[i],
							}, 
							line: {
								shape: 'linear',
							},
							name: scope.config.labels[i],
						}
						plotlydata.push(trace)
					})
					
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
						// console.log("Data: ", plotlydata)
						// console.log("layout: ", layout)
						// console.log("Validate: ", out)
						Plotly.newPlot(container, plotlydata, layout);
					}, 3000)
				} else {
					// Update the data
					plotlydata = []
					dataArray.map((c,i) => {
						let trace = {
							type: 'scatter',
							mode: 'lines',
							y: c,
							x: indexArray[i],
							marker: {
								color: scope.config.traceColor[i],
							}, 
							line: {
								shape: 'linear',
							},
							name: scope.config.labels[i],
						}
						plotlydata.push(trace)
					})
					
					var layout = {
						title: scope.config.title,
					}
					var out = Plotly.validate(plotlydata)
					// console.log("Validate: ", out)
					// Refresh the graph
					Plotly.react(container, plotlydata, layout);
				}
			}
		}

		function resize() {
			Plotly.Plots.resize(container);
		}

		function configChange(newConfig, oldConfig) {
			scope.$root.$broadcast('refreshDataForChangedSymbols');		
		}

	};

	function configDeleteTrace(scope){
		// console.log(scope)
		var index = scope.runtimeData.selectedStream;
		var datasources = scope.symbol.DataSources;
		var labels = scope.config.labels;
		var traceColor = scope.config.traceColor
		
		if (datasources.length > 1) {
			datasources.splice(index,1);   
			labels.splice(index,1)
			traceColor.splice(index,1)
			scope.$root.$broadcast('refreshDataForChangedSymbols');		
		}
	};

	PV.symbolCatalog.register(definition); 
})(window.PIVisualization); 
