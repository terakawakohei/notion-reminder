import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class NotionReminderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Notion と Slack の認証情報等をSSMパラメーターから取得
    const notionReminderAuth = cdk.aws_ssm.StringParameter.valueForStringParameter(
      this,
      "notionReminder-notionAuth"
    );
    const notionINPUTReminderDbId = cdk.aws_ssm.StringParameter.valueForStringParameter(
      this,
      "notionINPUTReminder-notionDbId"
    );
    const slackBotToken = cdk.aws_ssm.StringParameter.valueForStringParameter(
      this,
      "notionReminder-slackBotToken"
    );

    const lambdaForINPUT = new cdk.aws_lambda_nodejs.NodejsFunction(this, "INPUTReminderFunction", {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      entry: "src/INPUTReminderHandler.ts",
      environment: {
        NOTION_AUTH: notionReminderAuth,
        NOTION_DB_ID: notionINPUTReminderDbId,
        SLACK_BOT_TOKEN: slackBotToken,
      },
      bundling: {
        sourceMap: true,
      },
      timeout: cdk.Duration.seconds(29),
    });

    // CloudWatch Events で Lambda を定期実行する
    new cdk.aws_events.Rule(this, "ScheduleForINPUTReminder", {
      schedule: cdk.aws_events.Schedule.cron({
        // 21:00 JSTに実行
        minute: "0",
        hour: "13", // UTCなので日本時間だと+9時間される
      }),
      targets: [new cdk.aws_events_targets.LambdaFunction(lambdaForINPUT)],
    });
  } // The code that defines your stack goes here
}
