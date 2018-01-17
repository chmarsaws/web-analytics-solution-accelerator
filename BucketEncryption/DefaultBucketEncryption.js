'use strict';

var aws = require('aws-sdk');

exports.TurnOnDefaultBucketEncryption = (event, context, callback) => {
  console.log(event);
  
  var BucketName = event.ResourceProperties.S3Bucket;

  var params = {
    Bucket: BucketName, 
    ServerSideEncryptionConfiguration: { 
      Rules: [
        {
          ApplyServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256'
          }
        }
      ]
    }
  };

  var s3 = new aws.S3();
  
  if (event.RequestType == "Create") {
    s3.putBucketEncryption(params, (err, data) => {
      if (err) { 
        console.log(err, err.stack); 
        sendResponse(event, context, "FAILED", err);
        callback(err, data);
      }
      else {
        console.log(data);
        sendResponse(event, context, "SUCCESS");
        callback(null, data);
      }
    });
  } else {
    sendResponse(event, context, "SUCCESS");
    callback(null, 'Taking no action for request of type: ' + event.RequestType);
  }
  
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
  }

};

