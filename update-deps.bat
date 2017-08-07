@echo off
color 0f
title Modmailbot Updater

echo This will update/install the required modules.

:choice
set /P c=Do you wish to continue?[Y/N]?
if /I "%c%" EQU "Y" goto :Y
if /I "%c%" EQU "N" goto :N
Echo Answer Not Reconizied Please Try Again!
goto :choice


:Y
echo Installer Starting...
cd %~dp0
call npm install
pause
exit

:N
Echo Ok, Modmailbot Updater Canceled!
pause
exit
