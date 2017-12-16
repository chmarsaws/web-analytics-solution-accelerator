zip -r cognito-setup.zip createCognitoPool.js node_modules/
aws s3 cp cognito-setup.zip s3://chmars-data-us-east-1/code/cognito-setup.zip
aws s3 cp cognito-setup.zip s3://chmars-data-us-west-2/code/cognito-setup.zip
aws s3 cp cognito-setup.zip s3://chmars-data-eu-west-1/code/cognito-setup.zip
aws s3 cp cognito-setup.zip s3://chmars-data-eu-west-2/code/cognito-setup.zip 
