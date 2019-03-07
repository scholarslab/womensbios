/**
  * @file Gets what is search for from search.html, queries the solr database
  * and returns the results to search.html
  * @author Ammon Shepherd <ammon@virginia.edu>
  * @version 0.1
*/

"use strict";

var SOLR_CONFIG = {
  "server": "https://womensbios.lib.virginia.edu/solr/wbcore/select?",
  "defaultField": "fulltext",
  "rows": 2000
};


// Make the XMLHttpRequest object global
var request;
if (window.XMLHttpRequest) {
  request = new XMLHttpRequest();
} else {
  request = new ActiveXObject("Microsoft.XMLHTTP");
}


/**
  * Main function called from search.html (in the body tag).
  * Calls the {@link buildQuery} and {@link getResult} functions.
*/
function querySolr() {
  if ( window.location.search ) {
    // remove the search form when displaying the results (to mimick the old site)
    var el = document.getElementById('searchSection');
    el.remove();

    // build the query from the URL
    var query = buildQuery();

    // get Results from solr (which also handles displaying the results)
    getResult(query);

  } else {
    var loader = document.getElementById('loader');
    loader.remove();
  }
}


/**
  * Builds a single query in the format that solr needs 
  * Calls the {@link getParameterByName} and {@link buildQueryPart} functions.
  *  
  * @returns {string} - The full URL with query parameters to send to solr
*/
function buildQuery() {
  var theURL = SOLR_CONFIG["server"] + "df=" + SOLR_CONFIG["defaultField"] + "&rows=" + SOLR_CONFIG["rows"] + "&q=";
  var theQuery = "";
  var theFields = ["fulltext", "title", "author", "editor", "pubPlace", "publisher", "note", "image"];
  theFields.forEach(function(field, currentIndex) {
    var anAND = "";
    if (currentIndex !== 0) {
      anAND = " AND ";
    }
    if ( getParameterByName(field) ) {
      theQuery += anAND + buildQueryPart(getParameterByName(field), field);
    }
  });
      
  // Remove an AND at the front of the query if it exists
  if ( theQuery.startsWith(" AND ") ) {
    theQuery = theQuery.substring(5);
  }

  return theURL + theQuery;
}     
      
/**
  * Get the value for each parameter in the search query of the URL
  * Function taken from https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript/901144#901144
  *
  * @param {string} name - The name of the input field from the search form
  * @returns {string} - The value of the field from the search form
*/
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(window.location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/** Builds the query from a single input field from the form
  * The query for multiple search terms on a field should look like this:
  * `field:"term" AND field:"mutiple words" AND field:"word"`
  * 
  * @param {string} fieldQuery - The value of the form's input field
  * @param {string} field - The name of the form's input field
  * @returns {string} - The formatted query for that input field's value
*/
function buildQueryPart(fieldQuery, field) {
  var queryPart = "";
  // if there is an AND, then there are multiple queries for this field
  if ( fieldQuery.includes("AND") ){
    // Split the query on AND (removes AND)
    var terms = fieldQuery.split("AND");
    // Get the last index of the array
    var lastIndex = terms.length-1;
    // iterate through each of the terms in the query
    terms.forEach(function(term, currentIndex){
      // if this is not the last term in the array, add an AND
      var addAND = "";
      if (lastIndex !== currentIndex) {
        addAND = " AND ";
      }
      queryPart += field + ':"' + term.trim() + '"' + addAND;
    });
  } else {
    queryPart += field + ':"' + fieldQuery.trim() + '"';
  }
  // Add a space at the end of the query
  queryPart += " ";

  return queryPart;
}

/** Grabs the query and querries the solr server. 
  * Calls the {@link displayResult} function to generate the actual display of the results
  *
  * @param {string} query - The full solr query to be sent to the solr database
*/
function getResult(query) {
  // Using plain vanilla Javascript to avoid dependency issues in the future.
  // Makes this the most "future proof" and self contained.
  if (request) {
    request.open('GET', query, true);
    request.onreadystatechange = function() {
      if (request.readyState == 4 && request.status == 200) {
          displayResult(this);
          var loader = document.getElementById('loader');
          loader.remove();
      }
    }
    request.send();
  } else {
    document.getElementById("searchError").textContent = "There was a problem connecting to solr.";
  }
}

/** Displays the results from solr.
  * Manipulates the search.html page, adding a div to display the number of
  * results, and a list of each item from the search results.
  *
  * @param {object} searchRequest - The JSON object returned by the solr database; the search results.
*/
function displayResult(searchRequest) {
      var jObj = JSON.parse(searchRequest.response);
      var resultDiv = document.getElementById("searchResult");

      var numResults = document.createElement("div");
      resultDiv.appendChild(numResults);
      numResults.innerHTML = "Results Found: " + jObj.response.numFound;

      var resultList = document.createElement("ul");
      resultDiv.appendChild(resultList);
      var theClass = "result_odd";
      jObj.response.docs.forEach(function(item, index){
        if ( (index+1)%2 == 0 ){
          theClass = "result_even";
        } else {
          theClass = "result_odd";
        }

        var text = item.id + ". " + item.author + ", " + item.title;
        /*resultList.innerHTML += "<li class='" + theClass + "'>" + "<a href='browse?bibl_id=" + item.id.trim() + "'>" + text + "</a></li>";*/
        resultList.innerHTML += "<li class='" + theClass + "'>" + "<a href='browse%3Fbibl_id=" + item.id.trim() + ".html'>" + text + "</a></li>";
      });
}



// One time use function to create a temporary page (grover/grover.html) that
// lists all of the records from the solr database. The list is then saved to
// the production site so that each of the individual bibliography pages are
// linked to, which will then allow the scrape to generate a static file for
// each bib. page.
function allFromSolr() {
  var query = "http://localhost:8983/solr/wbcore/select?df=fulltext&rows=2000&q=*:*";
  if (request) {
    request.open('GET', query, true);
    request.onreadystatechange = function() {
      if (request.readyState == 4 && request.status == 200) {
          var jObj = JSON.parse(request.response);
          var resultDiv = document.getElementById("allResults");

          var numResults = document.createElement("div");
          resultDiv.appendChild(numResults);
          numResults.innerHTML = "Results Found: " + jObj.response.numFound;

          var resultList = document.createElement("ul");
          resultDiv.appendChild(resultList);
          var theClass = "result_odd";
          jObj.response.docs.forEach(function(item, index){
            if ( (index+1)%2 == 0 ){
              theClass = "result_even";
            } else {
              theClass = "result_odd";
            }

            var text = item.id + ". " + item.title;
            resultList.innerHTML += "<li class='" + theClass + "'>" + "<a href='http://womensbios.lib.virginia.edu/browse?bibl_id=" + item.id.trim() + "'>" + text + "</a></li>";
          });

      }
    }
    request.send();
  } else {
    document.getElementById("searchError").textContent = "There was a problem connecting to solr.";
  }
}

