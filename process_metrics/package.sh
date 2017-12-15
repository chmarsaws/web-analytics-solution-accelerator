zip -r wasa.zip wasa.js 
aws s3 cp wasa.zip s3://chmars-data-us-east-1/code/wasa.zip
aws s3 cp wasa.zip s3://chmars-data-us-west-2/code/wasa.zip
aws s3 cp wasa.zip s3://chmars-data-eu-west-1/code/wasa.zip
 
