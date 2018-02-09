zip -r ka-start.zip ka-start.js
aws s3 cp ka-start.zip s3://chmars-data-us-east-1/code/ka-start.zip
aws s3api put-object-acl --acl public-read --key code/ka-start.zip --bucket chmars-data-us-east-1
aws s3 cp ka-start.zip s3://chmars-data-us-west-2/code/ka-start.zip
aws s3api put-object-acl --acl public-read --key code/ka-start.zip --bucket chmars-data-us-west-2
aws s3 cp ka-start.zip s3://chmars-data-eu-west-1/code/ka-start.zip
aws s3api put-object-acl --acl public-read --key code/ka-start.zip --bucket chmars-data-eu-west-1
