(function (PV) {
	"use strict";

	function symbolVis() { };
	PV.deriveVisualizationFromBase(symbolVis);

	var definition = { 
		typeName: "datagrid",
		visObjectType: symbolVis,
		datasourceBehavior: PV.Extensibility.Enums.DatasourceBehaviors.Multiple,
		getDefaultConfig: function(){ 
			return { 
				DataShape: 'Timeseries',
				Height: 500,
				Width: 800 
			} 
		}
	}

	function getConfig() {
		var columnDefs = [
			{headerName: "Timestamp", field: 'time'},
			{headerName: "sortableDate", field: 'datetime'},
		]
	
		// let the grid know which columns and what data to use
		return {
			columnDefs: columnDefs,
			enableSorting: true,
			enableFilter: true,
			enableColResize: true,
		};

	}


	symbolVis.prototype.init = function(scope, elem) { 
		var container = elem.find('#grid')[0]
		container.id = 'grid_' + scope.symbol.Name
		var gridOptions = getConfig()
		new agGrid.Grid(container, gridOptions)

		this.onDataUpdate = dataUpdate

		function convertDataToGrid(data) {
			var timestamps = data.Data.reduce((a,c,i) => {
				c.Values.forEach(e => {
					if (a.indexOf(e.Time) == -1) {
						a.push(e.Time)
					}
				});
				return a
			}, [])

			var dataGridRows = timestamps.map(item => {
				var items = {
					time: item,
					datetime: convertDateToNumber(item)
				}
				data.Data.forEach((c,i) => {
					let index = c.Values.map(e => e.Time).indexOf(item)
					if (index == -1) {
						items["value" + i] = ""
					} else {
						items["value" + i] = c.Values[index].Value
					}
				})
				return items
			})
			console.log(dataGridRows)
			return dataGridRows
		}

		function convertDateToNumber(date) {
			// this function converts the string date into an integer that can be compared to each other
			var pos1 = date.indexOf('/')
			var pos2 = date.slice(pos1 + 1, date.length).indexOf('/') + pos1 + 1
			var month = date.slice(0,pos1)
			var day = date.slice(pos1+1,pos2)
			var year = date.slice(pos2+1, pos2+5)
			if (date.slice(-2, -1) == "A") {
				var hour = date.slice(-11,-9).trim()
			} else {
				var hour = date.slice(-11,-9).trim()*1.0 + 12
			}
			var minute = date.slice(-8, -6)
			var seconds =  date.slice(-5, -3)
			var sortableDate = (year * 10000000000 + month * 100000000 + day * 1000000 + 
													hour * 10000 + minute * 100 + seconds) / 100
			// console.log(sortableDate)
			return sortableDate
		}

		function dataUpdate(data) {
			console.log(data.Data)
			if (!data) return
			if (data.Data[0].Label) {
				var cols = data.Data.map((v,i) => {
					return {
						headerName: v.Label, 
						field: "value"+i, 
						editable: true
					}
				})
				cols.unshift({headerName: "sortableDate", field: 'datetime'})
				cols.unshift({headerName: "Timestamp", field: 'time'})
				gridOptions.api.setColumnDefs(cols)
			}
			gridOptions.api.setRowData(convertDataToGrid(data))
		}

		
	};

	PV.symbolCatalog.register(definition); 
})(window.PIVisualization); 
