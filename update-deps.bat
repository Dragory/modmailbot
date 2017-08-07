@echo off
color 0f
title Modmailbot Module Updater 
echo This will update/install the required modules.
echo This will only write to the node_modules folder.
echo If the folder does not exist it will be created automatically.
echo.

:choice
set /P c=Do you wish to continue?[Y/N]?
if /I "%c%" EQU "Y" goto :Y
if /I "%c%" EQU "N" goto :N
echo Answer Not Reconizied Please Try Again!
echo Try Answering Y or N!
goto :choice


:Y
cls
echo Starting Update...
timeout /nobreak /t 5
cd %~dp0
cls
call npm install
title Modmailbot Module Updater
color 0f
echo.
echo Updater Finished!
echo.
echo If you are having problems please try updating node.js if problems still occur
echo then submit an issue on the github page!
echo.
<nul set /p "=Press any key to exit Updater . . ."
pause >nul
exit

:N
cls
echo Ok, Update Canceled!
echo.
<nul set /p "=Press any key to exit Updater . . ."
pause >nul
exit
