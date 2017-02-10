#!/bin/bash

git pull
yarn
pm2 restart ModmailBot
