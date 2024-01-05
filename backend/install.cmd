pip install -r requirements.txt
cd ..
cd my-react-flow-app
rmdir /S src
del index.html
cd ..
move src my-react-flow-app/src
move index.html my-react-flow-app
