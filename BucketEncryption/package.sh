zip -r DefaultBucketEncryption.zip DefaultBucketEncryption.js 
aws s3 cp DefaultBucketEncryption.zip s3://chmars-data-us-east-1/code/DefaultBucketEncryption.zip
aws s3api put-object-acl --acl public-read --key code/DefaultBucketEncryption.zip --bucket chmars-data-us-east-1
aws s3 cp DefaultBucketEncryption.zip s3://chmars-data-us-west-2/code/DefaultBucketEncryption.zip
aws s3api put-object-acl --acl public-read --key code/DefaultBucketEncryption.zip --bucket chmars-data-us-west-2
aws s3 cp DefaultBucketEncryption.zip s3://chmars-data-eu-west-1/code/DefaultBucketEncryption.zip
aws s3api put-object-acl --acl public-read --key code/DefaultBucketEncryption.zip --bucket chmars-data-eu-west-1

