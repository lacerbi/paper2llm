#!/bin/bash
cd paper2llm-web
npm install
npm run build
cd ..
npx gh-pages -d paper2llm-web/build