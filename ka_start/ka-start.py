import boto3
from botocore.vendored import requests
import json
client = boto3.client('kinesisanalytics')

def lambda_handler(event, context):
    if event['RequestType'] == "Delete":
        send(event, context, "SUCCESS", {})
        return
    app_name = event['ResourceProperties']['AppName']
    app_names = map(lambda x: x['ApplicationName'], client.list_applications()['ApplicationSummaries'])
    if app_name not in app_names:
        send(event, context, "SUCCESS", {})
        return
    app_details = client.describe_application(ApplicationName=app_name)
    app_status = app_details['ApplicationDetail']['ApplicationStatus']
    input_id = app_details['ApplicationDetail']['InputDescriptions'][0]['InputId']
    if app_status == "READY":
        response = client.start_application(
            ApplicationName=app_name,
            InputConfigurations=[
                {
                    'Id': str(input_id),
                    'InputStartingPositionConfiguration': {
                        'InputStartingPosition': 'NOW'
                    }
                },
            ]
            )
        send(event, context, "SUCCESS", {})
    else:
        send(event, context, "FAILED", {})
        
def send(event, context, responseStatus, responseData, physicalResourceId=''):
    responseUrl = event['ResponseURL']
    responseBody = {}
    responseBody['Status'] = responseStatus
    responseBody['Reason'] = 'See the details in CloudWatch Log Stream: ' + context.log_stream_name
    responseBody['PhysicalResourceId'] = physicalResourceId or context.log_stream_name
    responseBody['StackId'] = event['StackId']
    responseBody['RequestId'] = event['RequestId']
    responseBody['LogicalResourceId'] = event['LogicalResourceId']
    responseBody['Data'] = responseData
    json_responseBody = json.dumps(responseBody)
    headers = {
        'content-type' : '', 
        'content-length' : str(len(json_responseBody))
    }
    try:
        response = requests.put(responseUrl,
                                data=json_responseBody,
                                headers=headers)
        print "Status code: " + response.reason
    except Exception as e:
        print "send(..) failed executing requests.put(..): " + str(e)