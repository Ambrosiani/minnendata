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

const resultsFile = 'mittliv.json';
const statsFile = 'mittliv/mittliv_stats.json';
const storedRecordsFile = 'mittliv/mittliv_postprocessed.json';

var json = await readJSON(resultsFile);
removeFile(resultsFile);

var stats = await readJSON(statsFile);
var storedRecords = await readJSON(storedRecordsFile);
var schools = await readJSON('mittliv/participating_schools.json');
var geoJson = { "type": "FeatureCollection", "features": [] };

var statsCount = stats["responses"];
const totalCount = json["total_count"];
var baseUrl = 'https://api.minnen.se/api/responses/?topic=46463ebb-c066-4e43-beef-b00b03bea92f&order=created&limit=10';

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

totalRecords.forEach(function(item){
  const values = item.values;
  let createdDate = new Date(item.created);
  let swedishDate = new Intl.DateTimeFormat('sv-SE', {year: 'numeric', month: 'long', day: 'numeric'}).format(createdDate);

  if ('school_uuid' in item) {
    if (item.school_uuid in schools) {
      item.position = {"latitude":schools[item.school_uuid].latitude, "longitude":schools[item.school_uuid].longitude}

      responsesWithCoordinates++;
      var ingressArray = [];
      var ageArray = [];
      if ('values' in item) {
        ingressArray = values.filter(value => value.topic_item.label == "✏️ Berätta om en dag i ditt liv");
        ageArray = values.filter(value => value.topic_item.label == "⏳ Hur gammal är du?");
      }
      if(ingressArray.length == 0) {
        ingressArray = [{"display_value":""}];
      }
      if(ageArray.length == 0) {
        ageArray = [{"display_value":"0"}];
      }
      if(parseInt(createdDate.getFullYear(), 10) - parseInt(ageArray[0].display_value, 10) > 15) {
        const ingress = ingressArray[0].display_value.substring(0,100) + "…";
        var geoJsonFeature = { "type":"Feature", "properties":{ "ingress": ingress, "date":swedishDate, "author":item.contributor.display_name, "url":item.presentation_url }, "geometry": { "type":"Point", "coordinates": [ parseFloat(item.position.longitude.toFixed(6)), parseFloat(item.position.latitude.toFixed(6)) ] } };
        geoJson.features.push(geoJsonFeature);
      }
    }
  }
  
  delete item.comment_count;
  delete item.hits;
  delete item.imported;
  delete item.likes;
  delete item.open_for_student_edit;
  delete item.ready_for_approval;
  delete item.user_id;
  
  if ('media' in item) {
    var imageCount = 0;
    item.media = item.media.sort( GetSortOrder("order_by_number"));
    item.media.forEach(function(mediaItem){
      if(mediaItem.owner === undefined) {
        mediaItem.owner = 'Okänd';
      }
      if(mediaItem.mime_type == 'image/jpeg' || mediaItem.mime_type == 'image/png') {
        imageCount++;
      }
    });
    if (imageCount > 0) {
      responsesWithImages++;
    }
  }
});

stats["responses"] = totalRecords.length;
stats["responsesWithCoordinates"] = responsesWithCoordinates;
stats["responsesWithImages"] = responsesWithImages;

// Step 3. Write a new JSON file with our filtered data
const newFilename = 'mittliv/mittliv_postprocessed.json';

await Deno.writeTextFile(newFilename, JSON.stringify(totalRecords, null, 2));
await Deno.writeTextFile('mittliv/mittliv_stats.json', JSON.stringify(stats, null, 2));
// await Deno.writeTextFile('corona/newRecords.json', JSON.stringify(newRecords, null, 2));
await Deno.writeTextFile('mittliv/mittliv_geojson.json', JSON.stringify(geoJson, null, 2));
await Deno.writeTextFile('mittliv/build/mittliv_geojson.json', JSON.stringify(geoJson, null, 2));
console.log("Wrote a post process file");


