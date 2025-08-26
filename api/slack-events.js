import fetch from "node-fetch";

export default async function handler(req, res) {
  const body = req.body;

  // Slack URL verification
  if (body.type === "url_verification")
    return res.status(200).send(body.challenge);

  if (body.type === "event_callback") {
    const event = body.event;

    // 봇 메시지 무시
    if (event.subtype === "bot_message") return res.status(200).send();

    // "!이슈등록" 메시지 감지
    if (event.type === "message" && event.text.startsWith("!이슈등록")) {
      const [cmd, ...rest] = event.text.split(" ");
      const title = rest.join(" ") || "제목 없음";

      const owner = process.env.GITHUB_OWNER;
      const repo = process.env.GITHUB_REPO;
      const token = process.env.GITHUB_TOKEN;

      // GitHub 이슈 생성
      const issueResp = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({
            title,
            body: `등록자: <@${event.user}> (via Slack)`,
          }),
        }
      );
      const issue = await issueResp.json();

      // GitHub Collaborators 조회
      const collabResp = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/collaborators`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      const collaborators = await collabResp.json();
      const options = collaborators.map((u) => ({
        text: { type: "plain_text", text: u.login },
        value: `${u.login}::${issue.number}`,
      }));

      // Slack 메시지 전송 (담당자 선택 UI 포함)
      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: event.channel,
          text: `✅ GitHub 이슈가 생성되었습니다: ${issue.html_url}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*이슈 생성됨:* <${issue.html_url}|${title}>`,
              },
              accessory: {
                type: "static_select",
                placeholder: { type: "plain_text", text: "담당자 선택" },
                action_id: "assign_issue",
                options,
              },
            },
          ],
        }),
      });
    }
  }

  res.status(200).send();
}
