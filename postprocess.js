// This can be a typescript file as well

// Helper library written for useful postprocessing tasks with Flat Data
// Has helper functions for manipulating csv, json, excel, zip, and image files
import { readJSON, removeFile } from 'https://deno.land/x/flat@0.0.9/mod.ts' 

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

sortedArray.forEach(function(response){
  if (response.hasOwnProperty('dms_url')) {
      let url = new URL(response.dms_url);
      let newURL = 'https://dms01.dimu.org'+url.pathname;
    response['dms_url'] = newURL;
  }
});

// Step 3. Write a new JSON file with our filtered data
const newFilename = `eftervaccinet-postprocessed.json` // name of a new file to be saved

await Deno.writeTextFile(newFilename, JSON.stringify(sortedArray, null, 2))
console.log("Wrote a post process file")

removeFile(filename)
