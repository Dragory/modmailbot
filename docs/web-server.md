# 🌐 Web server

## Table of contents

* [Requirements](#requirements)
* [Configuration](#configuration)
* [Apache Configuration](#apache-configuration)
* [Using Cloudflare for SSL](#using-cloudflare-for-ssl)

## Requirements
You will need:
* A name domain that you own
* A working modmailbot
* Port 80 which is open
* Apache2 (web server)
* Access to your DNS Zone
## Configuration
Open your `config.ini`. You should set `attachmentStorage` and `logStorage` like this: 
```
attachmentStorage = local
logStorage = local
```
Now, just specify what port do you want to use, a custom port or default port like here:
```
port = 8890
```
Then enter the base url of your logs: 
```
url = http://support.example.com
```
You can of course add https, but you will need to open port `443`
```
url = https://support.example.com
```
Dont add a slash (`/`) at the end of the line, this would add a double slash like here: 
```
https://support.example.com//logs/12345678-1234-5678-abcd-efghijklmnop
```
Instead of
```
https://support.example.com/logs/12345678-1234-5678-abcd-efghijklmnop 
```
This works, but it's not beautiful 😃
Here you are

## Apache Configuration
If you don't have Apache installed, just install it with that command:
```bash
sudo apt-get update && apt-get install apache2 #Debian, or Ubuntu-based distributions
sudo yum update httpd && sudo yum install httpd #CentOS or RedHat
sudo dnf install httpd-manual #Fedora
sudo pacman -Syyu && sudo pacman -S apache #Manjaro
```
Choose the command that you need 😊

Since I am on Debian, I will use instructions for Debian.
So login as sudo:
```bash
sudo su -
```
Then create a file with the name you want (eg support)
```bash
touch /etc/apache2/sites-enabled/support.conf
```
In that file, add the following:
```apache
<VirtualHost *:80>
    ServerName <Your Subdomain>
    ProxyPreserveHost On
    ProxyPass / http://localhost:8890/
    ProxyPassReverse / http://localhost:8890/
</VirtualHost>
```
Now, just type `apachectl restart` to restart Apache.
The quickest thing to enable https is using [Cloudflare](https://cloudflare.com). Let's do this.
## Using Cloudflare for SSL
First, just add your domain to Cloudflare. You can follow [that guide](https://community.cloudflare.com/t/step-1-adding-your-domain-to-cloudflare/64309). Then go to `SSL/TLS` at top. Enable at least "Flexible" option, to get SSL Certificate. Then go on `Edge Certificates` then finally enable `Always Use HTTPS`.

## Using DNS Zone to link our subdomain
Go to `DNS` Tab. Click `+ Add record`, then fill the following values:
| Type | Name | IPv4 address | TTL |  Proxy status |
|--|--|--|--|--|
| A | [name of your subdomain] | [ip adress of your hosting machine] | Auto | Proxied |

For me, this will be this:
| Type | Name | IPv4 address | TTL |  Proxy status |
|--|--|--|--|--|
| A | support | 1.2.3.4 | Auto | Proxied |

Then click `Save`. Enjoy
Restart your bot then try 😃


