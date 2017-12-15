'use strict';
console.log('Loading function');
var AWS = require("aws-sdk");
AWS.config.update({
    region: "us-east-1",
    endpoint : "https://dynamodb.us-east-1.amazonaws.com"
});
//var dynamodb = new AWS.DynamoDB({endpoint: process.env.dynamodb_endpoint});//https://dynamodb.us-east-1.amazonaws.com
var docClient = new AWS.DynamoDB.DocumentClient();//{endpoint : "https://dynamodb.us-east-1.amazonaws.com"});//
var METRIC_DETAILS_TABLE = process.env.METRIC_DETAILS_TABLE;
var METRIC_TABLE = process.env.METRIC_TABLE;

var str = '.';
exports.handler = (event, context, callback) => {
    var done = false;
    var total = 0;
    //while(!done) {
    	docClient.scan({ TableName : METRIC_DETAILS_TABLE }, (err, data) => {
    	    if(err) {
    	        console.error('error=' + err);
    	        done = true;
    	    } else {
        		console.log('count = ' + data.Items.length);
        		if(data.Items.length > 0) {
        		    total += data.Items.length;
            		for(let i = 0; i<data.Items.length;i++) {
            			var params = {
            				TableName : METRIC_DETAILS_TABLE,
            				Key : {
            					MetricType : data.Items[i].MetricType,
            					MetricTS : data.Items[i].MetricTS
            				},
                            Limit : 200
            			};
            			docClient.delete( params , (err,data) => { if(err) {console.error('error:' + err); str = str + '.';}});			
    		        } 
        		} else {
    		            done = true;
    		    }
    	    }
    	});
    //}
	console.log('str=' + str + ', done=' + done);
    context.callbackWaitsForEmptyEventLoop = false; 
	callback(null, "Total = " + total);
};