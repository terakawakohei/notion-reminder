import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class NotionReminderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Notion と Slack の認証情報等をSSMパラメーターから取得
    const notionAuth = cdk.aws_ssm.StringParameter.valueForStringParameter(
      this,
      "notionReminder-notionAuth"
    );
    const notionDbId = cdk.aws_ssm.StringParameter.valueForStringParameter(
      this,
      "notionReminder-notionDbId"
    );
    const slackBotToken = cdk.aws_ssm.StringParameter.valueForStringParameter(
      this,
      "notionReminder-slackBotToken"
    );

    const lambda = new cdk.aws_lambda_nodejs.NodejsFunction(this, "Fn", {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      entry: "src/handler.ts",
      environment: {
        NOTION_AUTH: notionAuth,
        NOTION_DB_ID: notionDbId,
        SLACK_BOT_TOKEN: slackBotToken,
      },
      bundling: {
        sourceMap: true,
      },
      timeout: cdk.Duration.seconds(29),
    });

    // CloudWatch Events で Lambda を定期実行する
    new cdk.aws_events.Rule(this, "Schedule", {
      schedule: cdk.aws_events.Schedule.cron({
        minute: "5",
        hour: "3", // UTCなので日本時間だと+9時間される
      }),
      targets: [new cdk.aws_events_targets.LambdaFunction(lambda)],
    });
  } // The code that defines your stack goes here
}
