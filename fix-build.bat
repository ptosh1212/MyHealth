@echo off
echo Fixing build issues after folder copy...
echo.

echo Step 1: Removing old node_modules and build cache...
if exist node_modules(
    echo Deleting node_modules... This may take a minute...
    rmdir /s /q node_modules
)
if exist .next rmdir /s /q .next
if exist package-lock.json del package-lock.json
echo.
echo Step 2. Fresh install of dependencies...
echo This will take a few minutes...
call npm install

echo. 
echo Step 3: Running build...
call npm run build

echo.
echo Done! Ceck the output above for any remaining errors.
pause