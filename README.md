# Collective Biographies of Women [Clone]

This project copies the original (written in Apache Cocoon and Solr), and
clones it into plain, static HTML, CSS, and Javascript (with the latest version
of Solr for search?) running in Docker.

********************************
# Development
Steps for setting up a local development environment for the project

## Clone the GitHub repo
  - `git clone https://github.com/scholarslab/womensbios.git`
  - For developing (editing the HTML, CSS, JS) of the website, the static files need to exist in a folder called `static-content`.
  - Then comment out the line containing 'static-content' in the Dockerfile. (make it look like this)
    ```YAML
      FROM nginx
      COPY default.conf /etc/nginx/conf.d/default.conf

      # Only leave uncommented when making the production ready image
      #COPY static-content /usr/share/nginx/html
    ```
  - And uncomment the four lines in docker-compose.yml (make it look like this)
    ```YAML
      version: '2'
      services:
        solr:
          image: registry.gitlab.com/scholars-lab/womensbios/wb-solr:1.0
          container_name: womensbios_solr
          restart: always
          ports:
           - ${SOLR_PORTS}
        womenbios:
          # Uncomment next two lines for development. Requires the Dockerfile to exist.
          build: 
            context: .
          image: registry.gitlab.com/scholars-lab/womensbios/wb-static:1.1
          container_name: womensbios_static
          depends_on:
            - solr
          ports:
            - ${PORTS}
          restart: always
          volumes:
            - ./static-content:/usr/share/nginx/html
    ```

## Docker commands
### To start Docker and see the website
While in the directory with the docker-compose.yml file
  - `docker-compose up`
  - website is available at http://localhost

### To stop Docker
  - `docker-compose down --volume`
  - the --volume removes the Docker volume

### To create/modify the STATIC image
See below for instructions: Making the STATIC image

### To create/modify the SOLR image
See below for instructions: Making the SOLR image



********************************
# Production
To set up the production server, set up like normal for a new domain:

- Put the files in this repo into the webhosting directory (ex. /var/www/html)
  - `git clone https://github.com/scholarslab/womensbios.git .`
- Create a web config file that uses a proxy
  - Apache: include lines for ProxyPass, ProxyPassReverse, and ProxyPreserveHost on 
  - Nginx: include lines for upstream and in the location section use proxy_* directives
- Create a `.env` file in the folder with the `docker-compose.yml` file
  - Port numbers must be above 1234, and not be taken already.
  - The file should look like this
    ```
      PORTS=8xxx:80
      SOLR_PORTS=9xxx:8983
    ```
    Notes:
    - `PORTS`: the first port is the server port, where Apache/Nginx will send requests; the second port is the Docker internal port.
    - `SOLR_PORTS`: the first port is the server port used for solr; the second is the internal Docker port number.
- Update the `static-content/solrSearch.js` file to use the correct local port for Solr (as defined in the .env file above).
  - change this line to the first port used above in the SOLR_PORT line, and the domain name to `womensbios.lib.virinia.edu`
  - `  "server": "http://womensbios.lib.virginia.edu:9xxx/solr/wbcore/select?",`
- Comment out two lines in `docker-compose.yml`
  ```
    #build: 
    #  context: .
  ```
- While in the above directory, start the containers
  - `docker-compose up -d` 
  - use `-d` so that the process runs in the background


********************************
# Folder Structure

All of these files are in the git repository (except .env which is created separately on local and production).

```
  ├── alldata.json        (data file, contains all of the bibliography information, in JSON format)
  ├── data                (data folder for the solr container)
  ├── default.conf        (nginx config file with a change to redirect old URLs to new)
  ├── Dockerfile          (File to create the nginx image, pulls in the default.conf and files from static-content)
  ├── docker-compose.yml  (file used by docker, determines which docker settings and images to use)
  ├── .env                (environment file)
  ├── myconfig/           (folder containing the solr config files)
  ├── README.md           (this file)
  ├── static-content/     (folder containing the static html, css, js, image files. the cloned website, not under version control, but in the wb-static image as /usr/share/nginx/html/)
  ├── web.xml             (solr config file that allows the javascript in the search.html file to access the solr server)
```

Note: The following files in the static-content/ folder were edited from the originally scraped static versions, or created new.
- search.html   (modified to connect with the solr docker container for search)
- solrSearch.js (created new as the connection between the solr database and the search page; displays the results from solr to search.html)
- style.css     (adds styles for the loading animation)

********************************
# Process for creating a clone

These were the steps used to recreate the old production site from Apache Cocoon and Solr.

It consists of creating two images that work together to provide static files and the Solr search.
The basic steps required to create the images are outlined below, with detailed steps following.

