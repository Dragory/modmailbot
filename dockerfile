FROM node:latest
WORKDIR /usr/src/modmail

RUN apt-get update -y

# Copy Sources
COPY . .

# Install Packages
RUN npm i -g pm2
RUN npm ci

# Volumes
VOLUME [ "/usr/src/modmail/attachments", "/usr/src/modmail/logs" ]

# Expose Port
EXPOSE 8890

RUN echo "pm2 start npm -- start" > "modmail.sh"
RUN chmod 777 modmail.sh
CMD ./modmail.sh
