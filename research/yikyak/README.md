# Yik Yak preserved experiment

The user reports a previously successful `sidechat.js` experiment: SMS authentication, UF membership verification, recent posts, selected post details, and comments. UF group: `1e5c57df-58a6-4dc0-9f3e-7f369f25d78f`.

The initial prompt omitted the implementation. The user subsequently supplied it, and it is now preserved in `test.mjs`. Changes are limited to `YIKYAK_PHONE`, validation before login, and suppressing potentially sensitive library errors (including the library's internal error logging). All seven experimental steps remain intact. Syntax/import resolution and the missing-phone guard passed. No new login was executed.

No authenticated request, SMS initiation, or personal-data collection has been performed by this investigation. Prior success is user-reported, not newly reproduced. Technical accessibility does not establish authorization to collect or redistribute posts.

The hardcoded phone is now `process.env.YIKYAK_PHONE`, validated without printing it; SMS entry remains interactive. Never commit phone numbers, codes, tokens, account responses, posts/comments, or session files. Do not redirect authenticated terminal output into tracked files. Research `.env*`, `private/`, `raw/`, and `sessions/` are ignored. Ignore rules are a precaution, not a guarantee against `git add -f` or hardcoded secrets.

PowerShell invocation after obtaining platform authorization for this access:

```powershell
# Set YIKYAK_PHONE locally without placing it in shell history:
npm.cmd ci --prefix research/yikyak --ignore-scripts
$securePhone = Read-Host 'Phone in international format' -AsSecureString
$env:YIKYAK_PHONE = [System.Net.NetworkCredential]::new('', $securePhone).Password
node research/yikyak/test.mjs
Remove-Item Env:YIKYAK_PHONE
```

Do not initiate login until the platform's authorization for automated access is established. The library is unofficial and reverse engineered; its MIT software license is not a license to platform data. See FINDINGS.md for terms review. The `2.6.6` dependency pin is the registry version observed during this investigation, not proof it matches the user's previously successful installed version. An undocumented API may change without notice. There are no automated retries or session files in this script.

The original experiment prints posts/comments to the interactive terminal. Run locally, without terminal transcription, screen recording, or output redirection. Never send the SMS code in chat or store it in an environment file. Keep it in the interactive prompt. An account token exists only in process memory. Stop immediately if UF membership verification fails or the service refuses access.
