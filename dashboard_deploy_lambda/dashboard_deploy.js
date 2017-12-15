'use strict';

var aws = require('aws-sdk');
var async = require('async');

var WEB_FILE_SOURCE_KEY = 'web'; //update to location of static web site

exports.createDashboardComponents = function(event, context) {
    console.log(event);
    
    var region = event.ResourceProperties.Region,
    sourceBucketName = event.ResourceProperties.S3Source,
    destinationBucketName = event.ResourceProperties.S3Destination,
    dashboardURL = event.ResourceProperties.DashboardURL;
    aws.config.region = region;

    if (event.RequestType == "Delete") {
        11
        async.series([
            deleteStaticContent
        ], function (err, result) {
            if(err) {
                console.log(err);
                sendResponse(event, context, "FAILED", err);
            }
            else {
                sendResponse(event, context, "SUCCESS");
            }
        });
        return;
    } else {
        if(event.RequestType == "Create") {
            async.series([
                copyStaticContent,
                createIndex
            ], function (err, result) {
                if(err) {
                    console.log(err);
                    sendResponse(event, context, "FAILED", err);
                }
                else {
                    var indexTarget = 'http://' + destinationBucketName + '.s3-website-' + region + '.amazonaws.com';
                    console.log('indexTarget=' + indexTarget);
                    var response = {
                        IndexURL : indexTarget
                    };
                    sendResponse(event, context, "SUCCESS", response);
                }
            });
        }
    }

    function copyStaticContent(callback) {

        var s3 = new aws.S3();

        var params = {
            Bucket: sourceBucketName,
            Prefix: WEB_FILE_SOURCE_KEY
        };

        s3.listObjectsV2(params, function (err, data) {
            if (err) {
                callback(err);
            }
            else {
                if(data.Contents.length) {
                    async.each(data.Contents, function(file, cb) {
                        var params = {
                            Bucket: destinationBucketName,
                            CopySource: sourceBucketName + "/" + file.Key,
                            Key: file.Key.replace(WEB_FILE_SOURCE_KEY + "/", "")
                        };

                        //skip keys that represent directories in the bucket
                        if(params.CopySource.slice(-1) != "/") {
                            s3.copyObject(params, function (copyErr, copyData) {
                                if (copyErr) {
                                    console.log(copyErr);
                                    cb(copyErr);
                                }
                                else {
                                    console.log("Copied to: " + params.Key);
                                    cb();
                                }

                            });
                        } else {
                            cb();
                        }


                    }, function(asyncErr) {
                        if (asyncErr) {
                            console.log(asyncErr);
                            callback(asyncErr);
                        } else {
                            console.log("All files copied.");
                            callback();
                        }
                    });

                }
            }
        });
    }

    function deleteStaticContent(callback) {

        var s3 = new aws.S3();

        var params = {
            Bucket: destinationBucketName,
            Prefix: ""
        };
        console.log("TRY TO LIST " + destinationBucketName);
        s3.listObjectsV2(params, function (err, data) {
            if (err) {
                callback(err);
            }
            else {
                if(data.Contents.length) {
                    async.each(data.Contents, function(file, cb) {
                        var params = {
                            Bucket: destinationBucketName,
                            Key: file.Key
                        };
                        try {
                            s3.deleteObject(params, function (copyErr, copyData) {
                                if (copyErr) {
                                    console.log(copyErr);
                                }
                                else {
                                    console.log("Deleted:" + params.Key);
                                }

                            });
                        } catch (ex){

                        }
                        finally {
                            cb();
                        }
                    }, function(asyncErr) {
                        if (asyncErr) {
                            console.log(asyncErr);
                            callback(asyncErr);
                        } else {
                            console.log("All files deleted.");
                            callback();
                        }
                    });

                }
            }
        });
    }

    function createIndex(callback) {
        var s3 = new aws.S3();
        var html = "<html><script type='text/javascript'>window.location='" + dashboardURL + "'</script></html>";
        var uploadparams = { Bucket: destinationBucketName, Key: 'index.html', Body: html, ACL: "public-read", ContentType: "text/html", StorageClass: "STANDARD_IA" };
        s3.putObject(uploadparams, function (err, data) {
            if(err) {
                console.log('Error creating index:' + err);
                callback(err);
            } else {
                callback();
            }
        });
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