- STATIC image: 
  - scrape the original website
  - copy files
  - use the official nginx image  with a Dockerfile to use a modified default.conf file
  - modify the default.conf nginx file
  - change the search page to work with solr via javascript
  - create a javascript file to connect the search page and solr search engine
- SOLR image:
  - use the official solr image
  - change the managed-schema file
  - change the web.xml file

## Create the STATIC image
- Scrape the website from the original with:
  - `wget --mirror -P static-content -nH -np -p -k -E http://womensbios.lib.virginia.edu`
  - With these options, wget copies all of the files and their required files
    (css, js, images, etc), and rewrites the URLs to include the .html
    extension. This works great, but breaks old links out in the wild (fixed
    with nginx rewrite).

    Notes:
      - `--mirror` 
        - "This option turns on recursion and time-stamping, sets infinite
          recursion depth and keeps FTP directory listings.  It is currently
          equivalent to -r -N -l inf --no-remove-listing."
      - `-P static-content`
        - where to put the downloaded files
      - `-nH`
        - no host directories (so it won't save the domain name part of the URL as
          a directory in which files are stored)
      - `-np`
        - don't ascend to the parent directory when doing recursive saves
      - `-p`
        - get all of the files necessary to make the page render properly (css, js,
          images, etc)
      - `-k`
        - convert all of the links in all of the downloaded HTML files so that they work
      - `-E`
        - adjust extension. adds the .html to all URL paths when not present
          (causes issues that are resolved with nginx rewrites)

    ## Problems and the Solutions
    There were a number of problems with converting the old site to a static
    archive; this is how they were addressed:

    ### ¶ Copy images
    #### Problem
    The scrape above does not copy all of the images used in the image carosels.

    #### Solution
    Copy them manually after the scrape:

    - `scp -r sdsv2:/usr/local/projects/womensbios/current/www/full/* static-content/full/`

    ### ¶ No links to individual bibliography pages
    #### Problem
    There was a big issue with the scraping as done above. The problem is in the
    old production site. The list of bibliographies from the "Browse Bibliography"
    page each have a link to 'http://womensbios.lib.virginia.edu/browse?bibl_id='
    but there is no 'bibl_id' given. The XSL is broken and does not show the
    'bibl_id'. This means that there is no link to these stand alone bibilography
    pages, which means the scrape could not make a copy of these pages. 

    This means, that on the static version, the search results do not have a
    page to link to when showing the results the results show only the bibl_id,
    author and title, and should link to a page showing the details of the
    bibliography entry.

    The stand alone bibliography pages do exist on the old production site, but
    only some of them are linked to throughout the site. This means that not all
    bibliography pages are available in the static, scraped version.

    #### Solution
    To fix this, create a temporary page that grabs all results from solr and makes
    a list of them (all 1,264) with a link to their corresponding page on the old
    production site (so that is uses the womensbios.lib.virginia.edu domain). 

    This was initially done on the local docker-ized version of the site (using the
    JS file to recreate the search functionality to populate the temporary file
    listing all the data from solr). Then the dynamically created list was saved as
    a static HTML file, uploaded to the old production server, and then the whole
    site was scraped again, but starting with the static file just generated.

    - Static temprorary list
      - Create a temporary file, based off of the search.html file from the
        original scrape (which is a static version of the search page from the old
        production site). This file just needs links to the home page (the live
        domain name) so that scraping will continue there and get all of the site's
        pages.
      - This page uses the custom built javascript file (solrSearch.js) that
        provides access to solr for the static search page, but uses a one time
        function (allFromSolr) to build the list.
    - rescrape the webiste using the temporary file with a list of all bibliography
      items linking to their individual pages.
      - `wget --mirror -P static-content -nH -np -p -k -E http://womensbios.lib.virginia.edu/templist.html`

    ### ¶ Search with AND/OR/NOT
    #### Problem
    The original search includes ability to use AND/OR/NOT in the search query.
    Rewriting this to the new solr search is possible, but would take a lot of
    programming.

    #### Solution
    Just offer the ability to use AND in the search.

    ### ¶ No pagination for search results
    #### Problem
    The static version of the search results do not have pagination. So a query
    returning 100 results generates a long list and takes a while to generate.

    #### Solution
    This is possible to build, but it was not seen as critical for the archiving of
    this project.

    ### ¶ Some old URLs are broken
    #### Problem
    The old site had URLs that looked like this: 

    - `http://womensbios.lib.virginia.edu/featured?id=QUEEN_ELIZABETH_I`

    The scraping grabs those pages just fine, but adds the '.html' extension so
    that they are served and linked to properly, which makes the URLs look like
    this:

    - `http://localhost/featured%3Fid=QUEEN_ELIZABETH_I.html`

    Notice the replacement of `?` with `%3F` and the addition of the `.html` extension.

    This makes a usable mirror of the website, but breaks any links or bookmarks to
    the old URLs that people may have (in browsers or on their own websites).

    #### Solution
    To fix this most easily, use nginx to rewrite old URLs to replace '?' with
    '%3F' and add the '.html' extension. To do this, there needs to be a
    default.conf in the main folder (at the same level as the docker-compose.yml
    file) with rewrite rules which go inside the 'location' section. See the
    default.conf file.

    With the default.conf file in the directory with the docker-compose.yml file,
    the nginx config file is pulled into the image when it is built (with with
    docker-compose up command).

    The default.conf file should look like this:
      ```nginx
        server {
            listen       80;
            server_name  localhost;
            #charset koi8-r;
            #access_log  /var/log/nginx/host.access.log  main;
            location / {
                root   /usr/share/nginx/html;
                index  index.html index.htm;
                # break if URI has .html extension
                if ($request_filename ~* ^.+.html$) {
                    break;
                }
                # if there is a ? in the URL replace it with %3F and add .html extension
                if ($request_uri ~ ^(/.*)[?](.*)$) { 
                    return 301 $1%3f$2.html;
                }
                # if URL does not have an extension, rewrite it with .html
                if (-e $request_filename.html) {
                   rewrite ^/(.*)$ /$1.html last;
                   break;
                }
            }
            #error_page  404              /404.html;
            # redirect server error pages to the static page /50x.html
            #
            error_page   500 502 503 504  /50x.html;
            location = /50x.html {
                root   /usr/share/nginx/html;
            }

        }
      ```

