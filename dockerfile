FROM centos:7
WORKDIR /usr/src/modmail

RUN yum update -y

# Install NVM
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.2/install.sh | bash
SHELL ["bash", "-lc"]
RUN nvm --version

# Copy .nvmrc and install node version
COPY .nvmrc .nvmrc
RUN nvm install
RUN node --version

# Copy Sources
COPY . .

# Install Packages
RUN npm i -g pm2
RUN npm ci

# Volumes
VOLUME [ "/usr/src/modmail/attachments", "/usr/src/modmail/db" ]

# Expose Port
EXPOSE 8890

RUN echo "node ." > "modmail.sh"
RUN chmod 777 modmail.sh
CMD ./modmail.sh
