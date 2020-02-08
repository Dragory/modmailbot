FROM node:8

# 앱 디렉터리
WORKDIR /usr/src/modmail

# 기본 설치
RUN apt-get update
RUN apt-get install sudo
RUN apt-get install curl
RUN apt-get install apt-transport-https

# yarn 설치
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
RUN sudo apt-get update && sudo apt-get -y install yarn

# Node Update
RUN npm install n -g
RUN n stable

# 의존성 설치
COPY package.json package.json
RUN yarn
RUN npm install pm2 -g

# 소스 추가
COPY . .

# 런타임 정의
RUN echo "pm2-runtime src/index.js --max-memory-restart 1024M" > "modmail.sh"
RUN chmod 777 enc.sh
CMD ./enc.sh