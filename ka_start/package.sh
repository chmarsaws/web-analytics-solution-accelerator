zip -r ka-start.zip ka-start.py
aws s3 cp ka-start.zip s3://chmars-data-us-east-1/code/ka-start.zip
aws s3 cp ka-start.zip s3://chmars-data-us-west-2/code/ka-start.zip
aws s3 cp ka-start.zip s3://chmars-data-eu-west-1/code/ka-start.zip
aws s3 cp ka-start.zip s3://chmars-data-eu-west-2/code/ka-start.zip 
