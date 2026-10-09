#!/usr/bin/env bash
set -euo pipefail
snapshot=${1:?snapshot path required}
message=${2:?commit message required}
case "$snapshot" in
  data/fpl/league-18767.json|data/letterboxd-recent.json|data/arsenal-2026.json|data/arsenal-scores.json) ;;
  *) echo '::error::Not an approved public data path.'; exit 1 ;;
esac
if [[ -n "$(git diff --cached --name-only)" ]]; then
  echo '::error::Unexpected staged changes. No push.'; exit 1
fi
while IFS= read -r path; do
  if [[ "$path" != "$snapshot" ]]; then
    echo '::error::Unexpected modified file. No push.'; exit 1
  fi
done < <(git diff --name-only)
if git diff --quiet -- "$snapshot" && git ls-files --error-unmatch "$snapshot" >/dev/null 2>&1; then
  echo 'Data unchanged; no commit required.'; exit 0
fi
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -- "$snapshot"
git diff --cached --quiet && exit 0
git commit -m "$message"
for attempt in 1 2 3; do
  git fetch origin main
  if ! git rebase origin/main; then
    git rebase --abort
    echo '::error::Overlapping update. Existing main preserved; no push.'; exit 1
  fi
  node scripts/verify-hq-release.mjs
  node scripts/validate-fpl.mjs
  if git push origin HEAD:main; then
    echo 'Verified data committed. The publisher runs on this workflow completion.'; exit 0
  fi
  echo "Concurrent main update; retry $attempt/3."
  sleep "$attempt"
done
echo '::error::Data push failed after three safe attempts.'
exit 1
