zip -r wasa.zip wasa.js 
aws s3 cp wasa.zip s3://chmars-data-us-east-1/code/wasa.zip
aws s3api put-object-acl --acl public-read --key code/wasa.zip --bucket chmars-data-us-east-1
aws s3 cp wasa.zip s3://chmars-data-us-west-2/code/wasa.zip
aws s3api put-object-acl --acl public-read --key code/wasa.zip --bucket chmars-data-us-west-2
aws s3 cp wasa.zip s3://chmars-data-eu-west-1/code/wasa.zip
aws s3api put-object-acl --acl public-read --key code/wasa.zip --bucket chmars-data-eu-west-1
