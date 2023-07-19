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
  const titleObjects = page.properties["タイトル"]["title"];
  const plainTextArray = titleObjects.map((titleObject) => titleObject.plain_text);
  const plainText = plainTextArray.join("");
  return plainText;
};

const extractMemoText = (page) => {
  const richTextObjects = page.properties["一言メモ"]["rich_text"];
  const plainTextArray = richTextObjects.map((richTextObject) => richTextObject.plain_text);
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

//配列をシャッフルしてランダムな順序に並び替える
const getRandomElements = (array, count) => {
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const handler = async (event: ScheduledEvent, context: Context) => {
  const readLaterTagID = "%5EUW~"

  const response = await notionClient.databases.query({
    database_id: notionDbId,
    filter: {
      and: [
        {
          property: "タグ",
          relation: { contains: readLaterTagID },
        },
      ],
    },
  });

  const pages = response.results as PageObjectResponse[];

  const MAX_SELECTED_PAGES = 5;
  const selectedPages = getRandomElements(pages, Math.min(MAX_SELECTED_PAGES, pages.length));

  const message = selectedPages
    .filter((page) => {
      return page["properties"]["タイトル"]["title"].length > 0;
    })
    .map(
      (page) =>
        `> *[${page["properties"]["形式"]["select"]["name"]}]*\n> ${extractMemoText(page)}\n> <${
          page["url"]
        }|${extractTitleText(page)}> `
    )
    .join("\n");

  if (message) {
    await slackClient.chat.postMessage({
      channel: "#input-reminder",
      text: message,
    });
  }

  return {};
};
