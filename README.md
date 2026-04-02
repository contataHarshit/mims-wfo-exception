NODE VERSION -------------->20.19.5
ANGULAR VERSION ------------>17

Visit package.json


RUN LOCALLY- ng serve or npm start

BUILD LOCAL -npm run build or ng build,
BUILD DEPLOYMENT -npm run build:deployment or ng build --configuration deployment,


*** For Deploying to new Machine ***
1.Production - change baseUrl in environment.deployment.ts
2.Staging - change baseUrl in environment.ts


*** Step by Step guide from checkout to build ***

1. Checkout to svn repository
svn checkout svn://svn.contata.com/MIMS/WFH/WFH-NEW/frontend-angular
----------------------------------------------------------------------------
2. Install dependencies
npm install
---------------------------------------------------------------------------
3. For making QA/Staging build run command 
npm run build:staging
*** This will create a dist folder ***
----------------------------------------------------------------------------   
4. For making a production/deployment build run command 
npm run build:deployment 
*** This will create a dist folder ***

*** Environments for QA and Production are already set in Environment.ts and Environment.deployment.ts files ***
-----------------------------------------------------------------------------
5. For uploading the build for deployment
inside dist folder there is a browser folder where your angular build files are present
upload , copy the contents of this browser folder and paste it on the machine folder wherever you want to deploy

-------------------------------------------------------------------------------









