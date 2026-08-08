@echo off
echo Pushing to deploy...
git add .
git commit -m "Hardcore Firebase config for deployment"
git push
echo.
echo Done! Check  Netlify for deployment status.
pause