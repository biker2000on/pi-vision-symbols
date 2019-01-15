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
				Width: 800, 
				defaultSort: 'desc',
				warningBackgroundColor: 'lightsalmon',
				warningTextColor: 'darkred',

			} 
		}
	}

	function getConfig() {
		var columnDefs = [
			{headerName: "Timestamp", field: 'time', comparator: dateComparison},
			{headerName: "sortableDate", field: 'datetime'},
		]
	
		// let the grid know which columns and what data to use
		return {
			columnDefs: columnDefs,
			enableSorting: true,
			enableFilter: true,
			enableColResize: true,
			onCellValueChanged: function(event) {
				console.log(event)
				if (event.colDef.field === "time") return
				alert("Time: " + event.data.time + " New Value: " + event.newValue + "\nOld Value: " + event.oldValue + " Data Item: " + event.colDef.headerName)
				// the below column resetter doesn't work. colDefs keeps returning undefined...
				// gridOptions.api.setColumnDefs(event.columnApi.columnController.colDefs)
			}
		};

	}

	function dateComparison(d1, d2) {
		var date1 = convertDateToNumber(d1)
		var date2 = convertDateToNumber(d2)
		if (date1 === null && date2 === null) return 10000000000000000000000000
		if (date1 === null) return 10000000000000000000000000
		if (date2 === null) return 10000000000000000000000000
		return date2 - date1
	}
	
	function convertDateToNumber(date) {
		// this function converts the string date into an integer that can be compared to each 
		if (date == undefined || date == null || date.length < 10) return null;
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
	var gridOptions = getConfig()
	
	symbolVis.prototype.init = function(scope, elem) { 
		var container = elem.find('#grid')[0]
		container.id = 'grid_' + scope.symbol.Name
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
			// Adds a blank line at the end.
			timestamps.push("")

			var dataGridRows = timestamps.map(item => {
				var items = {
					time: item,
					// datetime: convertDateToNumber(item)
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
			// console.log(dataGridRows)
			return dataGridRows
		}

		function dataUpdate(data) {
			// console.log(data)
			if (!data) return
			if (data.Data[0].Label) {
				var cols = data.Data.map((v,i) => {
					return {
						headerName: v.Label, 
						field: "value"+i, 
						editable: true,
						cellStyle: function(params) {
							if (parseFloat(params.value) < 15) {
								return {
									backgroundColor: scope.config.warningBackgroundColor, 
									color: scope.config.warningTextColor
								}
							} else {return null}
						},
					}
				})
				// cols.unshift({headerName: "sortableDate", field: 'datetime'})
				cols.unshift({
					headerName: "Timestamp", 
					field: 'time', 
					comparator: dateComparison, 
					sort: scope.config.defaultSort,
					editable: true,
				})
				gridOptions.api.setColumnDefs(cols)
			}
			gridOptions.api.setRowData(convertDataToGrid(data))
		}

		
	};

	PV.symbolCatalog.register(definition); 
})(window.PIVisualization); 
