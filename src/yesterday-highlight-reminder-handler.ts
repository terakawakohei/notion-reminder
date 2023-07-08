import { WebClient } from "@slack/web-api";
import { Client } from "@notionhq/client";
import { ScheduledEvent, Context } from "aws-lambda";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

const notionClient = new Client({
  auth: process.env["NOTION_AUTH"],
});
const slackClient = new WebClient(process.env["SLACK_BOT_TOKEN"]);
const notionDbId = process.env["NOTION_DB_ID"]!;

const extractTitleText = (page) => {
  const titleObjects = page.properties["📝  Highlight"]["title"];
  const plainTextArray = titleObjects.map(
    (titleObject) => titleObject.plain_text
  );
  const plainText = plainTextArray.join("");
  return plainText;
};

const genYesterdayString = () => {
  const yesterdayJST = new Date(
    Date.now() +
      new Date().getTimezoneOffset() * 60 * 1000 +
      9 * 3600 * 1000 -
      24 * 3600 * 1000
  );
  return yesterdayJST.toISOString().split("T")[0];
};

const genTodayString = () => {
  const todayJST = new Date(
    Date.now() + new Date().getTimezoneOffset() * 60 * 1000 + 9 * 3600 * 1000
  );
  return todayJST.toISOString().split("T")[0];
};

const genOneWeekAgoString = () => {
  const oneWeekAgoJST = new Date(
    Date.now() +
      new Date().getTimezoneOffset() * 60 * 1000 +
      9 * 3600 * 1000 -
      7 * 24 * 3600 * 1000
  );
  return oneWeekAgoJST.toISOString().split("T")[0];
};

export const handler = async (event: ScheduledEvent, context: Context) => {
  const yesterday = genYesterdayString();

  const response = await notionClient.databases.query({
    database_id: notionDbId,
    filter: {
      and: [
        {
          property: "Created At",
          date: { equals: yesterday },
        },
      ],
    },
  });

  const pages = response.results as PageObjectResponse[];

  const highlights = pages
    .filter((page) => {
      return page["properties"]["📝  Highlight"]["title"].length > 0;
    })
    .map(
      (page) =>
        `> ${page["properties"]["📙  Book Title"]["select"]["name"]}\n> <${
          page["url"]
        }|${extractTitleText(page)}> `
    )
    .join("\n\n");

  const message = `*昨日追加されたハイライトをお届けします！*\n\n${highlights}`;

  if (message) {
    await slackClient.chat.postMessage({
      channel: "#highlight-reminder",
      text: message,
    });
  }

  return {};
};
