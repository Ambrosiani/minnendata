// This can be a typescript file as well

// Helper library written for useful postprocessing tasks with Flat Data
// Has helper functions for manipulating csv, json, excel, zip, and image files
import { readJSON, readJSONFromURL } from 'https://deno.land/x/flat@0.0.10/src/json.ts'
import { removeFile } from 'https://deno.land/x/flat@0.0.10/src/remove.ts'

function GetSortOrder(property){
   return function(a,b){
      if( a[property] > b[property]){
          return 1;
      }else if( a[property] < b[property] ){
          return -1;
      }
      return 0;
   }
}




// set file names

const resultsFile = 'corona.json';
const statsFile = 'corona/corona_stats.json';
const storedRecordsFile = 'corona/corona_postprocessed.json';
// const geoJsonFile = 'corona/corona_geojson.json';

var json = await readJSON(resultsFile);
removeFile(resultsFile);

var stats = await readJSON(statsFile);
var storedRecords = await readJSON(storedRecordsFile);
// var geoJson = await readJSON(geoJsonFile);
var geoJson = { "type": "FeatureCollection", "features": [] };

var statsCount = stats["responses"];
const totalCount = json["total_count"];
var baseUrl = 'https://api.minnen.se/api/responses/?topic=f5c88a3d-0acf-4cac-bf3f-91cfb098ee12&order=created&limit=10';

var count = statsCount;
var offset = statsCount;
var newRecords = [];
while (count < totalCount) {
  var url = baseUrl + '&offset=' + offset;
  const additionalRecords = await readJSONFromURL(url);
  for (var i = 0; i < additionalRecords["items"].length; i++) {
    newRecords.push(additionalRecords["items"][i]);
  }
  count = count + additionalRecords["items"].length;
  offset = offset + 10;
}

var totalRecords = storedRecords.concat(newRecords);

//var responsesWithImages = stats["responsesWithImages"];
//var responsesWithCoordinates = stats["responsesWithCoordinates"];

var responsesWithImages = 0;
var responsesWithCoordinates = 0;

var indexHtml = '<!DOCTYPE html>\n\
<html lang="sv">\n\
<head>\n\
    <meta charset="utf-8">\n\
    <meta name="viewport" content="width=device-width, initial-scale=1">\n\
    <title>Coronaminnen</title>\n\
    <link rel="stylesheet" href="corona_style.css">\n\
    <link rel="stylesheet" href="https://unpkg.com/swiper@7/swiper-bundle.min.css">\n\
</head>\n\
<body>\n\
<a id="top"></a>\n\
<div class="ingress">\n\
<h1>Coronaminnen</h1>\n\
<p>Introtext.</p>\n\
<div class="delta"><p>F??r att sj??lv delta, bes??k <b>Minnen.se/tema/corona</b> genom att skanna QR-koden med din telefon.</p><img class="qr" src="images/Minnen_NKs_Franska.png" /></div></div>\n\
<p class="navbar"><a href="#top">G?? till b??rjan av sidan</a></p>\n\
<div class="grid">';


totalRecords.forEach(function(item){
  const values = item.values;
  let createdDate = new Date(item.created);
  let swedishDate = new Intl.DateTimeFormat('sv-SE', {year: 'numeric', month: 'long', day: 'numeric'}).format(createdDate);

  if ('position' in item) {
    responsesWithCoordinates++;
    var ingressArray = [];
    var ageArray = [];
    if ('values' in item) {
      ingressArray = values.filter(value => value.topic_item.label == "Hur har din vardag p??verkats av coronaviruset?");
      ageArray = values.filter(value => value.topic_item.label == "Vilket ??r ??r du f??dd?");
    }
    if(ingressArray.length == 0) {
      ingressArray = [{"display_value":""}];
    }
    if(ageArray.length == 0) {
      ageArray = [{"display_value":"0"}];
    }
    if(parseInt(createdDate.getFullYear(), 10) - parseInt(ageArray[0].display_value, 10) > 15) {
      const ingress = ingressArray[0].display_value.substring(0,100) + "???";
      var geoJsonFeature = { "type":"Feature", "properties":{ "ingress": ingress, "date":swedishDate, "author":item.contributor.display_name, "url":item.presentation_url }, "geometry": { "type":"Point", "coordinates": [ parseFloat(item.position.longitude.toFixed(3)), parseFloat(item.position.latitude.toFixed(3)) ] } };
      geoJson.features.push(geoJsonFeature);
    }
  }
  

  delete item.comment_count;
  delete item.hits;
  delete item.imported;
  delete item.likes;
  delete item.open_for_student_edit;
  delete item.ready_for_approval;
  delete item.user_id;

  indexHtml += '<div><h2>Ber??ttat av ' + item.contributor.display_name + '</h2>';

  indexHtml += '<p>';
  
  if ('media' in item) {
    var imageCount = 0;
    var imageHtml = '';
    var audioHtml = '';
    var videoHtml = '';
    item.media = item.media.sort( GetSortOrder("order_by_number"));
    item.media.forEach(function(mediaItem){
      if(mediaItem.owner === undefined) {
        mediaItem.owner = 'Ok??nd';
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

    if ('values' in item) {
      indexHtml += '</p><p>';
    }
  }

  if ('values' in item) {
    var answer = item['values'][0]['display_value'];
    answer = answer.replace(/(?:\r\n|\r|\n)/g, '<br/>');
    indexHtml += answer;
  }

  indexHtml += '</p><p class="details">Arkivkod <b>' + item.archive_code + '</b>. Inl??mnad av <b>' + item.contributor.display_name;

  if ('place' in item.contributor) {
    indexHtml += ', ' + item.contributor.place;
  }

  if ('birth_year' in item.contributor) {
    indexHtml += ', f??dd ' + item.contributor.birth_year;
  }

  indexHtml += '</b> den ' + swedishDate + '.</p></div>\n';

});


stats["responses"] = totalRecords.length;
stats["responsesWithCoordinates"] = responsesWithCoordinates;
stats["responsesWithImages"] = responsesWithImages;

// Step 3. Write a new JSON file with our filtered data
const newFilename = 'corona/corona_postprocessed.json';

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

await Deno.writeTextFile(newFilename, JSON.stringify(totalRecords, null, 2));
await Deno.writeTextFile('corona/corona_stats.json', JSON.stringify(stats, null, 2));
// await Deno.writeTextFile('corona/newRecords.json', JSON.stringify(newRecords, null, 2));
// await Deno.writeTextFile('corona/index.html', indexHtml);
await Deno.writeTextFile('corona/corona_geojson.json', JSON.stringify(geoJson, null, 2));
await Deno.writeTextFile('corona/build/corona_geojson.json', JSON.stringify(geoJson, null, 2));
console.log("Wrote a post process file");


