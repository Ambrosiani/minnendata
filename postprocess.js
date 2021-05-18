// This can be a typescript file as well

// Helper library written for useful postprocessing tasks with Flat Data
// Has helper functions for manipulating csv, json, excel, zip, and image files
import { readJSON, writeJSON } from 'https://deno.land/x/flat@0.0.9/mod.ts' 

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
const filename = Deno.args[0] // Same name as downloaded_filename `const filename = 'btc-price.json';`
const json = await readJSON(filename)
console.log(json)

const array = json["responses"];

sortedArray = array.sort( GetSortOrder("id"));

// Step 3. Write a new JSON file with our filtered data
const newFilename = `eftervaccinet-postprocessed.json` // name of a new file to be saved
await writeJSON(newFilename, sortedArray) // create a new JSON file with just the Bitcoin price
console.log("Wrote a post process file")
