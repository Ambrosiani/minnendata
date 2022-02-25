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



var json = await readJSON('mittliv.json');
removeFile('mittliv.json');

var schools = await readJSON('mittliv/participating_schools.json');
var topics = await readJSON('mittliv/topics.json');
var schools_without_uuid = [];

for (const topic of topics) {

  const statsFile = 'mittliv/' + topic.slug + '_stats.json';
  const storedRecordsFile = 'mittliv/' + topic.slug + '_postprocessed.json';
  const totalCountUrl = 'https://api.minnen.se/api/responses/?topic=' + topic.uuid + '&order=created&limit=0';
  const baseUrl = 'https://api.minnen.se/api/responses/?topic=' + topic.uuid + '&order=created&limit=10';

  var numberOfCoordinates = 0;

  if (topic.make_coordinates_fuzzy) {
    numberOfCoordinates = 3;
  }
  else {
    numberOfCoordinates = 6;
  }

  var stats = await readJSON(statsFile);
  var storedRecords = await readJSON(storedRecordsFile);

  var statsCount = stats["responses"];

  var totalCountObject = await readJSONFromURL(totalCountUrl);
  const totalCount = totalCountObject["total_count"];

  var geoJson = { "type": "FeatureCollection", "features": [] };

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

  var responsesWithImages = 0;
  var responsesWithCoordinates = 0;

  for (const item of totalRecords) {
    const values = item.values;
    let createdDate = new Date(item.created);
    let swedishDate = new Intl.DateTimeFormat('sv-SE', {year: 'numeric', month: 'long', day: 'numeric'}).format(createdDate);

    if ('school_uuid' in item) {
      // save school in separate list
      if (item.school_uuid in schools) {
        item.position = {"latitude":schools[item.school_uuid].latitude, "longitude":schools[item.school_uuid].longitude}

        responsesWithCoordinates++;
        var ingressArray = [];
        var ageArray = [];
        if ('values' in item) {
          ingressArray = values.filter(value => value.topic_item.label == topic.ingress);
          ageArray = values.filter(value => value.topic_item.label == topic.age);
        }
        if(ingressArray.length == 0) {
          ingressArray = [{"display_value":""}];
        }
        if(ageArray.length == 0) {
          ageArray = [{"display_value":"0"}];
        }
        const ingress = ingressArray[0].display_value.substring(0,100) + "…";
        var geoJsonFeature = { "type":"Feature", "properties":{ "ingress": ingress, "date":swedishDate, "author":item.contributor.display_name, "url":item.presentation_url }, "geometry": { "type":"Point", "coordinates": [ parseFloat(item.position.longitude.toFixed(numberOfCoordinates)), parseFloat(item.position.latitude.toFixed(numberOfCoordinates)) ] } };
        geoJson.features.push(geoJsonFeature);
      }
      else {
        schools_without_uuid.push(item.school_uuid);
      }
    }
    // fetch regular coordinates if no school
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
  }

  stats["responses"] = totalRecords.length;
  stats["responsesWithCoordinates"] = responsesWithCoordinates;
  stats["responsesWithImages"] = responsesWithImages;

  const newFilename = 'mittliv/' + topic.slug + '_postprocessed.json';

  await Deno.writeTextFile(newFilename, JSON.stringify(totalRecords, null, 2));
  await Deno.writeTextFile(statsFile, JSON.stringify(stats, null, 2));
  await Deno.writeTextFile('mittliv/' + topic.slug + '_geojson.json', JSON.stringify(geoJson, null, 2));
  await Deno.writeTextFile('mittliv/build/' + topic.slug + '_geojson.json', JSON.stringify(geoJson, null, 2));
  await Deno.writeTextFile('mittliv/schools_without_uuid.json', JSON.stringify(schools_without_uuid, null, 2));

  console.log("Wrote a post process file for " + topic.title);

}
