#!/bin/bash
####################################
# install_node.sh                  #
# Read from the .nvmrc to grab the #
# nodejs major version and install #
# it on the host.                  #
####################################

if [[ -f /.nvmrc ]]; then
  node_version="$( head -n 1 /.nvmrc)"
  VERSION="node_$node_version.x"
  DISTRO="$(lsb_release -s -c)"

  wget --quiet -O - https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -

  echo "deb https://deb.nodesource.com/$VERSION $DISTRO main" | tee /etc/apt/sources.list.d/nodesource.list
  echo "deb-src https://deb.nodesource.com/$VERSION $DISTRO main" | tee -a /etc/apt/sources.list.d/nodesource.list

  apt-get update
  apt-get install nodejs -y
else
  echo "[ERROR] no nvmrc"
  exit 1
fi
