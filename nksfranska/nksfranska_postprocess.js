// This can be a typescript file as well

// Helper library written for useful postprocessing tasks with Flat Data
// Has helper functions for manipulating csv, json, excel, zip, and image files
import { readJSON, readJSONFromURL } from 'https://deno.land/x/flat@0.0.10/src/json.ts'
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

function GetAllResults(json){
   

   return json;
}

// Step 1: Read the downloaded_filename JSON
const filename = Deno.args[0] // Same name as downloaded_filename
var json = await readJSON(filename);

var base_count = json["count"];
var totalCount = json["total_count"];
var base_url = 'http://api.minnen.se/api/responses?topic=393bb4f9-8f9a-4700-aea9-b1faab41545a';
var offset = 0;
var count = base_count;

while (count < totalCount) {
  offset = offset + 10;
  var url = base_url + '&offset=' + offset;
  const json_next = await readJSONFromURL(url);
  for (var i = json_next["items"].length - 1; i >= 0; i--) {
    json["items"].push(json_next["items"][i]);
  }
  count = count + json_next["items"].length;
}

const array = json["items"];

var sortedArray = array.sort( GetSortOrder("presentation_url"));

var responsesWithImages = 0;
var responsesWithCoordinates = 0;
var stats = {};
var indexhtml = '<!DOCTYPE html>\n\
<html lang="sv">\n\
<head>\n\
    <meta charset="utf-8">\n\
    <meta name="viewport" content="width=device-width, initial-scale=1">\n\
    <title>NKs Franska damskrädderi</title>\n\
    <link rel="stylesheet" href="https://unpkg.com/flexmasonry/dist/flexmasonry.css">\n\
    <link rel="stylesheet" href="../style.css">\n\
    <script src="https://unpkg.com/flexmasonry/dist/flexmasonry.js"></script>\n\
</head>\n\
<body>\n\
<div class="grid">';


sortedArray.forEach(function(item){
  delete item.comment_count;
  delete item.hits;
  delete item.imported;
  delete item.likes;
  delete item.open_for_student_edit;
  delete item.ready_for_approval;
  delete item.user_id;

  indexhtml += '<div><div class="inner"><a href="' + item.presentation_url + '">';
  
  if (item.hasOwnProperty('image_dms_id')) {
    let media_url = new URL('https://dms01.dimu.org/image/'+item.image_dms_id);
    responsesWithImages++;
    var imgstring = '<img src="' + media_url + '">';
    indexhtml += imgstring;
    if (item.hasOwnProperty('values')) {
      indexhtml += '<br/>';
    }
  }
  if (item.hasOwnProperty('values')) {
    var answer = item['values'][0]['display_value'];
    answer = answer.replace(/(?:\r\n|\r|\n)/g, '<br/>');
    indexhtml += answer;
  }

  if (item.hasOwnProperty('latitude')) {
    responsesWithCoordinates++;
  }
  indexhtml += '</a></div></div>\n';

});


stats["Responses"] = array.length
stats["responsesWithCoordinates"] = responsesWithCoordinates;
stats["responsesWithImages"] = responsesWithImages;

// Step 3. Write a new JSON file with our filtered data
const newFilename = 'nksfranska/nksfranska_postprocessed.json';

indexhtml += '</div>\n\
\n\
<script>\n\
    FlexMasonry.init(".grid", {breakpointCols: {"min-width: 1500px": 4,"min-width: 1200px": 3,"min-width: 992px": 2,"min-width: 768px": 2,"min-width: 576px": 1}});\n\
</script>\n\
</html>';

await Deno.writeTextFile(newFilename, JSON.stringify(sortedArray, null, 2));
await Deno.writeTextFile('nksfranska/nksfranska_stats.json', JSON.stringify(stats, null, 2));
await Deno.writeTextFile('nksfranska/index.html', indexhtml);
console.log("Wrote a post process file");

removeFile(filename);