### Making the STATIC image
- Uncomment the COPY command in the Dockerfile. Comment out after the docker build command.
  - `COPY static-content /usr/share/nginx/html`
- To create the STATIC image, run the docker build command, and bump the tag number (in the line below as #.#)
  - `docker build -t registry.gitlab.com/scholars-lab/womensbios/wb-static:#.# .`

### Push to remote repository
- Push image to central repository, using the correct tag version number
  - `docker push registry.gitlab.com/scholars-lab/womensbios/wb-static:#.#`

## Create the SOLR image
This uses a Dockerized solr to get solr up to date and keep the search
functionality.

Create an image of our solr with regular docker, which can then be used with
docker-compose (since getting docker-compose to pull in the managed-schema file
isn't working).

### Create the solr core
- First we need to create a default solr container (and remove it as soon as it exits)
  - `docker create --rm --name copier solr`
- Then copy the default config folder to your local directory
  - `docker cp copier:/opt/solr/server/solr/configsets/_default myconfig`
  - This creates a folder called 'myconfig' with the default config settings for a solr instance.
- Then remove the default solr container
  - `docker rm copier`
- Edit the `myconfig/conf/managed-schema` file to include the fields that we have in the data.
- Add these lines at about line 120, which we got from the schema.xml file from
  the old install (`/usr/local/projects/womensbios/current/solr-home/conf/schema.xml`):

  ```xml
  <field name="ref" type="text_general" indexed="true" multiValued="true" stored="true"/>
  <field name="title" type="text_general" indexed="true" multiValued="true" stored="true"/>
  <field name="author" type="text_general" indexed="true" multiValued="true" stored="true"/>
  <field name="editor" type="text_general" indexed="true" multiValued="true" stored="true"/>
  <field name="pubPlace" type="text_general" indexed="true" multiValued="true" stored="true"/>
  <field name="publisher" type="text_general" indexed="true" multiValued="true" stored="true"/>
  <field name="date" type="text_general" indexed="true" multiValued="true" stored="true"/>
  <field name="note" type="text_general" indexed="true" multiValued="true" stored="true"/>
  <field name="image" type="text_general" indexed="true" multiValued="true" stored="true"/>
                                                                     
                                                                     
  <!-- catchall field, containing all other searchable text fields (implemented
  via copyField further on in this schema  -->                                 
  <field name="fulltext" type="text_general" indexed="true" stored="false" multiValued="true"/>
                                                                     
  <copyField source="id" dest="fulltext"/>                                      
  <copyField source="title" dest="fulltext"/>                                   
  <copyField source="author" dest="fulltext"/>                                  
  <copyField source="editor" dest="fulltext"/>                                  
  <copyField source="pubPlace" dest="fulltext"/>                                
  <copyField source="publisher" dest="fulltext"/>                               
  <copyField source="date" dest="fulltext"/>                                    
  <copyField source="note" dest="fulltext"/>                                    
  <copyField source="image" dest="fulltext"/>                                   
  <copyField source="ref" dest="fulltext"/> 
  ```

- *Note:* the 'type' was changed from 'text' to 'text_general' according to latest version of Solr.
- This forces the fields to be of a certain type. This keeps our sanity when
  importing the data, as the date fields are messed up and crazy, dirty data to
  the extreme.


- Spin up a docker container using the modified config file
  - running as plain docker works, but not docker-compose, it doesn't load the modified config file
  - `docker run -d --name temp-solr -p 8983:8983 -v $PWD/myconfig:/opt/solr/server/solr/configsets/myconfig:ro solr solr-precreate wbcore /opt/solr/server/solr/configsets/myconfig`
    - Use the `-d` flag to run in the background, or remove if you want to see output.


### Get the data from the old solr
- Go to `http://sdsv3.its.virginia.edu:8080/solr/womensbios/select/?q=*%3A*&version=2.2&start=0&rows=2000&indent=on&wt=json`
- Download the JSON and save as `alldata.json`
  - If you get errors when importing this file, check to see if the file type
    is correct. Sometimes it may end up as `UTF-8 Unicode (with BOM) text, with very long lines` and solr doesn't like it. 
  - You find the file type by running the command 
    - `file alldata.json`
  - Convert it to plain UTF-8 with the `dos2unix` command. May need to install
    it first, on Mac use `brew install dos2unix`, and then run 
    - `dos2unix alldata.json`
- Fix the file by:
  - delete these lines from the top of the file

    ```JSON
      {
      "responseHeader":{
        "status":0,
        "QTime":1,
        "params":{
          "indent":"on",
          "wt":"json",
          "rows":"20000",
          "version":"2.2",
          "start":"0",
          "q":"*:*"}},
      "response":{"numFound":1264,"start":0,"docs":[
    ```

  - and replace with a single opening bracket `[`
  - and delete these lines from the bottom of the file

    ```JSON
      }}
    ```

  - You can move the closing bracket to the last line if you feel so inclined.
  - Add the missing id 'a748' on line 17876 (or search for 'a749' and it's the object preceding).

### Load the data from the old solr
With the file fixed up, we can load it into the solr.
- Copy the file into the solr docker
  - `docker cp alldata.json temp-solr:/opt/solr/alldata.json`
- And then run the load command
  - `docker exec -it --user=solr temp-solr bin/post -c wbcore alldata.json`

### Get a modified web.xml in there
There is a CORS issue with the solrSearch.js file accessing the solr server.
This change allows the cross origin resource sharing to happen.

- Grab a copy of the original web.xml file
  - `docker cp temp-solr:/opt/solr/server/solr-webapp/webapp/WEB-INF/web.xml web.xml`
- Add to the web.xml right after the `<web-app>` tag
  - See (http://laurenthinoul.com/how-to-enable-cors-in-solr/)

  ```xml
  <filter>
    <filter-name>cross-origin</filter-name>
    <filter-class>org.eclipse.jetty.servlets.CrossOriginFilter</filter-class>
    <init-param>
      <param-name>allowedOrigins</param-name>
      <param-value>*</param-value>
    </init-param>
    <init-param>
      <param-name>allowedMethods</param-name>
      <param-value>GET,POST,OPTIONS,DELETE,PUT,HEAD</param-value>
    </init-param>
    <init-param>
      <param-name>allowedHeaders</param-name>
      <param-value>origin, content-type, accept</param-value>
    </init-param>
  </filter>

  <filter-mapping>
    <filter-name>cross-origin</filter-name>
    <url-pattern>/*</url-pattern>
  </filter-mapping>
  ```

- Then copy that back into the container
  - `docker cp web.xml temp-solr:/opt/solr/server/solr-webapp/webapp/WEB-INF/web.xml`
- And restart solr
  - `docker exec -it temp-solr bin/solr restart`
- This stops the container, so get it up and running again...
  - `docker start temp-solr`

### Making the SOLR image
- Create the SOLR image from the running 'temp-solr' container, updating the tag version number (seen in the line below as #.#)
  - `docker commit --author "First_Name Last_Name name@email.com" --message "Image with data from womensbios" temp-solr registry.gitlab.com/scholars-lab/womensbios/wb-solr:#.#`
- Stop and remove the temp image/container
  - `docker rm temp-solr`

### Push to remote repository
- Push image to central repository, using the correct tag version number 
  - `docker push registry.gitlab.com/scholars-lab/womensbios/wb-solr:#.#`
