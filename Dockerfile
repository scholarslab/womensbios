FROM nginx
COPY default.conf /etc/nginx/conf.d/default.conf

# Comment out for development and production
# Only leave uncommented when making the production ready image
#COPY static-content /usr/share/nginx/html
