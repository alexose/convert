#Convert

OCR Proof of concept

Installation should be pretty easy if you're on a newish debian:

sudo apt-get install nodejs tesseract-ocr ghostscript
cd ~
git clone git@github.com:alexose/convert.git
cd convert
mkdir files
chmod 777 files
npm install
node app.js

Then open up localhost:3000 in Chrome or Firefox.
