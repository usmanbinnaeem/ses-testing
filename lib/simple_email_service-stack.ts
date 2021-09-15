import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as actions from "@aws-cdk/aws-ses-actions";
import * as ses from "@aws-cdk/aws-ses";
import * as s3 from "@aws-cdk/aws-s3";

export class SimpleEmailServiceStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // creating bucket to save recieved emails

    const bucket = new s3.Bucket(this, "SES_Bucket", {
      bucketName: "SES_RECIEVED_EMAILS",
    });

    // Lambda call on action

    const actionLambda = new lambda.Function(this, "SES_Action_Lambda", {
      code: lambda.Code.fromInline(`export.handler = (event) => {
        console.log("EVENT ==> ", JSON.stringify(event))
      }`),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "index.handler",
    });

    // creating RuleSet
    const ruleset = new ses.ReceiptRuleSet(this, "RuleSet", {
      receiptRuleSetName: "receiptEmailRuleSet",
    });

    //rule for receiptEmailRuleSet

    ruleset.addRule("Invoke_Lambda", {
      recipients: ["support@usmanbinnaeem.tk"],
      actions: [
        new actions.Lambda({
          function: actionLambda,
          invocationType: actions.LambdaInvocationType.EVENT,
        }),
      ],
      scanEnabled: true,
    });

    ruleset.addRule("SAVE_EMAILS_IN_S3_BUCKET", {
      recipients: [""],
      actions: [
        new actions.S3({
          bucket,
          objectKeyPrefix: "emails",
        }),
      ],
      scanEnabled: true,
    });
  }
}
