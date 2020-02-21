FROM debian:stable

RUN mkdir /scripts \
  && mkdir /opt/modmailbot

ADD docker/ /scripts
ADD .nvmrc /.nvmrc
ADD package.json /opt/modmailbot/package.json
ADD package-lock.json /opt/modmailbot/package-lock.json
ARG DEBIAN_FRONTEND=noninteractive
ARG UID=1000
ARG GID=1000
ARG USERNAME=modmail
ARG GROUPNAME=modmail

WORKDIR /opt/modmailbot

EXPOSE 8890
VOLUME [ "/opt/modmail/attachments", "/opt/modmail/db", "/opt/modmail/config.ini", "/opt/modmail/config.json"]

RUN apt-get update \
  && apt-get -y upgrade \
  && apt-get -y install apt-utils -y \
  && apt-get -y install wget lsb-release ca-certificates gnupg \
  && bash /scripts/install_node.sh \
  && npm ci \
  && apt-get -y --purge remove wget lsb-release apt-utils gnupg \
  && apt-get -y autoremove \
  && apt-get -y autoclean \
  && rm -rf /var/lib/apt/lists/*

ADD . /opt/modmailbot

RUN chown -R $UID:$GID /scripts \
  && chown -R $UID:$GID /opt/modmailbot

USER $UID:$GID

CMD ["npm", "start"]
