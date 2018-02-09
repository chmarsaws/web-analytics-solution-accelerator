python manifest.py
aws s3 cp web/ s3://chmars-web-deploy-us-east-1/web --recursive --exclude ".*"
aws s3 cp web/ s3://chmars-web-deploy-us-west-2/web --recursive --exclude ".*"
aws s3 cp web/ s3://chmars-web-deploy-eu-west-1/web --recursive --exclude ".*"
