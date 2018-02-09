'use strict';
var AWS = require('aws-sdk');

var kinesisanalytics = new AWS.KinesisAnalytics();

exports.handler = (event, context, callback) => {
	//var app_details = client.describe_application(ApplicationName=app_name)
    if (event.RequestType == "Create") {
    	var params = {
    		ApplicationName: event.ResourceProperties.AppName
    	};
    	kinesisanalytics.describeApplication(params, (err,data) => {
    		if(err){
    			console.log('Error calling describeApplication: ' + err);
    			sendResponse(event, context, "FAILED"); 
    			callback(err, "Unable to describe application: " + event.ResourceProperties.AppName );
    		} else {
    			var input_id = data.ApplicationDetail.InputDescriptions[0].InputId;
                var app_status =  data.ApplicationDetail.ApplicationStatus;
                if(app_status=="READY") {
                    var start_params = {
                        ApplicationName: event.ResourceProperties.AppName,
                        InputConfigurations : [ {
                            Id: input_id,
                            InputStartingPositionConfiguration : { InputStartingPosition: 'NOW' }
                        } ]
                    };
                    kinesisanalytics.startApplication(start_params, (err,data) => {
                        if(err) { 
                            console.log('Error starting Kinesis Application: ' + err);
                            sendResponse(event,context,"FAILED");
                            callback(err,"FAILED");
                        }
                        else {
                            sendResponse(event,context,"SUCCESS");
                            callback(null,"SUCCESS");
                        }
                    });
                } else {
                    console.log('Error: Kinesis Application not READY was ' + app_status );
                    callback("Not Ready","FAILED");
                }
    		}
    	});
    } else { //action only needed on Create
        sendResponse(event,context,"SUCCESS");
        callback(null,"SUCCESS"); 
    }        
};

function sendResponse(event, context, responseStatus, responseData) {

    var responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
        PhysicalResourceId: context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData
    });


    console.log("RESPONSE BODY:\n", responseBody);

    var https = require("https");
    var url = require("url");

    var parsedUrl = url.parse(event.ResponseURL);
    var options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: "PUT",
        headers: {
            "content-type": "",
            "content-length": responseBody.length
        }
    };

    console.log("SENDING RESPONSE...\n");

    var request = https.request(options, function(response) {
        console.log("STATUS: " + response.statusCode);
        console.log("HEADERS: " + JSON.stringify(response.headers));
    });

    request.on("error", function(error) {
        console.log("sendResponse Error:" + error);
    });

    // write data to request body
    request.write(responseBody);
    request.end();
};

