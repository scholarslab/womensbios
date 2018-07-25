FROM nginx
COPY default.conf /etc/nginx/conf.d/default.conf
# Uncomment for making the production ready image
COPY static-content /usr/share/nginx/html
