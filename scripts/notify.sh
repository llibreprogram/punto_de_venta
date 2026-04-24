#!/usr/bin/env bash
set -euo pipefail

# Simple notification helper.
# Usage: notify.sh "Subject" "Message or /path/to/body.txt"

SUBJECT=${1:-"Notification"}
BODY_ARG=${2:-""}
DEFAULT_TO="haciendallibre@gmail.com"
TO=${NOTIFY_EMAIL:-$DEFAULT_TO}

BODY_CONTENT=""
if [[ -n "$BODY_ARG" && -f "$BODY_ARG" ]]; then
  BODY_CONTENT=$(cat "$BODY_ARG")
elif [[ -n "$BODY_ARG" ]]; then
  BODY_CONTENT="$BODY_ARG"
else
  BODY_CONTENT="(no details provided)"
fi

send_via_mail() {
  if command -v mail >/dev/null 2>&1; then
    printf "%s\n" "$BODY_CONTENT" | mail -s "$SUBJECT" "$TO"
    return 0
  fi
  return 1
}

send_via_sendmail() {
  if command -v sendmail >/dev/null 2>&1; then
    {
      printf "To: %s\n" "$TO"
      printf "Subject: %s\n" "$SUBJECT"
      printf "Content-Type: text/plain; charset=UTF-8\n\n"
      printf "%s\n" "$BODY_CONTENT"
    } | sendmail -t
    return 0
  fi
  return 1
}

if send_via_mail; then
  echo "Notification sent via 'mail' to $TO" >&2
  exit 0
fi

if send_via_sendmail; then
  echo "Notification sent via 'sendmail' to $TO" >&2
  exit 0
fi

echo "WARN: No 'mail' or 'sendmail' available. Could not email '$TO'." >&2
echo "Subject: $SUBJECT" >&2
echo "--- Body ---" >&2
echo "$BODY_CONTENT" >&2
exit 0
