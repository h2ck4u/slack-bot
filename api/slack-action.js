import fetch from "node-fetch";

export default async function handler(req, res) {
  const payload = JSON.parse(req.body.payload);
  const action = payload.actions[0];

  if (action.action_id === "assign_issue") {
    const [assignee, issue_number] = action.selected_option.value.split("::");

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignees: [assignee] }),
      }
    );

    return res.status(200).json({
      text: `👤 *${assignee}* 님이 이슈 #${issue_number} 담당자로 지정되었습니다!`,
    });
  }

  res.status(200).send();
}
