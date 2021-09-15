import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as actions from "@aws-cdk/aws-ses-actions";
import * as ses from "@aws-cdk/aws-ses";
import * as s3 from "@aws-cdk/aws-s3";
import * as apigw from "@aws-cdk/aws-apigateway";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "@aws-cdk/aws-iam";

export class SimpleEmailServiceStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const role = new Role(this, "snsLambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    ///Attaching ses access to policy
    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["ses:SendEmail", "ses:SendRawEmail", "logs:*"],
      resources: ["*"],
    });
    //granting IAM permissions to role
    role.addToPolicy(policy);

    // creating bucket to save recieved emails

    const bucket = new s3.Bucket(this, "SES_Bucket", {
      bucketName: "ses-recieved-email",
    });

    // Lambda call on action

    const actionLambda = new lambda.Function(this, "SES_Action_Lambda", {
      code: lambda.Code.fromInline(`exports.handler = (event) => {
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
      recipients: ["usmaanbinnaeem@gmail.com"],
      actions: [
        new actions.Lambda({
          function: actionLambda,
          invocationType: actions.LambdaInvocationType.EVENT,
        }),
      ],
      scanEnabled: true,
    });

    ruleset.addRule("SAVE_EMAILS_IN_S3_BUCKET", {
      recipients: ["usmaanbinnaeem@gmail.com"],
      actions: [
        new actions.S3({
          bucket,
          objectKeyPrefix: "emails",
        }),
      ],
      scanEnabled: true,
    });

    //  Creating send email lambda handler
    const emailSender = new lambda.Function(this, "SendEmail", {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "lambda.handler",
      role: role,
    });

    const api = new apigw.RestApi(this, "SendEmailEndPoint");
    api.root
      .resourceForPath("sendmail")
      .addMethod("POST", new apigw.LambdaIntegration(emailSender));

    // logging API endpoint
    new cdk.CfnOutput(this, "Send email endpoint", {
      value: `${api.url}sendmail`,
    });
  }
}
