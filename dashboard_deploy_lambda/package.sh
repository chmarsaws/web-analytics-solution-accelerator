zip -r dashboard_deploy.zip dashboard_deploy.js node_modules/
aws s3 cp dashboard_deploy.zip s3://chmars-data-us-east-1/code/dashboard_deploy.zip
aws s3 cp dashboard_deploy.zip s3://chmars-data-us-west-2/code/dashboard_deploy.zip
aws s3 cp dashboard_deploy.zip s3://chmars-data-eu-west-1/code/dashboard_deploy.zip
 
