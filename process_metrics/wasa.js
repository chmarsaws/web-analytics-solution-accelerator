'use strict';
var AWS = require('aws-sdk');
AWS.config.update({
    region: process.env.AWS_REGION,
    endpoint : 'https://dynamodb.' + process.env.AWS_REGION + '.amazonaws.com'
});
var docClient = new AWS.DynamoDB.DocumentClient();
var METRIC_DETAILS_TABLE = process.env.METRIC_DETAILS_TABLE;
var METRIC_TABLE = process.env.METRIC_TABLE;
var EXPIRE_TIME = 604800;//7 days

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
        } else {
            console.error('Unable to retrieve metric metadata from ' + METRIC_TABLE + ': ' + err);
        }
    
        //determine the latest timestamp for each metric type
        var LatestTimestampPerMetric = new Map();
        uniqueMetricDetailKeys.forEach((value, key) => {
            if(LatestTimestampPerMetric.has(value.METRICTYPE)){
                if(value.EVENTTIMESTAMP > LatestTimestampPerMetric[value.METRICTYPE]) {
                    LatestTimestampPerMetric[value.METRICTYPE] = value.EVENTTIMESTAMP;
                } 
            } else {
                var idx = getMetricIndex(metricMetadata.Items,value.METRICTYPE);
                if(value.EVENTTIMESTAMP > metricMetadata.Items[idx].LatestEventTimestamp) {
                    LatestTimestampPerMetric.set(value.METRICTYPE, value.EVENTTIMESTAMP );
                }
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
    });
    callback(null, "done");
};

function upsert(metricTypeSet, allMetrics){
    var firstItem = metricTypeSet[0];//.get(metricTypeSet.keys().next().value);
    var ExpireTime = firstItem.EVENTTIMESTAMP + EXPIRE_TIME;
    var metricDetailParams = {
        TableName : METRIC_DETAILS_TABLE,
        Item : {
            MetricType : firstItem.METRICTYPE,
            EventTimestamp : firstItem.EVENTTIMESTAMP,
            ExpireTime : ExpireTime,
            MetricDetails : metricTypeSet
        },
        ConditionExpression : 'attribute_not_exists(MetricType)'
     };
    try{
        if(firstItem.METRICTYPE == 'hourly_events'){console.log('try to put a new hourly_events item for ' + firstItem.EVENTTIMESTAMP);}
        docClient.put(metricDetailParams, function (err, data) {
            if (err) {
                if(err.code == "ConditionalCheckFailedException") {
                    if(firstItem.METRICTYPE == 'hourly_events'){console.log('    looks like there is already a record there for hourly_events, ' + firstItem.EVENTTIMESTAMP);}
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
            if(itemToAmend.Items[0].MetricType == 'hourly_events'){console.log('    item to amend:\n' + JSON.stringify(itemToAmend,null,2) + '\nWITH\n' + JSON.stringify(metric_list,null,2) );}
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
                case 'replace_existing' : //if it exists, replace with updated value, if it is new, append it
                    metric_list.map( (item) => { //for each item, find a match 
                        var detailIndex = getMetricDetailIndex(detailsToAmend, item.METRICITEM);
                        if(detailIndex > -1) {//same metric exists in existing set
                            detailsToAmend[detailIndex] = item;
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
                var ExpireTime = metric_list[0].EVENTTIMESTAMP + EXPIRE_TIME;
                var amendedParams = {
                    TableName : METRIC_DETAILS_TABLE,
                    Item : {
                        MetricType : metric_list[0].METRICTYPE,
                        EventTimestamp : metric_list[0].EVENTTIMESTAMP,
                        ExpireTime : ExpireTime,
                        MetricDetails : detailsToAmend
                    }
                };
                if(metric_list[0].METRICTYPE == 'hourly_events'){console.log('         new details = \n' + JSON.stringify(amendedParams,null,2));};
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
    console.error('Could not find metric type [' + metricType + ']. Ensure an item exists in the MetricsTable for custom metrics. ');
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