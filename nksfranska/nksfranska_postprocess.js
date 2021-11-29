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
var indexHtml = '<!DOCTYPE html>\n\
<html lang="sv">\n\
<head>\n\
    <meta charset="utf-8">\n\
    <meta name="viewport" content="width=device-width, initial-scale=1">\n\
    <title>NKs Franska damskrädderi</title>\n\
    <link rel="stylesheet" href="nksfranska_style.css">\n\
    <link rel="stylesheet" href="https://unpkg.com/swiper@7/swiper-bundle.min.css">\n\
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

  indexHtml += '<div><h2>' + item.archive_code + '</h2><p>Inlämnad av <b>' + item.contributor.display_name + '</b>';

  if (item.contributor.hasOwnProperty('place')) {
    indexHtml += ', ' + item.contributor.place;
  }

  if (item.contributor.hasOwnProperty('birth_year')) {
    indexHtml += ', född ' + item.contributor.birth_year;
  }

  indexHtml += '</p><p>';
  
  if (item.hasOwnProperty('media')) {
    var imageCount = 0;
    var imageHtml = '';
    item.media.forEach(function(mediaItem){
      if(mediaItem.mime_type == 'image/jpeg') {
        let mediaUrl = new URL('https://dms01.dimu.org/image/' + mediaItem.dms_id);
        imageCount++;
        imageHtml += '<div class="swiper-slide"><img src="' + mediaUrl + '" /><p>Foto: ' + mediaItem.owner + ', ' + mediaItem.license + '</p></div>';
      }
    });

    responsesWithImages++;
    if (imageCount > 0) {
      indexHtml += '<div class="swiper">\n\
      <div class="swiper-wrapper">\n\
      ' + imageHtml + '</div>\n\
        <div class="swiper-pagination"></div>\n\
        <div class="swiper-button-prev"></div>\n\
        <div class="swiper-button-next"></div>\n\
      </div>';
    }

    if (item.hasOwnProperty('values')) {
      indexHtml += '</p><p>';
    }
  }
  if (item.hasOwnProperty('values')) {
    var answer = item['values'][0]['display_value'];
    answer = answer.replace(/(?:\r\n|\r|\n)/g, '<br/>');
    indexHtml += answer;
  }

  if (item.hasOwnProperty('latitude')) {
    responsesWithCoordinates++;
  }
  indexHtml += '</p></div>\n';

});


stats["Responses"] = array.length
stats["responsesWithCoordinates"] = responsesWithCoordinates;
stats["responsesWithImages"] = responsesWithImages;

// Step 3. Write a new JSON file with our filtered data
const newFilename = 'nksfranska/nksfranska_postprocessed.json';

indexHtml += '</div>\n\
<script src="https://unpkg.com/swiper@7/swiper-bundle.min.js"></script>\n\
    <script>\n\
      const swiper = new Swiper(".swiper", {\n\
        loop: true,\n\
        pagination: {\n\
          el: "swiper-pagination",\n\
        },\n\
        navigation: {\n\
          nextEl: ".swiper-button-next",\n\
          prevEl: ".swiper-button-prev",\n\
        }\n\
      });\n\
    </script>\n\
</html>';

await Deno.writeTextFile(newFilename, JSON.stringify(sortedArray, null, 2));
await Deno.writeTextFile('nksfranska/nksfranska_stats.json', JSON.stringify(stats, null, 2));
await Deno.writeTextFile('nksfranska/index.html', indexHtml);
console.log("Wrote a post process file");

removeFile(filename);
