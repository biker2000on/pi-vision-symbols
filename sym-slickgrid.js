(function (PV) {
	"use strict";

	function symbolVis() { };
	PV.deriveVisualizationFromBase(symbolVis);

	var definition = { 
		typeName: "slickgrid",
		displayName: "Excel-Like Data Grid",
		visObjectType: symbolVis,
		datasourceBehavior: PV.Extensibility.Enums.DatasourceBehaviors.Multiple,
		noExpandSelector: '.youshallnotpass',
		iconUrl: '/Scripts/app/editor/symbols/ext/Icons/grid.svg',
		getDefaultConfig: function(){ 
			return { 
				DataShape: 'Timeseries',
				Height: 500,
				Width: 500, 
				defaultTimestamp: '*',
				colorLevels: [],
				defaultColorLevel: [12,15,17,18],
				colWidths: [],
				headers: [],
				good: "#aaffaa",
				warning: "#ffbb66",
				alarm: "#ff7777",
				defaultEditor: Slick.Editors.Float,
				editors: [],
			} 
		},
		configOptions: function () {
			return [{
					title: 'Format Symbol',
					mode: 'format'
			}];
		},
		inject: ['$http', '$q'],
		configure: {
			deleteTrace: configDeleteTrace
		}
	}

	var grid
	var start
	var baseUrl = PV.ClientSettings.PIWebAPIUrl.replace(/\/?$/, '/'); //Example: "https://server.domain.com/piwebapi/";
	// console.log(baseUrl)	
	
	
	symbolVis.prototype.init = function(scope, elem, $http, $q) { 
		var container = elem.find('#grid')[0]
		container.id = 'grid_' + scope.symbol.Name
		this.onDataUpdate = dataUpdate
		this.onConfigChange = configChange
		let j = 0

		function statusFormatter(row, cell, value, columnDef, dataContext) {
			var rtn = { text: value, removeClasses: 'red orange green' };
			let ll = scope.config.colorLevels[columnDef.field[5]][0]
			let lo = scope.config.colorLevels[columnDef.field[5]][1]
			let hi = scope.config.colorLevels[columnDef.field[5]][2]
			let hh = scope.config.colorLevels[columnDef.field[5]][3]
      if (value !== null || value !== "") {
        if (value < ll) {
          rtn.addClasses = "red";
        } else if (value < lo) {
          rtn.addClasses =  "orange";
        } else if (value < hi) {
          rtn.addClasses =  "green";
        } else if (value < hh) {
					rtn.addClasses = "orange"
				} else {
					rtn.addClasses = "red"
				}
      }
      return rtn;
		}
		
		var columns = getConfig()

		var options = {
			editable: true,
			enableCellNavigation: true,
			enableColumnReorder: false,
			enableAddRow: true,
			asyncEditorLoading: false,
			autoEdit: true,
			editCommandHandler: queueAndExecuteCommand,
		};

		let datum = []
		datum[0] = {timestamp: "1/1/2019 12:00:00 AM"}
		datum[1] = {timestamp: "1/2/2019 12:00:00 AM"}
		scope.runtimeData.dataGridRows = datum

		grid = new Slick.Grid(container, datum, columns, options);
		grid.setSortColumn("timestamp", true)
		grid.setSelectionModel(new Slick.CellSelectionModel());

		function queueAndExecuteCommand(item, column, editCommand) {
			console.log(item, column, editCommand)
			scope.runtimeData.previousValue = editCommand.prevSerializedValue
			console.log(scope.runtimeData.previousValue)
			editCommand.execute()
		}
		
		grid.onAddNewRow.subscribe(function (e, args) {
			// add logic for checking if timestamp column or other colums and submit any column change not timestamp
			console.log("new row")
			console.log(e, args)
			var item = args.item;
			scope.runtimeData.item = item
			if (item.timestamp) {
				scope.runtimeData.dataGridRows.push(item);
				grid.setData(scope.runtimeData.dataGridRows, false)
				grid.render();
			} else {
				//grid.invalidateRow(scope.runtimeData.dataGridRows.length);
				//submit data to PI
				scope.runtimeData.dataGridRows.push(item);
				grid.setData(scope.runtimeData.dataGridRows, false)
				//grid.updateRowCount();
				grid.render();
			}
    });

		function gridSorter(sortCol, sortAsc) {
			// console.log("called grid sorter")
			var col = sortCol;
			scope.runtimeData.sign = sortAsc ? 1 : -1
			scope.runtimeData.sortedCol = sortCol
      scope.runtimeData.dataGridRows.sort(function (dataRow1, dataRow2) {
				var field = scope.runtimeData.sortedCol.field;
				if (field == "timestamp") {
					var value1 = convertDateToNumber(dataRow1[field])
					var value2 = convertDateToNumber(dataRow2[field])
				} else {
					var value1 = dataRow1[field], value2 = dataRow2[field];
				}
				var result = (value1 == value2 ? 0 : (value1 > value2 ? 1 : -1)) * scope.runtimeData.sign;
				if (result != 0) {
					return result;
				}
				return 0;
			});
			grid.invalidate();
			grid.setData(scope.runtimeData.dataGridRows)
      grid.render();
		}

		grid.onSort.subscribe(function (e, args) {
			// console.log(e, args)
			gridSorter(args.sortCol, args.sortAsc)
    });
				
		grid.onColumnsResized.subscribe(function (e, args) {
			//Loop through columns
			let cols = grid.getColumns()
			for(var i = 0; i < cols.length; i++){
				var column = cols[i];
				//Check if column width has changed
				if (column.width != column.previousWidth){
					//Found a changed column - there may be multiple so all columns must be checked
					scope.config.colWidths[i] = column.width
				}
			}
		}); 

		grid.onCellChange.subscribe(function (e,args) {
			// console.log(e,args)
			// submit changes to PI here.
			var time = args.item.timestamp
			if (args.cell) { // returns true if value is not the timestamp column
				getStreams(scope.config.DataSources)
				var editedField = "value" + (args.cell - 1)
				var value = args.item[editedField]
				value = value ? value : ""
				// send data object to PIWebAPI
				sendValues(args.cell - 1, time, value)
				console.log("sent values " + time + "   " + value)
				// reset undefined item definition
				scope.runtimeData.item = false
				//force refresh of data grid
			}
		})

		// Scope setup
		if (scope.config.colorLevels == false) {
			scope.config.colorLevels = scope.symbol.DataSources.map(function(c) {
				return scope.config.defaultColorLevel
			})
		}
		
		getStreams(scope.symbol.DataSources).then(function(streams){
			scope.runtimeData.streamList = streams;
			scope.config.streamFriendlyNames =  scope.config.streamFriendlyNames.length > 0 ? scope.config.streamFriendlyNames : getFriendlyNameList(scope.runtimeData.streamList);
			scope.config.headers = scope.config.streamFriendlyNames
			console.log("headers: ", scope.config.headers)
		});

		function getConfig() {
			let columns = [
				{id: 'timestamp', name: 'Datetime', field: 'timestamp', sortable: true, editor: Slick.Editors.Text},
			]
			return columns
		};
	
		function dateComparison(d1, d2) {
			var date1 = convertDateToNumber(d1)
			var date2 = convertDateToNumber(d2)
			if (date1 === null && date2 === null) return 0
			if (date1 === null) return -1
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
				if (hour == 12) {hour = 0}
			} else {
				var hour = date.slice(-11,-9).trim()*1.0 + 12
			}
			var minute = date.slice(-8, -6)
			var seconds =  date.slice(-5, -3)
			var sortableDate = (year * 10000000000 + month * 100000000 + day * 1000000 + 
													hour * 10000 + minute * 100 + seconds) / 100
			return sortableDate
		}
		
		function convertDataToGrid(data) {
			// returns an array of only timestamps, not the object
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
					timestamp: item,
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
			// console.log(dataGridRows)
			return dataGridRows
		}

		
		function dataUpdate(data) {
			// console.log(data)
			j++
			if (!data) return
			if (data.Data[0].Label) {
				// console.log("sporadic update")
				// console.log(data)
				let oldCols = grid.getColumns().map((col,i) => {
					return col.name
				})
				if (scope.config.headers && scope.config.colWidths.length != 0) {
					var cols = data.Data.map((v,i) => {
						return {
							id: "value" + i, 
							name: scope.config.headers[i],
							field: "value"+i, 
							formatter: statusFormatter,
							minWidth: 80,
							sortable: true,
							width: scope.config.colWidths[i+1],
							editor: Slick.Editors.Float,
						}
					})
				} else {
					var cols = data.Data.map((v,i) => {
						scope.config.headers[i] = v.Label
						return {
							id: "value" + i, 
							name: v.Label,
							field: "value"+i, 
							formatter: statusFormatter,
							minWidth: 80,
							sortable: true,
							editor: Slick.Editors.Float,
						}
					})
				}
				// Add editor mapping for Slick.Editors.Float, Text, Integer, LongText
				// cols.map((c,i) => {
					
				// })
				// cols.unshift({headerName: "sortableDate", field: 'datetime'})
				cols.unshift(getConfig()[0])
				if (scope.config.colWidths.length != 0) {
					cols[0].width = scope.config.colWidths[0]
				}
				// console.log("column update")
				let check = cols.map(col => col.name)
				// console.log(cols)
				// console.log(oldCols, check)
				if (JSON.stringify(oldCols) == JSON.stringify(check)) {
					return
				} else {
					grid.setColumns(cols)
					console.log(grid.getColumns()[0])
					gridSorter(grid.getColumns()[0], true)

					// grid.render()
					console.log("Updated Columns on the following data update: ", j)
				}
				// setTimeout(function() {gridOptions.api.setColumnDefs(cols)},0)
			}

			
			scope.runtimeData.oldDataGridRows = scope.runtimeData.dataGridRows
			scope.runtimeData.dataGridRows = convertDataToGrid(data)
			if (scope.runtimeData.sortedCol) {
				scope.runtimeData.sortedDataGridRows = scope.runtimeData.dataGridRows.sort(function (dataRow1, dataRow2) {
					var field = scope.runtimeData.sortedCol.field;
					if (field == "timestamp") {
						var value1 = convertDateToNumber(dataRow1[field])
						var value2 = convertDateToNumber(dataRow2[field])
					} else {
						var value1 = dataRow1[field], value2 = dataRow2[field];
					}
					var result = (value1 == value2 ? 0 : (value1 > value2 ? 1 : -1)) * scope.runtimeData.sign;
					if (result != 0) {
						return result;
					}
					return 0;
				})
			} else {
				scope.runtimeData.sortedDataGridRows = scope.runtimeData.dataGridRows
			}
			if (angular.equals(scope.runtimeData.oldDataGridRows,scope.runtimeData.sortedDataGridRows)) {
				return
			} 
			if (scope.runtimeData.item) {
				scope.runtimeData.sortedDataGridRows.push(scope.runtimeData.item)
			}
			if (angular.equals(scope.runtimeData.oldDataGridRows,scope.runtimeData.sortedDataGridRows) && Boolean(scope.runtimeData.item)) {
				return
			}
			grid.setData(scope.runtimeData.dataGridRows, false)
			grid.render()
		}

		//Editor for writing data
		function PIDatetimeTextEditor(args) {
			var $input;
			var defaultValue;
			var scope = this;
			var dateVal
			var tzoffset = (new Date()).getTimezoneOffset() * 60000;
			var now = new Date(new Date() - tzoffset).toISOString().slice(0,-1)
	
			this.init = function () {
				console.log(now, tzoffset)
				var editField = args.column.field
				var originalVal = args.item[editField]
				if (originalVal) {
					dateVal = new Date(new Date(originalVal) - tzoffset).toISOString().slice(0, -1)
					// dateVal = new Date(originalVal).toISOString().slice(0,19)
				}
				console.log(originalVal)
				console.log(dateVal)
				var navOnLR = args.grid.getOptions().editorCellNavOnLRKeys;
				$input = $("<INPUT type=datetime-local class='editor-text' />")
						.appendTo(args.container)
						.on("keydown.nav", navOnLR ? handleKeydownLRNav : handleKeydownLRNoNav)
						.focus()
						.select();
			};
	
			this.destroy = function () {
				$input.remove();
			};
	
			this.focus = function () {
				$input.focus();
			};
	
			this.getValue = function () {
				return $input.val();
			};
	
			this.setValue = function (val) {
				$input.val(val);
			};
	
			this.loadValue = function (item) {
				// console.log(Date.now())
				defaultValue = dateVal || now // || item[args.column.field];
				$input.val(defaultValue);
				$input[0].defaultValue = defaultValue;
				$input.select();
			};
	
			this.serializeValue = function () {
				console.log("In Serialize")
				console.log($input.val())
				return $input.val();
			};
	
			this.applyValue = function (item, state) {
				console.log("IN Apply")
				console.log(item, state)
				var year = state.slice(0,4)
				var month = state.slice(5,7)
				var day = state.slice(8,10)
				var hour = state.slice(11,13)
				var displayHour = hour < 12 ? hour : hour - 12
				if (displayHour == 0) {displayHour = 12}
				var min = state.slice(14,16)
				var ampm = hour < 12 ? "AM" : "PM"
				console.log(year, month, day, hour, min, ampm)
				item[args.column.field] = month + "/" + day + "/" + year + " " + displayHour + ":" + min + ":00 " + ampm;
			};
	
			this.isValueChanged = function () {
				return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
			};
	
			this.validate = function () {
				if (args.column.validator) {
					var validationResults = args.column.validator($input.val());
					if (!validationResults.valid) {
						return validationResults;
					}
				}
	
				return {
					valid: true,
					msg: null
				};
			};
	
			this.init();
		}

		function handleKeydownLRNav(e) {
			var cursorPosition = this.selectionStart;
			var textLength = this.value.length;
			if ((e.keyCode === $.ui.keyCode.LEFT && cursorPosition > 0) ||
					 e.keyCode === $.ui.keyCode.RIGHT && cursorPosition < textLength-1) {
				e.stopImmediatePropagation();
			}
		}
	
		function handleKeydownLRNoNav(e) {
			if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {	
				e.stopImmediatePropagation();	
			}	
		}

		Date.prototype.toDateInputValue = (function() {
			var local = new Date(this);
			local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
			return local.toJSON().slice(0,10);
		});


		// Below here is copy and pasted from sym-sendvalue.js
		var TYPES = {
			Single: "Number",
			Double: "Number",
			Float16: "Number", 
			Float32: "Number",
			Float64: "Number",
			Int16: "Number",
			Int32: "Number",
			Int64: "Number",
			String: "String",
			EnumerationValue: "String", //String for now, but should be handled specially
			Boolean: "Boolean",
			DateTime: "String"
			
		};
		scope.runtimeData.streamList = [];
		scope.isAllSelected = false;
		scope.isBtnEnabled = false;
		scope.config.DataSources = scope.symbol.DataSources;
		
		function configChange(newConfig, oldConfig) {
			// console.log(newConfig, oldConfig)
			if (newConfig && oldConfig && !angular.equals(newConfig, oldConfig)) {			
				var newdatasoucres = _.difference(newConfig.DataSources, oldConfig.DataSources);
				if(newdatasoucres.length > 0){
					getStreams(newdatasoucres).then(function(newstreams){
						var newNames = getFriendlyNameList(newstreams);
						if (newConfig.DataSources.length == oldConfig.DataSources.length){
							//	switch in asset context
							scope.runtimeData.streamList = newstreams;
						}
						else{
							// drag & drop of a new stream
							scope.runtimeData.streamList = scope.runtimeData.streamList.concat(newstreams);	
							scope.config.streamFriendlyNames = scope.config.streamFriendlyNames.concat(newNames);
							scope.config.headers = scope.config.headers.concat(newNames)
						}
					});					
				}
				let cols = grid.getColumns()
				if (!angular.equals(newConfig.colorLevels, oldConfig.colorLevels)) {
					console.log(cols)
					for (let i = 1; i < cols.length; i++) {
						console.log(i)
						if (cols[i].formatter && cols[i]) {
							cols[i].formatter = statusFormatter
						}
					}
				}
				if (!angular.equals(newConfig.headers, oldConfig.headers)) {
					for (let i = 1; i < cols.length; i++) {
						if (cols[i].name) {
							console.log(scope.config.headers[i-1])
							cols[i].name = scope.config.headers[i-1]
						}
					}
				}
				grid.invalidate()
				grid.render()
			}
		}

		
		function getFriendlyNameList(streamlist){
			return _(streamlist).pluck('FriendlyName');
		}
				
		function getStreams(datasources){			
			// expects datasources to be an array
			//Breaking chains: http://stackoverflow.com/questions/28250680/how-do-i-access-previous-promise-results-in-a-then-chain
			var datastreams = _.map(datasources, function(item) {
								var isAttribute = /af:/.test(item);
								var path = isAttribute ? item.replace(/af\:(.*)/,'$1') : item.replace(/pi\:(\\\\.*)\?{1}.*(\\.*)\?{1}.*/,'$1$2');
								var label = isAttribute ? path.match(/\w*\|.*$/)[0] : path.match(/\w+$/)[0];
								var friendlyName = isAttribute ? label.match(/\|(.*$)/)[1] : label;
								
							
								return {IsAttribute: isAttribute,
										Path: path, 
										Label: label,
										IsSelected: true, 
										FriendlyName: friendlyName,
										Value: undefined, 
										Timestamp: scope.config.defaultTimestamp};
							});

			var streamsConfigPromise = getStreamsConfig(datastreams);
			
			var enumPromise = streamsConfigPromise.then(function(streamsConfig){
				var deferred = $q.defer();				
				var enumBatchRequest = getEnumConfig(streamsConfig.data);	
				_.size(enumBatchRequest) > 0 
						? deferred.resolve($http.post(baseUrl + 'batch', enumBatchRequest, {withCredentials: true}))
						: deferred.resolve('') //if there are no streams of the Enumeration type, resolve emtry string.
										
				return 	deferred.promise;
			});
			
			
			
			return $q.all([streamsConfigPromise, enumPromise]).then(function(responses){
			
				var streamsconfig = responses[0].data;
				var enumerations = responses[1].data;
				
				datastreams.forEach(function(stream, index){					
					stream.IsEnumerationType = isEnumerationType(streamsconfig[index]);
					stream.EnumerationOptions = getEnumerationOptions(enumerations, stream.IsEnumerationType, index);
					stream.Type = getType(streamsconfig[index], stream.IsAttribute);
					stream.ValueUrl = streamsconfig[index].Content.Links.Value;
					stream.isPoint = isPIPoint(streamsconfig[index], stream.IsAttribute);
				});
				
				return datastreams;
			});			
		};
			
		function getStreamsConfig(datastreams){
		
			var batchRequest = {};
			_.each(datastreams, function(datastream, index){
				var getDataStreamURL = datastream.IsAttribute ? encodeURI(baseUrl + "attributes?path=" + datastream.Path) : encodeURI(baseUrl + "points?path=" + datastream.Path);
				
				batchRequest[index] = {
					'Method': 'GET',
					'Resource': getDataStreamURL						
				}
			});
			return $http.post(baseUrl + 'batch', JSON.stringify(batchRequest), {withCredentials: true});
		}
		
		function getEnumConfig(streams){
			//TODO: handle digital pi points
			var enumBatchRequest = {};
			_.chain(streams)
				.map(function(stream, index){return {Index: index,
													 Type: stream.Content.Type,
													 EnumUrl: stream.Content.Links.EnumerationSet}})
				.where({Type: "EnumerationValue"})
				.each(function(enumstream){ _.extend(enumBatchRequest,
											getEnumRequest(enumstream.EnumUrl, enumstream.Index),
										    getEnumValuesRequest(enumstream.Index))}) 
				.value();
				
			return enumBatchRequest;
		}
				
		function getEnumRequest(enumUrl, index){
			//using _.object() here to avoid IE compatibility issues
			return _.object(['EnumConfig' + index], [{'Method': 'GET', 'Resource': enumUrl}]);
		}
			
		function getEnumValuesRequest(index){
			//using _.object() here to avoid IE compatibility issues
			return _.object(['EnumValues' + index], [{
									'Method': 'GET',
									'Resource': '{0}',
									'ParentIds': [
										'EnumConfig' + index
									],
									'Parameters': [
										'$.EnumConfig' + index + '.Content.Links.Values'
									]
						}]);	
		}
			
		function isEnumerationType(stream){
			return _.has(stream.Content, "Type") && stream.Content.Type == "EnumerationValue";
		}
		
		function getEnumerationOptions(enumerations, isEnumerationType, index){
			return isEnumerationType ? enumerations["EnumValues" + index].Content.Items : ""; 
			
		}
		
		function getType(stream, isAttribute){
			return isAttribute ? TYPES[stream.Content.Type] : TYPES[stream.Content.PointType];
		}
		
		function isPIPoint(stream, isAttribute){
			return (isAttribute && stream.Content.DataReferencePlugIn == "PI Point") || !isAttribute;
		}
		
	
	  function sendValues(index, time, value){
		   
			scope.loading = true; //show button loading icon
			// scope.isBtnEnabled = false;   
			var streams = [scope.runtimeData.streamList[index]];
			streams[0].Value = value
			streams[0].Timestamp = time
      // if(!anyStreamsSelected(streams)) return;
			var batchRequest = formBulkSendRequest(streams);
			//Send batch request to PI Web API endpoint
			var sendDataPromise = _.size(batchRequest) > 0 
									? $http.post(baseUrl + "batch", batchRequest, {withCredentials: true})
									: $q.reject();
			start = Date.now()	
			sendDataPromise.then(function(response){
				let time = (Date.now() - start) / 1000
				console.log(time + "s to response from PI")
				scope.$root.$broadcast('refreshDataForChangedSymbols')
				}, function(error) {
					console.log(error)
				});
			      
			
        
	   };
	   
	   	function formBulkSendRequest(streamList) {
			// console.log(streamList)
			var batchRequest = {};
			
			streamList.forEach(function(stream, index){
				if(!stream.IsSelected || (!stream.Value && stream.Value !== 0 && stream.Value !== "")) return;			
			
				if (stream.Value == "") {
					var data = {
						"Timestamp": stream.Timestamp,
						"Value": scope.runtimeData.previousValue
					}
				} else {
					var data = {
						"Timestamp": stream.Timestamp,
						"Value": stream.IsEnumerationType ? stream.Value.Name : stream.Value
					};
				}
				console.log(data)
				var method = stream.isPoint ? "POST" : "PUT";
				
				batchRequest["SendValue" + index] = {
					"Method": method,
					"Resource": stream.Value == "" ? stream.ValueUrl + "?updateOption=remove" : stream.ValueUrl,
					"Content": JSON.stringify(data),
					"Headers": {
						'Content-Type': 'application/json'
					}
				}
				// console.log(stream.ValueUrl)
				// console.log(batchRequest["SendValue0"].Resource)
			});		   
				// console.log(batchRequest);
			return JSON.stringify(batchRequest);
		};

		
	   
		scope.toggleAll = function(){			
			var toggleValue = scope.isAllSelected;
			scope.runtimeData.streamList.forEach(function(stream){stream.IsSelected = toggleValue});
			scope.isBtnEnabled  = anyStreamsSelected();
		};
		
		scope.toggleStreamSelection = function(){
			scope.isAllSelected = scope.runtimeData.streamList.every(function(stream){return(stream.IsSelected)});
			scope.isBtnEnabled  = anyStreamsSelected();
		};
		
	  function anyStreamsSelected(){
			return scope.runtimeData.streamList.some(function(stream){return(stream.IsSelected)});
		};
	};
	
	function configDeleteTrace(scope){
		console.log(scope)
		var index = scope.runtimeData.selectedStream;
		var datasources = scope.symbol.DataSources;
		var streams = scope.runtimeData.streamList;
		var colorLevels = scope.config.colorLevels
		var headers = scope.config.headers
		var colWidths = scope.config.colWidths
		let cols = grid.getColumns()
		console.log(cols)
		
		if (datasources.length > 1) {
			datasources.splice(index, 1);	
			streams.splice(index,1);   
			colorLevels.splice(index,1)
			colWidths.splice(index,1)
			headers.splice(index,1)
			cols.splice(index + 1,1)
			for (let i =1; i < cols.length; i++) {
				cols[i].id = "value" + (i - 1)
				cols[i].field = "value" + (i - 1)
			}
			console.log(cols)
			grid.setColumns(cols)
			scope.$root.$broadcast('refreshDataForChangedSymbols');		
		}
	};

	PV.symbolCatalog.register(definition); 
})(window.PIVisualization); 
