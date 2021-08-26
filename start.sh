#!/bin/bash

echo "Updating bot dependencies..."
if npm ci --only=production --loglevel=warn > /dev/null; then
  echo "OK.";
else
  echo "ERROR.";
  echo "------";
  # when runnning "./start.sh -v" it'll run the command again for troubleshooting...
  if [ $1 -eq -v ]; then
    npm ci --only=production --loglevel=warn > /dev/null
  fi
  exit;
fi

echo "Starting the bot..."
if npm run start; then
  echo "OK";
else
  echo "ERROR."
fi
