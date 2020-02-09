FROM node:8
WORKDIR /usr/src/modmail

RUN apt-get update
RUN apt-get install sudo
RUN apt-get install curl
RUN apt-get install apt-transport-https
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
RUN sudo apt-get update && sudo apt-get -y install yarn
RUN npm install n -g
RUN n stable

COPY package.json package.json
RUN yarn
RUN npm install pm2 -g

COPY . .

RUN echo "pm2-runtime src/index.js --max-memory-restart 1024M" > "modmail.sh"
RUN chmod 777 modmail.sh
CMD ./modmail.sh
