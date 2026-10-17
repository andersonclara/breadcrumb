import { SidechatAPIClient } from "sidechat.js";
import readline from "node:readline/promises";

const PHONE = process.env.YIKYAK_PHONE;
const UF_GROUP_ID = "1e5c57df-58a6-4dc0-9f3e-7f369f25d78f";

if (!PHONE || !/^\+?\d{10,15}$/.test(PHONE)) {
  console.error("Set YIKYAK_PHONE to your phone number (10–15 digits, optional leading +).");
  process.exit(1);
}

const api = new SidechatAPIClient();

// sidechat.js logs raw errors internally; suppress them in this standalone process.
const originalConsoleError = console.error;
console.error = () => originalConsoleError("Yik Yak library error details omitted to protect credentials.");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  // STEP 1: Authenticate
  console.log("Requesting SMS verification...");

  await api.loginViaSMS(PHONE);

  const code = await rl.question("SMS code: ");
  await api.verifySMSCode(PHONE, code.trim());

  if (!api.userToken) {
    throw new Error("Authentication failed.");
  }

  console.log("\nAuthenticated successfully!");

  // STEP 2: Verify UF account
  const user = await api.getCurrentUser();

  console.log("\n========== SCHOOL ==========");
  console.log("Email domain:", user.emailDomain);
  console.log("School:", user.primarySchool?.name);
  console.log("School ID:", user.primarySchool?.id);

  if (user.primarySchool?.id !== UF_GROUP_ID) {
    throw new Error("Primary school does not match UF.");
  }

  // STEP 3: Fetch UF community posts
  console.log("\n========== UF RECENT POSTS ==========");

  const response = await api.sendRequest(
    `/v1/posts?group_id=${UF_GROUP_ID}&type=recent`,
    "GET"
  );

  const data = await response.json();

  console.log("HTTP status:", response.status);

  if (!response.ok) {
    throw new Error(
      `Feed request failed: ${data.message ?? response.status}`
    );
  }

  if (!Array.isArray(data.posts)) {
    throw new Error("Unexpected posts response format.");
  }

  const posts = data.posts.filter(
    post => post.group_id === UF_GROUP_ID
  );

  console.log("UF posts returned:", posts.length);
  console.log("Has next page:", Boolean(data.cursor));

  // STEP 4: Display posts
  for (const [index, post] of posts.slice(0, 15).entries()) {
    console.log("\n-----------------------------");
    console.log(`UF POST #${index + 1}`);
    console.log("-----------------------------");

    console.log("ID:", post.id);
    console.log("Text:", post.text);
    console.log("Created:", post.created_at);
    console.log("Votes:", post.vote_total);
    console.log("Comment count:", post.comment_count);
    console.log("Group:", post.group?.name ?? "Florida");
  }

  // STEP 5: Find a post with comments
  console.log("\n========== FINDING POST WITH COMMENTS ==========");

  const selectedPost = posts
    .filter(post => Number(post.comment_count) > 0)
    .sort(
      (a, b) =>
        Number(b.comment_count) - Number(a.comment_count)
    )[0];

  if (!selectedPost) {
    console.log("No posts with comments found.");
    console.log("Try running the script again later.");
    return;
  }

  console.log("Selected post ID:", selectedPost.id);
  console.log("Post text:", selectedPost.text);
  console.log("Expected comments:", selectedPost.comment_count);

  // STEP 6: Fetch individual post
  console.log("\n========== FULL POST ==========");

  const fullPost = await api.getPost(selectedPost.id);

  console.log("ID:", fullPost?.id);
  console.log("Full text:", fullPost?.text);
  console.log("Votes:", fullPost?.vote_total);
  console.log("Comment count:", fullPost?.comment_count);

  // STEP 7: Fetch actual comments
  console.log("\n========== FETCHING COMMENTS ==========");

  const commentsResponse = await api.getPostComments(
    selectedPost.id
  );

  console.log(
    "Response is array:",
    Array.isArray(commentsResponse)
  );

  const comments = Array.isArray(commentsResponse)
    ? commentsResponse
    : Array.isArray(commentsResponse?.comments)
      ? commentsResponse.comments
      : null;

  if (comments) {
    console.log("Comments retrieved:", comments.length);

    for (const [index, comment] of comments.entries()) {
      console.log("\n-----------------------------");
      console.log(`COMMENT #${index + 1}`);
      console.log("-----------------------------");

      console.log("ID:", comment.id);
      console.log("Text:", comment.text);
      console.log("Created:", comment.created_at);
      console.log("Votes:", comment.vote_total);
    }

    if (comments.length === 0) {
      console.log(
        "\nWARNING: The post reports comments, but the API returned none."
      );
    }
  } else {
    console.log("Unexpected comments response format.");
    console.log(
      "Response keys:",
      Object.keys(commentsResponse ?? {})
    );
  }

  console.log("\n========== TEST COMPLETE ==========");
}

main()
  .catch(() => {
    // Library error messages can contain authenticated request details.
    originalConsoleError("\nERROR: Yik Yak test failed. Raw authenticated errors are not logged.");
    process.exitCode = 1;
  })
  .finally(() => {
    console.error = originalConsoleError;
    rl.close();
  });
