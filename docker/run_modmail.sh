#!/bin/bash
########################################
# run_modmail.sh                       #
# Pre-flight checks, along with the    #
# start-up for the modmail bot         #
########################################

BOT_HOME_DIR="/opt/modmailbot"

function check_node_version() {
  installed_ver="$(node --version)"
  nvmrc_ver="$(cat /.nvmrc)"
  expected_ver_include="v$nvmrc_ver"
  if [[ $installed_ver =~ $expected_ver_include.* ]]; then
    echo "[INFO] Correct NodeJS version installed"
  else
    echo "[CRITICAL] Incorrect NodeJS version installed, exiting"
    exit 1
  fi
}

function check_required_vars() {
  minimum_required_vars=(MM_TOKEN MM_MAIN_GUILD_ID MM_LOG_CHANNEL_ID)

  for var in "${minimum_required_vars[@]}"
  do
    if [[ -z "$var" ]]; then
      echo "[CRITICAL] Required variable $var is not set. exiting"
      exit 1
    else
      echo "[INFO] The variable $var is set."
    fi
  done

}

function check_config() {
  if [[ -f "$BOT_HOME_DIR/config.ini" ]]; then
    echo "[INFO] config.ini exists, trusting it is good"
  elif [[ -f "$BOT_HOME_DIR/config.json" ]]; then
    echo "[INFO] config.json exists, trusting it is good"
  else
    echo "[INFO] No config file, checking environment variables"
    check_required_vars
  fi
}

function start() {
  dir="$(pwd)"

  if [[ "$dir" == "$BOT_HOME_DIR" ]]; then
    npm start
  else
    cd $BOT_HOME_DIR || exit 1
    npm start
  fi
}

function main() {
  check_node_version
  check_config
  start
}

main
