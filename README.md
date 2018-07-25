# Collective Biographies of Women [Clone]

This project copies the original (written in Apache Cocoon and Solr), and
clones it into plain, static HTML, CSS, and Javascript (with the latest version
of Solr for search?) running in Docker.

## Development

To start Docker and see the website, in the directory with the docker-compose.yml file
- `docker-compose up`
- website is available at http://localhost

To stop Docker
- `docker-compose down --volume`
  - the --volume removes the Docker volume

To rebuild the nginx image:
- `docker images` to get the image hash
- `docker rmi af3lsal` where 'af3lsal' is the hash for the image
- make your changes to default.conf or files in the static-content folder
- when you run `docker-compose up` the next time, it will rebuild the image using the changed files.

Change the nginx config
- `docker images` to get the image hash
- `docker rmi h4shy7` where 'h4shy7' is the hash for the image
- make your change to default.conf
- `docker-compose up` to rebuild the image, or just use `docker-compose build`
  to rebuild but not start the containers

## Production
- `docker-compose up -d` so the process runs in the background

## Folder Structure

```
  ├── Dockerfile          (File to create the nginx image, pulls in the default.conf and files from static-content)
  ├── data                (data folder for the solr container)
  ├── default.conf        (nginx config file with a change to redirect old URLs to new)
  ├── docker-compose.yml
  ├── solr-home           (for solr container)
  ├── static-content      (the static html, css, js, image files. the cloned website)
```


# Process for creating clone

## Clone Creation

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
Here is where I address a number of issues with the static site and how they
were addressed:

### No links to individual bibliography pages
#### Problem
There was a big issue with the scraping as done above. The problem is in the
old production site. The list of bibliographies from the "Browse Bibliography"
page each have a link to `http://womensbios.lib.virginia.edu/browse?bibl_id=`
but there is no `bibl_id`. The XSL is broken and does not show the bib id. This
means that there is no link to these stand alone bibilography pages, which
means the scrape could not make a copy of these pages. This means, that on the
static version, the search results do not have a page to link to when showing
the results (the results show only the bibl_id, author and title, and should
link to a page showing the details of the bibliography entry). The stand alone
bibliography pages do exist on the old production site, but only some of them
are linked to throughout the site. This means they are not available in the
static, scraped version.

To fix this, create a temporary page that grabs all results from solr and makes
a list of them (all 1,264) with a link to their corresponding page on the old
production site (so that is uses the womensbios.lib.virginia.edu domain). This
was initially done on the local docker-ized version of the site (using the JS
file used to recreate the search functionality to populate the temporary file
listing all the data from solr). Then the dynamically created list was saved as
a static HTML file, uploaded to the old production server, and then the whole
site was scraped again, but starting with the static file just generated.

#### Solution
- Static temprorary list
  - Create a temporary file, based off of the search.html file from the
    original scrape (which is a static version of the search page from the old
    production site). This file just needs links to the home page (the live
    domain name) so that scraping will continue there and get all of the sites
    pages.
  - This page uses the custom built javascript file (solrSearch.js) that
    provides access to solr for the static search page, but uses a one time
    function (allFromSolr) to build the list.

### Search with AND/OR/NOT
#### Problem
The original search includes ability to use AND/OR/NOT in the search query.
Rewriting this to the new solr search is possible, but would take a lot of
programming.

#### Solution
Just offer the ability to use AND in the search.


## Fix Old URLs

Use nginx rewrite to fix old URLs that would be broken.

The old site had URLs that looked like this: 

- `http://womensbios.lib.virginia.edu/featured?id=QUEEN_ELIZABETH_I`

The scraping grabs those pages just fine, but adds the '.html' extension so
that they are served and linked to properly, which makes the URLs look like
this:

- `http://localhost/featured%3Fid=QUEEN_ELIZABETH_I.html`

Notice the replacement of `?` with `%3F` and the addition of the `.html` extension.

This makes a usable mirror of the website, but breaks any links or bookmarks to
the old URLs that people may have (in browsers or on their own websites).

To fix this most easily, use nginx to rewrite old URLs to replace '?' with
'%3F' and add the '.html' extension. To do this, there needs to be a
default.conf in the main folder (at the same level as the docker-compose.yml
file) with rewrite rules which go inside the 'location' section. See the
default.conf file.

With the default.conf file in the directory with the docker-compose.yml file,
the nginx config file is pulled into the image when it is built (with with
docker-compose up command).


# Solr
This uses a Dockerized solr to get solr up to date and keep the search functionality.

We'll create an image of our solr to use with docker-compose (since getting
docker-compose to pull in the managed-schema file isn't working).

## Create the solr core
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

  ```html
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
- Note: the 'type' was changed from 'text' to 'text_general' according to latest version of Solr.
- This forces the fields to be of a certain type. This keeps our sanity when
  importing the data, as the date fields are messed up and crazy, dirty data to
  the extreme.


- Spin up a docker container using the modified config file
  - running as plain docker works, but not docker-compose, it doesn't load the modified config file
  - `docker run -d --name temp-solr -p 8983:8983 -v $PWD/myconfig:/opt/solr/server/solr/configsets/myconfig:ro solr solr-precreate wbcore /opt/solr/server/solr/configsets/myconfig`
    - Use the `-d` flag to run in the background, or remove if you want to see output.


## Get the data from the old solr
- Go to `http://sdsv3.its.virginia.edu:8080/solr/womensbios/select/?q=*%3A*&version=2.2&start=0&rows=2000&indent=on&wt=json`
- Download the JSON and save as `alldata.json`
  - If you get errors when importing this file, check to see if the file type
    is correct. Sometimes it may end up as `UTF-8 Unicode (with BOM) text, with very long lines` and solr doesn't like it. 
  - You find the file type by running the command `file alldata.json`. 
  - Convert it to plain UTF-8 with the `dos2unix` command (may need to install
    it first, on Mac use `brew install dos2unix`, and then run `dos2unix alldata.json`)
- Fix the file by:
  - delete these lines from the top of the file
    ```json
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
    ```json
    }}                                                                           
    ```
  - You can move the closing bracket to the last line if you feel so inclined.
  - Add the missing id 'a748' on line 17876 (or search for 'a749' and it's the object preceding).

## Load the data from the old solr
With the file fixed up, we can load it into the solr.
- Copy the file into the solr docker
  - `docker cp alldata.json temp-solr:/opt/solr/alldata.json`
- And then run the load command
  - `docker exec -it --user=solr temp-solr bin/post -c wbcore alldata.json`

## Get a modified web.xml in there
- Grab a copy of the original web.xml file
  - `docker cp temp-solr:/opt/solr/server/solr-webapp/webapp/WEB-INF/web.xml web.xml`
- Add to the web.xml right after the `<web-app>` tag
  - See (http://laurenthinoul.com/how-to-enable-cors-in-solr/)
  ```html
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


## Make an image of the running container
- Create the image from the running 'temp-solr' container
  - `docker commit --author "Ammon Shepherd ammon@virginia.edu" --message "Image with data from womensbios" temp-solr scholarslab/wbsolr:1.0`
