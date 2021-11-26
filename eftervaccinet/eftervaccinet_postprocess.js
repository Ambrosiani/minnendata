// This can be a typescript file as well

// Helper library written for useful postprocessing tasks with Flat Data
// Has helper functions for manipulating csv, json, excel, zip, and image files
import { readJSON } from 'https://deno.land/x/flat@0.0.10/src/json.ts'
import { removeFile } from 'https://deno.land/x/flat@0.0.10/src/remove.ts'

function GetSortOrder(prop){
   return function(a,b){
      if( a[prop] > b[prop]){
          return 1;
      }else if( a[prop] < b[prop] ){
          return -1;
      }
      return 0;
   }
}

// Step 1: Read the downloaded_filename JSON
const filename = Deno.args[0] // Same name as downloaded_filename
const json = await readJSON(filename)

const array = json["responses"];

var sortedArray = array.sort( GetSortOrder("id"));

var responsesWithImages = 0;
var responsesWithCoordinates = 0;
var stats = {};
var indexhtml = '<!DOCTYPE html>\n\
<html lang="sv">\n\
<head>\n\
    <meta charset="utf-8">\n\
    <meta name="viewport" content="width=device-width, initial-scale=1">\n\
    <title>Återföreningen – livet efter vaccinet</title>\n\
    <link rel="stylesheet" href="https://unpkg.com/flexmasonry/dist/flexmasonry.css">\n\
    <link rel="stylesheet" href="../style.css">\n\
    <script src="https://unpkg.com/flexmasonry/dist/flexmasonry.js"></script>\n\
</head>\n\
<body>\n\
<div class="grid">';

sortedArray.forEach(function(response){
  if (response.hasOwnProperty('dms_url')) {
    let url = new URL(response.dms_url);
    let newURL = 'https://dms01.dimu.org'+url.pathname;
    response['dms_url'] = newURL;
    responsesWithImages++;
    var imgstring = '<div><div class="inner"><a href="' + response.url + '"><img src="' + response.dms_url + '"><br/>' + response.slogan + '</a></div></div>\n';
    indexhtml += imgstring;
  }
  if (response.latitude !== null) {
    responsesWithCoordinates++;
  }
});

stats["Responses"] = array.length
stats["responsesWithCoordinates"] = responsesWithCoordinates;
stats["responsesWithImages"] = responsesWithImages;

// Step 3. Write a new JSON file with our filtered data
const newFilename = 'eftervaccinet/eftervaccinet_postprocessed.json';

indexhtml += '</div>\n\
\n\
<script>\n\
    FlexMasonry.init(".grid");\n\
</script>\n\
</html>';

await Deno.writeTextFile(newFilename, JSON.stringify(sortedArray, null, 2));
await Deno.writeTextFile('eftervaccinet/eftervaccinet_stats.json', JSON.stringify(stats, null, 2));
await Deno.writeTextFile('eftervaccinet/index.html', indexhtml);
console.log("Wrote a post process file");

removeFile(filename);
