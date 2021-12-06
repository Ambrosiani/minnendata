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
const filename = 'nksfranska.json' // Same name as downloaded_filename
var json = await readJSON(filename);

removeFile(filename);

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

var sortedArray = array.sort( GetSortOrder("hits")).reverse();

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
<a id="top"></a>\n\
<div class="ingress">\n\
<h1>NK:s Franska damskrädderi – bidra med dina minnen</h1>\n\
<p>Tillhör du de som hade förmånen att besöka eller arbeta vid damskrädderiet? Har du hört andra berätta om exklusiva modevisningar och oförglömliga klänningar? Finns det fortfarande kvar någon unik skapelse från skrädderiet i din garderob?</p>\n\
<p>Varmt välkommen att bidra till Nordiska museets insamling med dina bilder och berättelser! Dina minnen blir en del av historien om NK:s Franska damskrädderi som sparas för framtida generationer.</p>\n\
<p>Här nedanför kan du ta del av de inlämnade bidragen.</p>\n\
<div class="delta"><p>För att själv delta, besök <b>Minnen.se/tema/nksfranska</b> genom att skanna QR-koden med din telefon.</p><img class="qr" src="images/Minnen_NKs_Franska.png" /></div></div>\n\
<p class="navbar"><a href="#top">Gå till början av sidan</a></p>\n\
<div class="grid">';


sortedArray.forEach(function(item){
  delete item.comment_count;
  delete item.hits;
  delete item.imported;
  delete item.likes;
  delete item.open_for_student_edit;
  delete item.ready_for_approval;
  delete item.user_id;

  indexHtml += '<div><h2>' + item.contributor.display_name + '</h2>';

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
    var audioHtml = '';
    var videoHtml = '';
    item.media = item.media.sort( GetSortOrder("order_by_number"));
    item.media.forEach(function(mediaItem){
      if(mediaItem.owner === undefined) {
        mediaItem.owner = 'Okänd';
      }
      if(mediaItem.mime_type == 'image/jpeg' || mediaItem.mime_type == 'image/png') {
        let mediaUrl = new URL('https://dms01.dimu.org/image/' + mediaItem.dms_id);
        imageCount++;
        imageHtml += '<div class="swiper-slide"><img src="' + mediaUrl + '" /><p>Foto: ' + mediaItem.owner + ', ' + mediaItem.license + '</p></div>';
      }
      if(mediaItem.mime_type == 'audio/mpeg') {
        let mediaUrl = new URL('https://dms01.dimu.org/multimedia/' + mediaItem.dms_id + '.mp3?mmid=' + mediaItem.dms_id + '&amp;a=None');
        audioHtml += '<p class="audio"><audio controls preload><source type="audio/mpeg" src="' + mediaUrl + '"></audio></p><p class="caption">Inspelning: ' + mediaItem.owner + ', ' + mediaItem.license + '</p>';
      }
      if(mediaItem.mime_type == 'video/mp4') {
        videoHtml += '<p class="video"><video controls preload poster="https://dms01.dimu.org/image/' + mediaItem.dms_id + '">\n\
          <source type="application/x-mpegURL" src="https://qdms.dimu.org/' + mediaItem.dms_id + '/index.m3u8?mmid=' + mediaItem.dms_id + '">\n\
          <source type="video/mp4" src="https://dms01.dimu.org/multimedia/' + mediaItem.dms_id + '.mp4?mmid=' + mediaItem.dms_id + '">\n\
          <source type="video/ogg" src="https://dms01.dimu.org/multimedia/' + mediaItem.dms_id + '.ogv?mmid=' + mediaItem.dms_id + '">\n\
          <source type="video/webm" src="https://dms01.dimu.org/multimedia/' + mediaItem.dms_id + '.webm?mmid=' + mediaItem.dms_id + '">\n\
        </video></p><p class="caption">Inspelning: '+ mediaItem.owner + ', ' + mediaItem.license + '</p>';
      }
    });

    if (imageCount > 0) {
      responsesWithImages++;
      indexHtml += '<div class="swiper">\n\
      <div class="swiper-wrapper">\n\
      ' + imageHtml + '</div>\n\
        <div class="swiper-pagination"></div>';
      if (imageCount > 1) {
        indexHtml += '<div class="swiper-button-prev"></div>\n\
        <div class="swiper-button-next"></div>';
      }
      indexHtml += '</div>';
    }

    indexHtml += videoHtml;

    indexHtml += audioHtml;

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
  let createdDate = new Date(item.created);
  let swedishDate = new Intl.DateTimeFormat('sv-SE', {year: 'numeric', month: 'long', day: 'numeric'}).format(createdDate);
  indexHtml += '</p><p class="details">Arkivkod <b>' + item.archive_code + '</b>. Inlämnad av <b>' + item.contributor.display_name + '</b> den ' + swedishDate + '.</p></div>\n';

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
          el: ".swiper-pagination",\n\
          type: "bullets"\n\
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


