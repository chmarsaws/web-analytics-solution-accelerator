function init() {
    console.log('starting init');
    const 
        clientIdParamName = "cid",
        userPoolIdParamName = "upid",
        identityPoolIdParamName = "ipid",
        cognitoRegionParamName = "r",
        metricsTableName = "mt",
        metricDetailsTableName = "mdt";

    var cognitoAppClientId = getConfigParameterByName(clientIdParamName),
        cognitoUserPoolId = getConfigParameterByName(userPoolIdParamName),
        cognitoIdentityPoolId = getConfigParameterByName(identityPoolIdParamName),
        cognitoRegion = getConfigParameterByName(cognitoRegionParamName),
        cognitoUser,
        stackMetricsTable = getConfigParameterByName(metricsTableName),
        stackMetricDetailsTable = getConfigParameterByName(metricDetailsTableName);


    $("#userPoolId").val(cognitoUserPoolId);
    $("#identityPoolId").val(cognitoIdentityPoolId);
    $("#clientId").val(cognitoAppClientId);
    $("#userPoolRegion").val(cognitoRegion);
    $("#metricsTable").val();
    $("#metricDetailsTable").val();

    function getConfigParameterByName(name) {
        var data = getQSParameterByName(name);
        if(data == null || data == '') {
            data = localStorage.getItem(name);
            return data;
        }
        localStorage.setItem(name, data);
        return data;
    }      
    function getQSParameterByName(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }  

    //var colors = ["red", "green", "blue", "orange", "purple", "cyan", "magenta", "lime", "pink", "teal", "lavender", "brown", "beige", "maroon", "mint", "olive", "coral"];
    var colors = [ "#3e95cd", "#8e5ea2","#3cba9f","#e8c3b9","#c45850"];
    var dynamicColors = function(i) {
        if (i >= 0 && i < colors.length) return colors[i];
        var r = Math.floor(Math.random() * 255);
        var g = Math.floor(Math.random() * 255);
        var b = Math.floor(Math.random() * 255);
        return "rgb(" + r + "," + g + "," + b + ")";
    };

    function convertTimestamp(eventUnixTime) {
        var a = new Date(eventUnixTime);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var year = a.getFullYear();
        var month = months[a.getMonth()];
        var date = a.getDate();
        var hour = a.getHours();
        var min = a.getMinutes();
        var sec = a.getSeconds();
        var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
        return time;
    }
    var identity = function(arg1) {
      return arg1;
    };
/*
    function addData(chart, label, data) {
        chart.data.labels = label;
        for (var i=0;i<chart.data.datasets.length;i++) {
            dataset = chart.data.datasets[i];
            dataset.data = data;
            dataset.fill = false;
            var color = dynamicColors(colors.length - 1 - i);
            dataset.fillColor = color;
            dataset.hightlightFill = color;
            dataset.backgroundColor = color;
            dataset.borderColor = color;
        };
        chart.update();
    }

    function updateData(chart, labels, data, datasetLabel, separateAxes = false) {
        chart.data.labels = labels;
        chart.data.datasets = new Array();

        for (var i=0;i<data.length;i++) {
            var dataset = {};
            dataset.data = data[i];
            dataset.label = datasetLabel[i];
            if (separateAxes) dataset.yAxisID = datasetLabel[i];
            dataset.fill = false;
            var color = dynamicColors(i);
            dataset.backgroundColor = color;
            dataset.borderColor = color;
            chart.data.datasets.push(dataset);
        }
        chart.update();
    }
*/
    
    var retained_chart_data = new Map();

    function makeBarChart(metricType, detailItems){

        if(!retained_chart_data.has(metricType)){
            var labels = [];
            var datapoints = [];
            var bgcolor = [];
            retained_chart_data.set(metricType, { labels: labels, data: datapoints, backgroundColor: bgcolor});
        } 
        var elem = document.getElementById(metricType);
        var ctx = elem.getContext("2d");

        //if(elem.chart != undefined){
            //console.log('elem.chart.data.datasets.data=' + elem.chart.data.datasets.data);
        //}
       // console.log('elem.chart.data.datasets.data=' + elem.chart.config.data.datasets.data);
        
        for (var i=0; i<detailItems.length; i++) {
            var idx = retained_chart_data.get(metricType).labels.findIndex( x => x == detailItems[i].METRICITEM);
            if(idx == -1){
                retained_chart_data.get(metricType).labels.push(detailItems[i].METRICITEM);
                retained_chart_data.get(metricType).data.push(detailItems[i].UNITVALUEINT == null ? detailItems[i].UNITVALUEFLOAT : detailItems[i].UNITVALUEINT);
                retained_chart_data.get(metricType).backgroundColor.push(dynamicColors(i));
                console.log('Added NEW for ' + detailItems[i].METRICITEM);
            } else {
                retained_chart_data.get(metricType).data[idx] = detailItems[i].UNITVALUEINT == null ? detailItems[i].UNITVALUEFLOAT : detailItems[i].UNITVALUEINT;
                console.log('EXISTING for ' + detailItems[i].METRICITEM);
            }
        }
        var config = {
            type: 'bar',
            data: {
                labels: retained_chart_data.get(metricType).labels,
                datasets: [{
                  data: retained_chart_data.get(metricType).data,
                  backgroundColor: retained_chart_data.get(metricType).backgroundColor
                }]
            },
            options: {
                legend: {
                    display: false
                }
            }
        };
        elem.chart && elem.chart.destroy();
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }

    function makeAmomalyBarChart(metricType, detailItems){
        var elem = document.getElementById (metricType);
        var ctx = elem.getContext("2d");
        var lables = [];
        var datapoints = [];
        var bgcolor = [];
        for (var i=0; i<detailItems.length; i++) {
            lables.push(detailItems[i].METRICITEM);
            datapoints.push(detailItems[i].UNITVALUEINT == null ? detailItems[i].UNITVALUEFLOAT : detailItems[i].UNITVALUEINT);
            bgcolor.push(dynamicColors(i));
        }
        var anomalyTime = convertTimestamp(detailItems[0].EVENTTIMESTAMP);
        console.log('anomalyTime=' + anomalyTime)
        var config = {
            type: 'bar',
            data: {
                labels: lables,
                datasets: [{
                  label : anomalyTime,
                  data: datapoints,
                  backgroundColor: bgcolor
                }]
            },
            options: {
                legend: {
                    display: true
                }
            }
        };
        elem.chart && elem.chart.destroy();
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }

    function makePieChart(metricType, detailItems){
        var elem = document.getElementById (metricType);
        var ctx = elem.getContext("2d");
        var lables = [];
        var datapoints = [];
        var bgcolor = [];
        for (var i=0; i<detailItems.length; i++) {
            lables.push(detailItems[i].METRICITEM);
            datapoints.push(detailItems[i].UNITVALUEINT);
            bgcolor.push(dynamicColors(i));
        }
        var config = {
            type: 'pie',
            data: {
                labels: lables,
                datasets: [{
                  data: datapoints,
                  backgroundColor: bgcolor
                }]
            },
            options: {
                legend: {
                    display: true                    
                }
            }
        };
        elem.chart && elem.chart.destroy();
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }

    function makeHorizontalBarChart(metricType, detailItems){
        var elem = document.getElementById (metricType);
        var ctx = elem.getContext("2d");
        var lables = [];
        var datapoints = [];
        var bgcolor = [];
        for (var i=0; i<detailItems.length; i++) {
            lables.push(detailItems[i].METRICITEM);
            datapoints.push(detailItems[i].UNITVALUEINT);
            bgcolor.push(dynamicColors(i));
        }
        var config = {
            type: 'horizontalBar',
            data: {
                labels: lables,
                datasets: [{
                    data: datapoints,
                    backgroundColor: bgcolor
                }]
            },
            options: {
                legend: {
                    display: false
                }
            }
        };
        elem.chart && elem.chart.destroy();
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }

/*
    function makeHorizontalLineChart(metricType, detailItems){
        var elem = document.getElementById (metricType);
        var ctx = elem.getContext("2d");
        var lables = [];
        var datapoints = [];
        var bgcolor = [];
        for (var i=0; i<detailItems.length; i++) {
            lables.push(detailItems[i].METRICITEM);
            datapoints.push(detailItems[i].UNITVALUEINT);
            bgcolor.push(dynamicColors(i));
        }
        var config = {
            type: "line",
            data: {labels: labels , datasets: [ { label: label, data: [] }] }, 
            options: {
                legend: {
                    position: 'bottom'
                }, 
                responsive: true,

                scales: {
                    xAxes: [{
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 6
                        },
                        display: true 
                    }]
            }}
        };
        elem.chart && elem.chart.destroy();
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }
/*
    //Chart.js code
    var uniqueUsersChartConfig = {
        type: "line",
        data: {

            labels : dateTime,
            datasets : [
                {
                    label: "Total Unique Users",
                    borderColor : "rgba(151,187,205,1)",
                    data : usersCounter,
                    fill: true,
                    pointRadius: 0
                }

            ]
        },
        options: {
            legend: {
                display: false,
                position: "top"

            },
            animation: false,
            title: {
                display: false,
                text: "Unique Users",
                fontSize: 24
            },
            responsive: true,
            scales: {
                xAxes: [{
                    display: false,
                    scaleLabel: {
                        display: true,
                        labelString: 'Time (3 minutes)'
                    },
                    ticks: {
                        suggestedMin: 180,
                        suggestedMax: 180
                    }

                }],
                yAxes: [{
                    display: true,
                    scaleLabel: {
                        display: false
                    },
                    ticks: {
                        min: 0,
                        suggestedMax: 0,
                        stepSize: 20
                    }
                }]
            }
        }
    };

    var osChartConfig = {
        type: 'pie',
        data: {
            labels: [
                "Android",
                "iOS",
                "Windows Phone",
                "Other"
            ],
            datasets: [
                {
                    data: osUsageData,
                    backgroundColor: [
                        "#3498DB",
                        "#1ABB9C",
                        "#9B59B6",
                        "#9CC2CB"
                    ]
                }
            ]
        },
        options: {
            title: {
                display: false,
                text: "Operating System Usage",
                fontSize: 24
            },
            legend: {
                display: true
            },
            responsive: true
        }
    };
    var generateLineChartConfig = function(label) {
        var config = {
            type: "line",
            data: {labels: [] , datasets: [ { label: label, data: [] }] }, 
            options: {

                responsive: true,

                scales: {

                    xAxes: [{
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 3
                        },
                        display: true 
                    }]
            }}
        };
        return config;
    }

    var generateHorizontalBarChartConfig = function(label) {
        var config = {
            type: "horizontalBar",
            data: {
                labels: [],
                datasets: [
                    {
                        label: label,
                        data: []
                    }
                ]
            },
            options: {
                legend: {
                    display: true
                },

                responsive: true,
                scales: {
                    yAxes: [{
                       stacked: true
                    }],
                    xAxes: [{
                        display: true,
                        scaleLabel: {
                            display: false
                        },
                        ticks: {
                            stepSize: 10,
                            suggestedMin: 0,
                            suggestedMax: 10

                        }
                    }]
                }
            }
        };
        return config;
    }

    var generateLineChart = function(divId, label) {
        var ctx = document.getElementById(divId).getContext("2d");
        var config = generateLineChartConfig(label);
        return new Chart(ctx, config);
    }
    var generateHorizontalBarChart = function(divId, label) {
        var ctx = document.getElementById(divId).getContext("2d");
        var config = generateHorizontalBarChartConfig(label);
        return new Chart(ctx, config);
    }

    var getTimeSecsAgo = function(secsAgo = 0) {
        return new Date(new Date().getTime() - secsAgo*1000).toISOString().replace('T',' ').replace('Z','');
    };
    var currentTime = new Date();

    var totalCallCurrentTime = new Date(currentTime.getTime() - 600000).toISOString().replace('T',' ').replace('Z','');
    var totalCalls = new Array();
    var labels= new Array();
    //var quadChart = generateLineChart("quadrantCanvas", "Total no of calls");

    var serviceCallQueryTime = new Date(currentTime.getTime() - 2000000).toISOString().replace('T',' ').replace('Z','');
    var serviceCallMap = {};
    var serviceCallLabels = new Array();
    //var serviceCallChart = generateLineChart("callsByServiceCanvas", "No of service calls");

    var ec2CallQueryTime = new Date(currentTime.getTime() - 2000000).toISOString().replace('T',' ').replace('Z','');
    var ec2Map = {"ec2.amazonaws.com|null": []};
    var ec2Labels = new Array();
    var ec2CallChart = generateLineChart("callsByEC2Canvas", "No of EC2 calls");

    var anomalyScoreCurrentTime = new Date(currentTime.getTime() - 600000).toISOString().replace('T',' ').replace('Z','');
    var anomalyCallMap = {"Anomaly Score": [], "Total Calls": []};
    var anomalyCallLabels= new Array();
    var anomalyChartConfig = generateLineChartConfig("Total no of calls");
    var anomalyCtx = document.getElementById("anomalyCanvas").getContext("2d");
    anomalyChartConfig.options.scales.yAxes = 
        [{
            id: 'Total Calls',
            type: 'linear',
            position: 'left'
          }, {
            id: 'Anomaly Score',
            type: 'linear',
            position: 'right',
            ticks: {
                  max: 10,
                  min: 0
            }
          }
        ];
    anomalyChart = new Chart(anomalyCtx, anomalyChartConfig)
    //generateLineChart("anomalyCanvas", "Total no of calls");


    var maxIpQueryTime = new Date(currentTime.getTime() - 600000).toISOString().replace('T',' ').replace('Z','');
    var maxIpCallMap = {"Max calls per IP": []};//{"Max calls/IP per minute": [], "Total Calls": []};
    var maxIpCallLabels= new Array();
    var maxIpChart = generateLineChart("maxIpCanvas", "Max calls/IP");

    var ipQueryTime = new Date(currentTime.getTime() - 600000).toISOString().replace('T',' ').replace('Z','');
    var osChart = generateHorizontalBarChart("osCanvas", "No of calls/IP");

    var userQueryTime = new Date(currentTime.getTime() - 600000).toISOString().replace('T',' ').replace('Z','');
    var userCallChart = generateHorizontalBarChart("callsByUserCanvas", "No of calls/IAM user");

    var apiQueryTime = new Date(currentTime.getTime() - 600000).toISOString().replace('T',' ').replace('Z','');
    var apiCallChart = generateHorizontalBarChart("callsByAPICanvas", "No of calls/API");

    var totalCallCtx = document.getElementById("A_count");
    var totalCallTimeCtx = document.getElementById("A_percent");
    var totalSuccessfulCalls = 0;
    var firstRecord = 0;
    var lastRecord = 0;
    var noNewRecordCount = 0;

    var splitFunc = function(entry) {return entry.split('|')[0]; };
*/
    var currentTime = new Date();
    console.log(currentTime);

    /*var retrieveParams = function(metricType, eventTime) {
        return {
            TableName: "cloudtrail-log-analytics-metrics",
            ConsistentRead: true,
            ScanIndexForward: true,
            KeyConditionExpression: "MetricType = :TrailLog AND EventTime > :currentTime",
            ExpressionAttributeValues: { ":currentTime": eventTime, ":TrailLog": metricType }
        }
    };
    var retrieveParamsFromMaxTable = function(metricType, eventTime) {
        var date = eventTime.split(' ');
        var time = date[1].split(':');
        var hour = date[0]+ " " + time[0];
        var min = time[1];
        return {
            TableName: "cloudtrail-log-ip-metrics",
            ConsistentRead: true,
            ScanIndexForward: true,
            KeyConditionExpression: "#hour = :hour AND #min > :minute",
            ExpressionAttributeNames: {"#hour": "Hour", "#min": "Minute"},
            ExpressionAttributeValues: { ":hour": hour, ":minute": min }
        }
    }*/
/*
    var updateHorizontalBarChart = function(data, noOfTopItems, chartName, queryTime, labelFunc=identity) {
        var items = data.Items;
        var ipCountMap = {};
        
        // Merge the counts of each DDB item into a single map.
        for (var i=0; i<items.length; i++) {
            var entryMap = JSON.parse(items[i].Data);
            var mySet = new Set(Object.keys(entryMap));
            for (let key1 of mySet) ipCountMap[key1] = (ipCountMap[key1]||0) + entryMap[key1];
        }
        
        if (items.length > 0) {
            //console.log(items);
            queryTime = items[items.length-1].EventTime;
            
            var topIps = Object.keys(ipCountMap).sort(function(a,b) { return ipCountMap[b] - ipCountMap[a]}).slice(0,noOfTopItems);
            if (topIps.length < noOfTopItems) {
                ipCountMap[""] = 0;
                for (var i=topIps.length; i<noOfTopItems; i++) {
                    topIps.push("");
                }
            }

            var topIpCounts = topIps.map(function(ip) {return ipCountMap[ip]; })
            topIps = topIps.map(labelFunc);
            addData(chartName,topIps,topIpCounts);
        }
        return queryTime;
    };

    var updateSingleLineChart = function(data, labels, totalCalls, chart, currentTime) {
        var items = data.Items;
                for (var i=0; i<items.length; i++) {
                        labels.push(items[i].EventTime);
                        totalCalls.push(parseFloat(items[i].Data.match(/(\d+\.?\d*)/)[1]));
                }
                //console.log(totalCalls);
                if (items.length > 0) {
                    currentTime = labels[labels.length-1];
                    
                }
                addData(chart,labels,totalCalls);
                return currentTime;
    }
    var splitLabel = function(label) {
        return [''].concat(label.split(' '));
    }
    var updateLineChart = function(data, serviceCallLabels, serviceCallMap, chart, queryTime, labelFunc=identity) {
        var items = data.Items;
        for (var i=0; i<items.length; i++) {
            queryTime = items[i].EventTime;
            var timeToPut = items[i].EventTime.split('.')[0].split(' ');
            console.log(timeToPut);
            serviceCallLabels.push(splitLabel(items[i].EventTime.split('.')[0]));
            ddbitem = JSON.parse(items[i].Data);

            ddbkeys = new Set(Object.keys(ddbitem));

            for (var key in  serviceCallMap) {
                
                if (!ddbkeys.has(key)) {ddbitem[key]=0;}
            }
            for (let entry of Object.keys(ddbitem)) {
                if (entry in serviceCallMap) {
                    serviceCallMap[entry].push(ddbitem[entry]);
                } 
                else {
                    var newServiceEntry = new Array(serviceCallLabels.length-1);
                    newServiceEntry.fill(0);
                    newServiceEntry.push(ddbitem[entry]);
                    serviceCallMap[entry] = newServiceEntry;
                }
            }
        }
        if (items.length > 0) {
            //updateData(chart, serviceCallLabels,  Object.values(serviceCallMap), Object.keys(serviceCallMap).map(labelFunc));
        }
        else {
            serviceCallLabels.push(splitLabel(queryTime.split('.')[0]));
            for (var key in  serviceCallMap) {
                serviceCallMap[key].push(0);
            }

        }
        updateData(chart, serviceCallLabels,  Object.values(serviceCallMap), Object.keys(serviceCallMap).map(labelFunc));

        return queryTime;        
    }
    
    var getLatestRecord = function(){
        var params = retrieveParams("NumberOfSuccessfulCalls", totalCallCurrentTime);
        var ipParams = retrieveParams("CallsPerUniqueIp", ipQueryTime);
        var userParams = retrieveParams("CallsPerUser", userQueryTime);
        var serviceTypeParams = retrieveParams("CallsPerServiceType", serviceCallQueryTime);
        var ec2Params = retrieveParams("EC2Calls", ec2CallQueryTime);
        var anomalyParams = retrieveParams("AnomalyScore", anomalyScoreCurrentTime);
        var apiParams = retrieveParams("CallsPerAPI", apiQueryTime);
        var maxIpParams = retrieveParamsFromMaxTable("MaxIP", maxIpQueryTime);


        var docClient = new AWS.DynamoDB.DocumentClient();

        docClient.query(params, function(err, data) {
            if (err) console.log(err);
            else {

                var items = data.Items;
                for (var i=0; i<items.length; i++) {
                    totalSuccessfulCalls += parseInt(items[i].Data.match(/(\d)/)[1]);
                }
                var callTime;
                if (items.length > 0) callTime = items[items.length-1].EventTime;
                else callTime = new Date(new Date().getTime() - 20000).toISOString().replace('T',' ').replace('Z','');
                totalCallCtx.innerHTML = "<h3>Count: " + totalSuccessfulCalls + "</h3>";
                totalCallTimeCtx.innerHTML = "<h4>Last Updated: " + callTime.split(' ')[1] + "</h4>";
                //totalCallCurrentTime = updateLineChart(data, labels, {"Total no of calls" : totalCalls}, quadChart, totalCallCurrentTime);
            }    
        });
        docClient.query(ipParams, function(err, data) {
            if (err) console.log(err);
            else {
                ipQueryTime = updateHorizontalBarChart(data, 5, osChart, ipQueryTime, splitFunc);
            }
        });
        docClient.query(userParams, function(err, data) {
            if (err) console.log(err);
            else {
                userQueryTime = updateHorizontalBarChart(data, 5, userCallChart, userQueryTime, splitFunc);
            }
        });

        docClient.query(serviceTypeParams, function(err, data) {
            if (err) console.log(err);
            else {
                serviceCallQueryTime = updateLineChart(data, serviceCallLabels, serviceCallMap, serviceCallChart, serviceCallQueryTime, splitFunc) ;
            }

        });
        docClient.query(ec2Params, function(err, data) {
            if (err) console.log(err);
            else {
                ec2CallQueryTime = updateLineChart(data, ec2Labels, ec2Map, ec2CallChart, ec2CallQueryTime, function(label) { result = label.split('|')[1]; if (result == "null") return "SuccessfulCalls"; else return "Failure calls: " + result;}) ;
            }
        });
        docClient.query(anomalyParams, function(err, data) {
            if (err) console.log(err);
            else {
                var items = data.Items;
                for (var i=0; i<items.length; i++) {
                    anomalyCallLabels.push(splitLabel(items[i].EventTime));
                    ddbItem = JSON.parse(items[i].Data);
                    anomalyCallMap["Total Calls"].push(parseInt(Object.keys(ddbItem)[0].split("|")[0]));
                    anomalyCallMap["Anomaly Score"].push(parseFloat(Object.values(ddbItem)[0]));
                }
                if (items.length>0) {
                    anomalyScoreCurrentTime = items[items.length-1].EventTime;
                    updateData(anomalyChart, anomalyCallLabels, Object.values(anomalyCallMap), Object.keys(anomalyCallMap), true);
                }
            }
        });
        docClient.query(apiParams, function(err, data) {
            if (err) console.log(err);
            else {
                apiQueryTime = updateHorizontalBarChart(data, 10, apiCallChart, apiQueryTime);
            }
        });
        docClient.query(maxIpParams, function(err, data) {
            if (err) console.log(err);
            else {
                var items = data.Items;
                for (var i=0; i<items.length; i++) {
                    maxIpCallLabels.push(splitLabel(items[i].Hour.replace(' ', 'T')+":"+items[i].Minute+" IP:" + items[i].IP));
                    maxIpCallMap["Max calls per IP"].push(parseInt(items[i].MaxCount));
                }
                if (items.length>0) {
                    maxIpQueryTime = items[items.length-1].Hour+":"+items[items.length-1].Minute+":00.000";
                    updateData(maxIpChart, maxIpCallLabels, Object.values(maxIpCallMap), Object.keys(maxIpCallMap));
                }
                else {
                    var defaultTime = getTimeSecsAgo(30);
                    if (maxIpQueryTime < defaultTime) maxIpQueryTime = defaultTime;
                }
            }
        });


        //setTimeout( function() {
        //    getLatestRecord();
        //}, 15000);


    }*/
    var cognitoAuth = function() {

        $("#logoutLink").click( function() {
                cognitoUser.signOut();

                $("#password").val("");
                $("#loginForm").removeClass("hidden");
                $("#logoutLink").addClass("hidden");
                $("#unauthMessage").removeClass("hidden");
                $("#dashboard_content").addClass("hidden");
        });
        $("#btnSaveConfiguration").click(function (e) {

        var clientId = $("#clientId").val(),
            userPoolId = $("#userPoolId").val(),
            identityPoolId = $("#identityPoolId").val(),
            userPoolRegion = $("#userPoolRegion").val();

        if(clientId && userPoolId && identityPoolId && userPoolRegion){
            $("#configErr").addClass("hidden");
            localStorage.setItem(clientIdParamName, clientId);
            localStorage.setItem(userPoolIdParamName, userPoolId);
            localStorage.setItem(identityPoolIdParamName, identityPoolId);
            localStorage.setItem(cognitoRegionParamName, userPoolRegion);
            $("#cognitoModal").modal("hide");

        }
        else {
            $("#configErr").removeClass("hidden");
        }

        });     
        $("#btnLogin").click(function() {
            console.log("clicked");
            //validate that the Cognito configuration parameters have been set
            if(!cognitoAppClientId || !cognitoUserPoolId || !cognitoIdentityPoolId || !cognitoRegion) {
                console.log("not present")
                $("#configErr").removeClass("hidden");
                $("#configureLink").trigger("click");
                return;
            }
            //update ui
            $("#loginForm").addClass("hidden");
            $("#signInSpinner").removeClass("hidden");

            var userName = $("#userName").val();
            var password = $("#password").val();

            var authData = {
                UserName: userName,
                Password: password
            };

            var authDetails = new AmazonCognitoIdentity.AuthenticationDetails(authData);

            var poolData = {
                UserPoolId: cognitoUserPoolId,
                ClientId: cognitoAppClientId
            };

            var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
            var userData = {
                Username: userName,
                Pool: userPool
            };

            cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
            cognitoUser.authenticateUser( authDetails, {
                onSuccess: function(result) {
                    console.log('access token + ' + result.getAccessToken().getJwtToken());

                    var logins = {};
                    logins["cognito-idp." + cognitoRegion + ".amazonaws.com/" + cognitoUserPoolId] = result.getIdToken().getJwtToken();
                    var params = {
                        IdentityPoolId: cognitoIdentityPoolId,
                        Logins: logins
                    };

                    AWS.config.region = cognitoRegion;
                    AWSCognito.config.region = cognitoRegion;

                    AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);

                    AWS.config.credentials.get(function(refreshErr) {
                        if(refreshErr) {
                            console.error(refreshErr);
                        }
                        else {
                            $("#unauthMessage").addClass("hidden");
                            $("#logoutLink").removeClass("hidden");
                            $("#dashboard_content").removeClass("hidden");
                            $("#signInSpinner").addClass("hidden");
                            getLatestMetrics();
                        }
                    });
            
            },
            onFailure: function(err) {
                $("#logoutLink").addClass("hidden");
                $("#loginForm").removeClass("hidden");
                $("#signInSpinner").addClass("hidden");

                alert(err);
            }


        });
    });
    }

    cognitoAuth();
    
    function timeNow() {
        var d = new Date(),
            h = (d.getHours()<10?'0':'') + d.getHours(),
            m = (d.getMinutes()<10?'0':'') + d.getMinutes(),
            s = (d.getSeconds()<10?'0':'') + d.getSeconds();

        return h + ':' + m + ':' + s;
    }
    
    var getLatestMetrics = function () {
        var docClient = new AWS.DynamoDB.DocumentClient();
        docClient.scan({ TableName : stackMetricsTable }, (err, data) => {
            if(err) {
                console.log('SCAN ERROR:' + err);
            } else {
                for(let i = 0; i<data.Items.length;i++) {
                    var crt_ts = document.getElementById(data.Items[i].MetricType).attributes[1].value;
                    if(data.Items[i].LatestEventTimestamp > crt_ts) {
                        var params = {
                            TableName : stackMetricDetailsTable,
                            KeyConditionExpression: 'MetricType = :hkey and EventTimestamp = :rkey',
                            ExpressionAttributeValues: {
                                ':hkey': data.Items[i].MetricType,
                                ':rkey': data.Items[i].LatestEventTimestamp
                            }
                        };
                        console.log('params=' + JSON.stringify(params,null,2));
                        docClient.query(params, (err, datadtl) => { 
                            if(err) { 
                                console.error('err=' + err);
                            } else {
                                try{
                                    if(datadtl.Count>0) {
                                        console.log(JSON.stringify(datadtl,null,2));
                                        var items = datadtl.Items[0].MetricDetails;
                                        var mtype = datadtl.Items[0].MetricType;
                                        switch(mtype) {
                                            case 'hourly_events' :
                                                makeBarChart(mtype, items);
                                                break;
                                            case 'event_anomaly' : 
                                                makeAmomalyBarChart(mtype, items);
                                                break;
                                            case 'agent_count' :
                                                makePieChart(mtype, items);
                                                break;
                                            case 'referral_count' :
                                            case 'top_pages' :
                                                makeHorizontalBarChart(mtype,items);
                                                break;
                                            case 'visitor_count' :
                                                document.getElementById(mtype).innerHTML = 'Current Visitor Count:' + items[0].UNITVALUEINT;
                                                makeVisitorLineChart(mtype,items);
                                                break;
                                            case 'event_count' :
                                                makeEventLineChart(mtype,items);
                                                break;
                                        }
                                        document.getElementById(mtype).attributes[1].value = datadtl.Items[0].EventTimestamp;
                                    }
                                } catch (ex) {
                                    console.log('error creating chart:' + ex);
                                    console.log('datadtl=' + JSON.stringify(datadtl,null,2));
                                }
                            }
                        });
                    }
                }
            }
        });
        setTimeout( function() {
            console.log('tick\n');
            getLatestMetrics();
            var rightnow = new Date();
            document.getElementById("last_updated").innerHTML = "<H2> Last Updated: " + rightnow.toLocaleTimeString() + "</H2>";
        }, 10000);
    }

    var event_chart_time_ticks = [];
    var event_chart_dataset_labels = [];
    var event_chart_dataset_datas = [];//[][]
    var event_chart_time_ticks_display = [];

    function makeEventLineChart(mtype,items){
        dt = new Date(items[0].EVENTTIMESTAMP);
        //if there are no ticks or if the tick is not already in the array, add it
        if(event_chart_time_ticks.length == 0 || event_chart_time_ticks.indexOf(items[0].EVENTTIMESTAMP)==-1){
            event_chart_time_ticks_display.push(dt.toTimeString().split(' ')[0]);
            event_chart_time_ticks.push(items[0].EVENTTIMESTAMP);
        }
        if(event_chart_time_ticks.length>20){ //cull data over 20 data points
            event_chart_time_ticks.shift();
            event_chart_dataset_labels.shift();
            event_chart_time_ticks_display.shift();
            for(var i=0;i<event_chart_time_ticks.length;i++){
                event_chart_dataset_datas[i].shift();
            }
        }
        //go through each item and if a label already exists for it, add the data to the corresponding datas array 
        for(var j=0;j < items.length ;j++)
        {
            var data_index = event_chart_dataset_labels.indexOf(items[j].METRICITEM);
            if (data_index > -1){
                event_chart_dataset_datas[data_index].push(items[j].UNITVALUEINT);
            } else {
                //if the label does not already exist, create an array with nulls for the preceding ticks
                event_chart_dataset_labels.push(items[j].METRICITEM);
                var data = Array(event_chart_time_ticks.length - 1).fill(null);
                data.push(items[j].UNITVALUEINT);
                event_chart_dataset_datas.push(data);

            }
        }
        //go through all the existing labels to see if there was a missing element 
        //in this set of items.  If there was set a null in the data for this tick
        for(var j=0;j < event_chart_dataset_labels.length;j++){ 
            if(!findItem(items,event_chart_dataset_labels[j])) {
                event_chart_dataset_datas[j].push(null);
            } 
        }
        //build the data for the chart
        var chart_datasets = [];
        for(var i = 0;i < event_chart_dataset_labels.length;i++){
         chart_datasets.push({ label: event_chart_dataset_labels[i], 
            fill: false, 
            spanGaps: true,
            backgroundColor: dynamicColors(chart_datasets.length+1), 
            borderColor: dynamicColors(chart_datasets.length+1),    
            data: event_chart_dataset_datas[i] });
        }
        var elem = document.getElementById(mtype);
        var ctx = elem.getContext("2d");
        elem.chart && elem.chart.destroy();
        var config = {
            type: "line",
            data: {labels: event_chart_time_ticks_display , datasets: chart_datasets }, 
            options: {
                legend: {
                    position: 'bottom'
                }, 
                responsive: true,
                scales: {
                    xAxes: [{
                        display: true 
                    }]
            }}
        };  
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }

    var visitor_chart_time_ticks = [];
    var visitor_chart_dataset_labels = [];
    var visitor_chart_dataset_datas = [];
    var visitor_chart_time_ticks_display = [];

    function makeVisitorLineChart(mtype,items){
        dt = new Date(items[0].EVENTTIMESTAMP);
        //if there are no ticks or if the tick is not already in the array, add it
        if(visitor_chart_time_ticks.length == 0 || visitor_chart_time_ticks.indexOf(items[0].EVENTTIMESTAMP)==-1){
            visitor_chart_time_ticks_display.push(dt.toTimeString().split(' ')[0]);
            visitor_chart_time_ticks.push(items[0].EVENTTIMESTAMP);
        }
        if(visitor_chart_time_ticks.length>20){ //cull data over 20 data points
            visitor_chart_time_ticks.shift();
            visitor_chart_dataset_labels.shift();
            visitor_chart_time_ticks_display.shift();
            for(var i=0;i<visitor_chart_time_ticks.length;i++){
                visitor_chart_dataset_datas[i].shift();
            }
        }
        //go through each item and if a label already exists for it, add the data to the corresponding datas array 
        for(var j=0;j < items.length ;j++)
        {
            var data_index = visitor_chart_dataset_labels.indexOf(items[j].METRICITEM);
            if (data_index > -1){
                visitor_chart_dataset_datas[data_index].push(items[j].UNITVALUEINT);
            } else {
                //if the label does not already exist, create an array with nulls for the preceding ticks
                visitor_chart_dataset_labels.push(items[j].METRICITEM);
                var data = Array(visitor_chart_time_ticks.length - 1).fill(null);
                data.push(items[j].UNITVALUEINT);
                visitor_chart_dataset_datas.push(data);
            }
        }
        //go through all the existing labels to see if there was a missing element 
        //in this set of items.  If there was set a null in the data for this tick
        for(var j=0;j < visitor_chart_dataset_labels.length;j++){ 
            if(!findItem(items,visitor_chart_dataset_labels[j])) {
                visitor_chart_dataset_datas[j].push(null);
            } 
        }
        //build the data for the chart
        var chart_datasets = [];
        for(var i = 0;i < visitor_chart_dataset_labels.length;i++){
         chart_datasets.push({ label: visitor_chart_dataset_labels[i], 
            fill: true, 
            spanGaps: true,
            backgroundColor: dynamicColors(chart_datasets.length+1), 
            borderColor: dynamicColors(chart_datasets.length+1),    
            data: visitor_chart_dataset_datas[i] });
        }
        var elem = document.getElementById("visitor_count_line");
        var ctx = elem.getContext("2d");
        elem.chart && elem.chart.destroy();
        var config = {
            type: "line",
            data: {labels: visitor_chart_time_ticks_display , datasets: chart_datasets }, 
            options: {
                legend: {
                    display: false
                },
                responsive: true,
                scales: {
                    xAxes: [{
                        display: true 
                    }]
            }}
        };  
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }


    function findItem(items,metricItem){
        for(var i=0;i<items.length;i++){
            if(items[i].METRICITEM==metricItem){
                return true;
            }
        }
        return false;
    }

}
