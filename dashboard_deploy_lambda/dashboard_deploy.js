'use strict';

var aws = require('aws-sdk');
var async = require('async');

var WEB_SOURCE_PREFIX = 'web'; //update to location of static web site

exports.createDashboardComponents = function(event, context) {
    console.log(event);
    
    var region = event.ResourceProperties.Region,
    sourceBucketName = event.ResourceProperties.S3Source,
    destinationBucketName = event.ResourceProperties.S3Destination,
    dashboardURL = event.ResourceProperties.DashboardURL;
    aws.config.region = region;

    if (event.RequestType == "Delete") {
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
            Key: WEB_SOURCE_PREFIX + '/manifest.json',
            ResponseContentEncoding: 'utf8', 
            ResponseContentType: 'application/json'            
        };
        s3.getObject(params,function (err, data) {
            if (err) {
                callback(err);
            }
            else {
                var manifest = JSON.parse(data.Body);
                if(manifest.files.length > 0) {
                    async.each(manifest.files, function(file, cb) {
                        var params = {
                            Bucket: destinationBucketName,
                            CopySource: sourceBucketName + "/" + file,
                            Key: file
                        };
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
                    }, function(asyncErr) {
                        if (asyncErr) {
                            console.log(asyncErr);
                            callback(asyncErr);
                        } else {
                            console.log("All files copied.");
                            callback();
                        }
                    });
                } else {
                    console.log('No files found in manifest!');
                }
            }
        });
    }

    function deleteStaticContent(callback) {

        var s3 = new aws.S3();

        var params = {
            Bucket: destinationBucketName,
            Key: WEB_SOURCE_PREFIX + "/manifest.json",
            ResponseContentEncoding: 'utf8', 
            ResponseContentType: 'application/json'
        };
        console.log("Open manifest-> s3://" + destinationBucketName + '/' + WEB_SOURCE_PREFIX + '/manifest.json');
        s3.getObject(params, function (err, data) {
            if (err) {
                callback(err);
            }
            else {
                var manifest = JSON.parse(data.Body);
                if(manifest.files.length > 0) {
                    manifest.files.push('index.html'); //add generated file.
                    async.each(manifest.files, function(file, cb) {
                        var params = {
                            Bucket: destinationBucketName,
                            Key: file
                        };
                        try {
                            s3.deleteObject(params, function (deleteErr, deleteData) {
                                if (deleteErr) {
                                    console.log(deleteErr);
                                }
                                else {
                                    console.log("Deleted:" + params.Key);
                                }

                            });
                        } catch (ex){
                            console.log('Error deleting file (' + file + '):' + ex);
                        }
                        finally {
                            cb();
                        }
                    }, function(asyncErr) {
                        if (asyncErr) {
                            console.log(asyncErr);
                            callback(asyncErr);
                        } else {
                            console.log("Manifested files deleted.");
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