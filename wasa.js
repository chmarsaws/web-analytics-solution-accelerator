'use strict';
var AWS = require('aws-sdk');
AWS.config.update({
    region: process.env.AWS_REGION,
    endpoint : 'https://dynamodb.' + process.env.AWS_REGION + '.amazonaws.com'
});
var docClient = new AWS.DynamoDB.DocumentClient();
var METRIC_DETAILS_TABLE = process.env.METRIC_DETAILS_TABLE;
var METRIC_TABLE = process.env.METRIC_TABLE;

exports.handler = (event, context, callback) => {
    var uniqueMetricDetailKeys = new Map();
    var metricRecordsBatch = event.Records.map((record) => JSON.parse(Buffer.from(record.kinesis.data, 'base64')));// TODO: beware of poison pills
    //loop through all the records and retain a map of all the unique keys
    for(let i=0;i<metricRecordsBatch.length;i++){
        if(validationCheck(metricRecordsBatch[i])) {
            var objKey = metricRecordsBatch[i].METRICTYPE + '|' + metricRecordsBatch[i].EVENTTIMESTAMP;  
            if(uniqueMetricDetailKeys.has(objKey)){
                //already captured
            } else {
                uniqueMetricDetailKeys.set(objKey, { EVENTTIMESTAMP : metricRecordsBatch[i].EVENTTIMESTAMP, METRICTYPE : metricRecordsBatch[i].METRICTYPE });
            }
        }
    }
    docClient.scan({ TableName : METRIC_TABLE }, (err, metricMetadata) => {
        if(!err){
        uniqueMetricDetailKeys.forEach((value, key) => {
            //create an array of all the detail records that match each key
            var metricTypeSet = metricRecordsBatch.filter((item) => item.EVENTTIMESTAMP == value.EVENTTIMESTAMP && item.METRICTYPE == value.METRICTYPE);
            upsert(metricTypeSet, metricMetadata.Items);
        });
        }else{
            console.error('Unable to retrieve metric metadata from ' + METRIC_TABLE + ': ' + err);
        }
    });

    //determine the latest timestamp for each metric type
    var LatestTimestampPerMetric = new Map();
    uniqueMetricDetailKeys.forEach((value, key) => {
        if(LatestTimestampPerMetric.has(value.METRICTYPE)){
            if(value.EVENTTIMESTAMP > LatestTimestampPerMetric[value.METRICTYPE]) {
                LatestTimestampPerMetric[value.METRICTYPE] = value.EVENTTIMESTAMP;
            } 
        } else {
            LatestTimestampPerMetric.set(value.METRICTYPE, value.EVENTTIMESTAMP );
        }
    });
    //update the latest timestamp from each of the keys to the metrics table
    LatestTimestampPerMetric.forEach((value,key) => {
        var MetricTableParams = {
            TableName: METRIC_TABLE,
            Key: { MetricType : key },
            UpdateExpression : 'set #a = :x',
            ExpressionAttributeNames : { '#a' : 'LatestEventTimestamp' },
            ExpressionAttributeValues : { ':x' : value }
        };                
        docClient.update(MetricTableParams, (err,data) => {
            if(err) { console.error(err); }
        });
    });
    callback(null, "done");
};

function upsert(metricTypeSet, allMetrics){
    var firstItem = metricTypeSet[0];//.get(metricTypeSet.keys().next().value);
    var metricDetailParams = {
        TableName : METRIC_DETAILS_TABLE,
        Item : {
            MetricType : firstItem.METRICTYPE,
            EventTimestamp : firstItem.EVENTTIMESTAMP,
            MetricDetails : metricTypeSet
        },
        ConditionExpression : 'attribute_not_exists(MetricType)'
     };
    try{
        docClient.put(metricDetailParams, function (err, data) {
            if (err) {
                if(err.code == "ConditionalCheckFailedException") {
                    amendMetric(metricTypeSet,allMetrics);    
                } else {
                    console.error('unexpected error updating metric detail table: ' + JSON.stringify(err,null,2));
                }
            }
        });
    } catch (err) {
        console.error('Unable to save records to DynamoDB:'+err);
    }
};

function amendMetric(metric_list,allMetrics)
{
    var params = {
      TableName: METRIC_DETAILS_TABLE,
      KeyConditionExpression: 'MetricType = :hkey and EventTimestamp = :rkey',
      ExpressionAttributeValues: {
        ':hkey': metric_list[0].METRICTYPE,
        ':rkey': metric_list[0].EVENTTIMESTAMP
      }
    };
    //get the existing data from othe METRIC_DETAILS_TABLE
    docClient.query(params, (err,itemToAmend) => {
        if(!err) {
            var detailsToAmend = itemToAmend.Items[0].MetricDetails;
            var metricIndex = getMetricIndex(allMetrics,metric_list[0].METRICTYPE);
            var amendmentStrategy = allMetrics[metricIndex].AmendmentStrategy;
            var isWholeNumberMetric = allMetrics[metricIndex].IsWholeNumber;
            switch (amendmentStrategy) {
                case 'add' : 
                    metric_list.map( (item) => { //for each item, find a match and add the values or add a new item.
                        var detailIndex = getMetricDetailIndex(detailsToAmend, item.METRICITEM);
                        if(detailIndex > -1) {//same metric exists in existing set
                            if(isWholeNumberMetric){
                                detailsToAmend[detailIndex].UNITVALUEINT = detailsToAmend[detailIndex].UNITVALUEINT + item.UNITVALUEINT;
                            } else {
                                detailsToAmend[detailIndex].UNITVALUEFLOAT = detailsToAmend[detailIndex].UNITVALUEFLOAT + item.UNITVALUEFLOAT;
                            }
                        } else {
                            detailsToAmend.push(item);
                        }
                    });
                    break;
                case 'replace' : 
                    detailsToAmend = metric_list;
                    break;
                default: 
                    console.error('Unexpected amemdment strategy \'' + amendmentStrategy + '\'');
            }
            if(detailsToAmend){
                var amendedParams = {
                    TableName : METRIC_DETAILS_TABLE,
                    Item : {
                        MetricType : metric_list[0].METRICTYPE,
                        EventTimestamp : metric_list[0].EVENTTIMESTAMP,
                        MetricDetails : detailsToAmend
                    }
                 };
                docClient.put(amendedParams, (err,data) => {
                    if(err) {
                        console.error('Error amending record:' + err + ' data ='  + JSON.stringify(data,null,2));
                    }
                });
            }
        } else {
            console.error('Could not get expected results from the details table.' + err);
            //could not get details
        }
    });
};

function getMetricDetailIndex(searchArray, metricItem) {
  for(let i = 0;i<searchArray.length;i++){
    if (searchArray[i].METRICITEM == metricItem) {
      return i;
    }
  }
  return -1; //not found
};

function getMetricIndex(searchArray, metricType) {
    for(let i = 0;i<searchArray.length;i++){
        if (searchArray[i].MetricType == metricType) {
            return i;
        }
    }
    return -1; //not found
};

function validationCheck(metricRecord) {
    try{
        return metricRecord.METRICTYPE != null &&
            metricRecord.EVENTTIMESTAMP > 0;
    } catch (err) {
        console.error('Invalid metric record ' + JSON.stringify(metricRecord,null,2));
        return false;
    }
};