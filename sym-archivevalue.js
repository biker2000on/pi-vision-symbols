(function (PV) {
	"use strict";

	function symbolVis() { };
	PV.deriveVisualizationFromBase(symbolVis);

	var definition = { 
		typeName: "archivevalue",
		visObjectType: symbolVis,
		datasourceBehavior: PV.Extensibility.Enums.DatasourceBehaviors.Mulitple,
		getDefaultConfig: function(){ 
			return { 
				DataShape: 'Timeseries',
				Height: 150,
				Width: 150, 
				BackgroundColor: "#ff5733",
				AltBackgroundColor: "blue",
				BorderRadius: 10,
				DisplayDigits: 1,
			} 
		},
		configOptions: function(){
			return [
				{
					title: 'format title',
					mode: 'format'
				}
			]
		}
	}

	var dataItems = [
		{Time: "12/20/2018 2:00", Value: 12},
		{Time: "12/25/2018 14:00", Value: 28}
	]

	symbolVis.prototype.init = function(scope, elem) {
		this.onDataUpdate = dataUpdate
		// scope.Values = dataItems
		// console.log(scope.Values)
		function dataUpdate(data) {
			// console.log(data)
			if (!data) return
			var attribute = data.Data[0]
			if (attribute.Label) {
				scope.Label = attribute.Label
				scope.Units = attribute.Units
			}
			scope.Values = attribute.Values
			console.log(scope.Values)
		}
	 };

	PV.symbolCatalog.register(definition); 
})(window.PIVisualization); 
