#!/usr/bin/env bash
# Hidden prompts work even when PHP shell_exec/exec/system/proc_open are disabled.
# Secrets go only through an anonymous pipe, not arguments, exported variables,
# the command history, or a temporary plaintext input file.
set +x
set +v
set +a
set -euo pipefail
umask 077
ulimit -c 0 2>/dev/null || true
if [[ ! -t 0 || ! -t 2 ]]; then
    printf '%s\n' 'Run this script in an interactive cPanel Terminal.' >&2
    exit 1
fi
command -v php >/dev/null || { printf '%s\n' 'Command-line PHP was not found.' >&2; exit 1; }
setup_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
setup_php="$setup_dir/configure-coach.php"
# Unset inherited variables first, so secret variables cannot retain export flags.
unset lp_setup_key lp_setup_pass lp_setup_repeat
trap 'unset lp_setup_key lp_setup_pass lp_setup_repeat' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
state="$(php "$setup_php" --check)"
replacement=KEEP
case "$state" in
    NEW) ;;
    EXISTS)
        IFS= read -r -p 'Configuration already exists. Replace it? Type REPLACE: ' confirmation
        if [[ "$confirmation" != REPLACE ]]; then printf '%s\n' 'Unchanged.'; exit 0; fi
        replacement=REPLACE
        ;;
    *) printf '%s\n' 'Setup preflight failed. Update with loader.php and try again.' >&2; exit 1 ;;
esac
printf '%s\n' 'LearnPiano optional AI coach - restricted-host setup' \
    'No network request is made during setup. Your key will not be printed.'
IFS= read -r -s -p 'OpenAI API key (hidden): ' lp_setup_key
printf '\n' >&2
IFS= read -r -s -p 'Choose a coach password (12-72 bytes; hidden): ' lp_setup_pass
printf '\n' >&2
IFS= read -r -s -p 'Repeat coach password (hidden): ' lp_setup_repeat
printf '\n' >&2
# printf is deliberately a Bash builtin: no secret becomes an OS process argument.
{
    builtin printf '%s\n' 'LEARNPIANO-COACH-SETUP-1' "$replacement" \
        "$lp_setup_key" "$lp_setup_pass" "$lp_setup_repeat"
} | php "$setup_php" --stdin-secrets
