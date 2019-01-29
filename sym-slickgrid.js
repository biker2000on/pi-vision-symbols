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
				Width: 800, 
				defaultSort: 'desc',
				warningBackgroundColor: 'lightsalmon',
				warningTextColor: 'darkred',
				badBackgroundColor: 'lightsalmon',
				badTextColor: 'darkred',
				backgroundColor: 'white',
				textColor: 'black',
				defaultTimestamp: '*',
				colorLevels: [],
				defaultColorLevel: [12,15,17,18],
			} 
		},
		configOptions: function () {
			return [{
					title: 'Format Symbol',
					mode: 'format'
			}];
		},
		inject: ['$http', '$q'],
	}


	var baseUrl = PV.ClientSettings.PIWebAPIUrl.replace(/\/?$/, '/'); //Example: "https://server.domain.com/piwebapi/";
	// console.log(baseUrl)	
	
	
	symbolVis.prototype.init = function(scope, elem, $http, $q) { 
		var container = elem.find('#grid')[0]
		container.id = 'grid_' + scope.symbol.Name
		this.onDataUpdate = dataUpdate

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
		// console.log(columns)
		var options = {
			enableCellNavigation: true,
			enableColumnReorder: false,
			enableAddRow: true,
		};
		// console.log(options)
		let data = []
		data[0] = {timestamp: Date.now()}
		data[1] = {timestamp: Date.now()}
		// console.log(data)
		let grid = new Slick.Grid(container, data, columns, options);
		// var columns = [
		// 	{id: "title", name: "Title", field: "title"},
		// 	{id: "duration", name: "Duration", field: "duration"},
		// 	{id: "%", name: "% Complete", field: "percentComplete", width: 80, resizable: false, formatter: statusFormatter},
		// 	{id: "start", name: "Start", field: "start"},
		// 	{id: "finish", name: "Finish", field: "finish"},
		// 	{id: "effort-driven", name: "Effort Driven", field: "effortDriven", formatter: Slick.Formatters.Checkmark}
		// ];
		// $(function () {
		// 	var data = [];
		// 	for (var i = 0; i < 500; i++) {
		// 		data[i] = {
		// 			title: "Task " + i,
		// 			duration: "5 days",
		// 			percentComplete: Math.round(Math.random() * 100),
		// 			start: "01/01/2009",
		// 			finish: "01/05/2009",
		// 			effortDriven: (i % 5 == 0)
		// 		};
		// 	}

				
		// Scope setup
		if (scope.config.colorLevels == false) {
			scope.config.colorLevels = scope.symbol.DataSources.map(function(c) {
				return scope.config.defaultColorLevel
			})
		}
		
		getStreams(scope.symbol.DataSources).then(function(streams){
			scope.runtimeData.streamList = streams;
			scope.config.streamFriendlyNames =  scope.config.streamFriendlyNames.length > 0 ? scope.config.streamFriendlyNames : getFriendlyNameList(scope.runtimeData.streamList);
		});

		function getConfig() {
			let columns = [
				{id: 'timestamp', name: 'Datetime', field: 'timestamp'},
				// {id: "sortableDate", name: 'Sortable Date', field: 'sortableDate'},
			]
			console.log(columns)
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
			// console.log(sortableDate)
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
			// Adds a blank line at the end.
			// timestamps.push("")

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
			if (!data) return
			if (data.Data[0].Label) {
				// console.log("sporadic update")
				// console.log(data)
				let oldCols = grid.getColumns().map((col,i) => {
					return col.name
				})
				var cols = data.Data.map((v,i) => {
					return {
						id: "value" + i, 
						name: v.Label,
						field: "value"+i, 
						formatter: statusFormatter,
						minWidth: 80,
						sortable: true,
					}
				})
				// cols.unshift({headerName: "sortableDate", field: 'datetime'})
				cols.unshift(getConfig()[0])
				// console.log("column update")
				let check = cols.map(col => col.name)
				console.log(cols)
				// console.log(oldCols, check)
				if (JSON.stringify(oldCols) == JSON.stringify(check)) {
					return
				} else {
					grid.setColumns(cols)
					grid.render()
				}
				// setTimeout(function() {gridOptions.api.setColumnDefs(cols)},0)
			}
			scope.runtimeData.oldDataGridRows = scope.runtimeData.dataGridRows
			scope.runtimeData.dataGridRows = convertDataToGrid(data)
			if (JSON.stringify(scope.runtimeData.oldDataGridRows) == JSON.stringify(scope.runtimeData.dataGridRows)) {
				return
			} else {
				// setTimeout(function() {gridOptions.api.setRowData(scope.runtimeData.dataGridRows)},0)
				grid.setData(scope.runtimeData.dataGridRows, false)
				grid.render()
			}
		}


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

		this.onConfigChange = configChange;
		
		function configChange(newConfig, oldConfig) {
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
						}
					});					
				}
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
									
			sendDataPromise.then(function(response){
				setTimeout(function(){
					scope.loading = false;
					scope.isBtnEnabled = true;
					}, 3000);	
					console.log(response)
				}, function(error) {
					console.log(error)
				});
			      
			
        
	   };
	   
	   	function formBulkSendRequest(streamList) {
			console.log(streamList)
			var batchRequest = {};
			
			streamList.forEach(function(stream, index){
					if(!stream.IsSelected || (!stream.Value && stream.Value !== 0)) return;			
				
					var data = {
                        "Timestamp": stream.Timestamp,
                        "Value": stream.IsEnumerationType ? stream.Value.Name : stream.Value
					};
					
					var method = stream.isPoint ? "POST" : "PUT";
					
					batchRequest["SendValue" + index] = {
								"Method": method,
								"Resource": stream.ValueUrl,
								"Content": JSON.stringify(data),
								"Headers": {
									'Content-Type': 'application/json'
								}
					}
				
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

		function configDeleteTrace(scope){
			var index = scope.runtimeData.selectedStream;
			var datasources = scope.symbol.DataSources;
			var streams = scope.runtimeData.streamList;
			
			if (datasources.length > 1) {
				datasources.splice(index, 1);	
				streams.splice(index,1);   
				scope.$root.$broadcast('refreshDataForChangedSymbols');		
			}
		};
		
	};

	PV.symbolCatalog.register(definition); 
})(window.PIVisualization); 
