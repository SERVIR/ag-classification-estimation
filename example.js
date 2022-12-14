/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var table1 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/riceNonRicePoints_Filo"),
    table2 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Paro_gte4_Con80_Sample"),
    imageVisParam = {"opacity":1,"bands":["classification"],"palette":["fee6ce","fdae6b","e6550d"]};
/***** End of imports. If edited, may not auto-convert in the playground. *****/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Base Script Set
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var baseModule = require('users/biplovbhandari/Rice_Mapping_Bhutan:main.js');



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////
////  Display     https://github.com/gee-community/ee-palettes
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var palettes = require('users/gena/packages:palettes');
var palette0 = palettes.misc.tol_rainbow[7];
var palette1 = palettes.colorbrewer.Oranges[3];



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  ROI
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var ROI = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na','Bhutan'));
Map.addLayer(ROI, {}, 'ROI');
Map.centerObject(ROI, 9);



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Input Imagery
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var LS8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");
var LS7 = ee.ImageCollection("LANDSAT/LE07/C02/T2_L2");
var S2 = ee.ImageCollection('COPERNICUS/S2_SR');
var LS8_TOA = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA'); // landsat toa for tesseled cap
var s1Descending =  ee.ImageCollection('COPERNICUS/S1_GRD')
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
            .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
            .filter(ee.Filter.eq('instrumentMode', 'IW'));

var s1Ascending = ee.ImageCollection('COPERNICUS/S1_GRD')
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
            .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
            .filter(ee.Filter.eq('instrumentMode', 'IW'));


var monthsList = [5, 6, 7, 8, 9];
var yearsList = [2020];

var l8FinalCollection =  ee.ImageCollection(
  baseModule.utils.timePeriodSelector(LS8, monthsList, yearsList, ROI)
).sort('system:time_start');
l8FinalCollection = l8FinalCollection.select(['SR_B.', 'QA_PIXEL']);

l8FinalCollection = l8FinalCollection.sort('system:time_start', true);
var l8FinalCollection2 = l8FinalCollection.sort('system:time_start', false);



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Extract Dates
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


var useExactDate = false;

if (useExactDate) {
  
  var firstDate = ee.Date(l8FinalCollection.first().get('system:time_start'));
  var lastDate = ee.Date(l8FinalCollection2.first().get('system:time_start'));

  var listofDates = [];

  var numDays = lastDate.difference(firstDate, 'day').int().getInfo();
  
  var diff = 0;
  var daysDiff = 15;
  while (diff <= numDays) {
    var dict = {
      'startDate': firstDate.advance(diff, 'day'),
      'endDate'  : firstDate.advance(diff + daysDiff, 'day')
    };
    listofDates.push(dict);
    diff += daysDiff;
  }
  
  listofDates = ee.List(listofDates);
} else {
  
  var listofDates = [];
  
  // year is hardcoded for now
  for (var i = 0; i<monthsList.length; i++) {
    var startDate = ee.Date.fromYMD(2020, monthsList[i], 1);
    var dict = {
      'startDate': startDate,
      'endDate'  : startDate.advance(1, 'month').advance(-1, 'day')
    };
    listofDates.push(dict);
  }
  listofDates = ee.List(listofDates);
}

print('listofDates', listofDates);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Landsat 8 Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

l8FinalCollection = l8FinalCollection.select(['SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'QA_PIXEL']);

l8FinalCollection = l8FinalCollection.map(function (img) {
  return img.rename(['green', 'red', 'nir', 'swir1', 'QA_PIXEL']);
});

var l8Indices = ee.ImageCollection(baseModule.utils.getIndices(listofDates, l8FinalCollection, 'landsat'));
var l8IndicesImage = l8Indices.toBands();
var l8IndicesNewBandNames = baseModule.utils.bulkRenameBands(l8IndicesImage.bandNames());
l8IndicesImage = l8IndicesImage.rename(l8IndicesNewBandNames);
l8IndicesImage = l8IndicesImage.clip(ROI);
l8IndicesImage = l8IndicesImage.unmask(0);



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Landsat 7 Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var l7FinalCollection = ee.ImageCollection(
  baseModule.utils.timePeriodSelector(LS7, monthsList, yearsList, ROI)
).sort('system:time_start');
l7FinalCollection = l7FinalCollection.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'QA_PIXEL']);

l7FinalCollection = l7FinalCollection.map(function (img) {
  return img.rename(['green', 'red', 'nir', 'swir1', 'QA_PIXEL']);
});



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Landsat 7 and 8 Merge Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var _landsatCollection = baseModule.routine.getL7L8ReducedImage(listofDates, l8FinalCollection, l7FinalCollection);
var landsatCollection = ee.ImageCollection(_landsatCollection);

var landsatIndices = ee.ImageCollection(baseModule.utils.getIndices(listofDates, landsatCollection, 'combinedLandsat'));
landsatIndices = landsatIndices.toBands();
var landsatIndicesNewBandNames = baseModule.utils.bulkRenameBands(landsatIndices.bandNames());
var landsatIndicesImage = landsatIndices.rename(landsatIndicesNewBandNames);
landsatIndicesImage = landsatIndicesImage.clip(ROI);
landsatIndicesImage = landsatIndicesImage.unmask(0);



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Sentinel 2 Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var s2FinalCollection =  ee.ImageCollection(
  baseModule.utils.timePeriodSelector(S2, monthsList, yearsList, ROI)
).sort('system:time_start');
var s2Indices = ee.ImageCollection(baseModule.utils.getIndices(listofDates, s2FinalCollection, 'sentinel2'));
s2Indices = s2Indices.toBands();
var s2IndicesNewBandNames = baseModule.utils.bulkRenameBands(s2Indices.bandNames(), 'sentinel2');
var s2IndicesImage = s2Indices.rename(s2IndicesNewBandNames);
s2IndicesImage = s2IndicesImage.clip(ROI);
s2IndicesImage = s2IndicesImage.unmask(0);



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Tasseled Cap Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var l8ToaFinalCollection =  ee.ImageCollection(
  baseModule.utils.timePeriodSelector(LS8_TOA, monthsList, yearsList, ROI)
).sort('system:time_start');
l8ToaFinalCollection = l8ToaFinalCollection.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'QA_PIXEL']);

l8ToaFinalCollection = l8ToaFinalCollection.map(function (img) {
  return img.rename(['blue', 'green', 'red', 'nir', 'swir1', 'swir2', 'QA_PIXEL']);
});

var l8ToaTcIndices = ee.ImageCollection(baseModule.utils.getIndices(listofDates, l8ToaFinalCollection, 'tc'));
l8ToaTcIndices = l8ToaTcIndices.toBands();
var l8ToaTcIndicesNewBandNames = baseModule.utils.bulkRenameBands(l8ToaTcIndices.bandNames());
var l8ToaTcIndicesImage = l8ToaTcIndices.rename(l8ToaTcIndicesNewBandNames);
l8ToaTcIndicesImage = l8ToaTcIndicesImage.clip(ROI);
l8ToaTcIndicesImage = l8ToaTcIndicesImage.unmask(0);



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Sentinel 1 Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////  Descend Dancing
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var s1DescendingFinal = ee.ImageCollection(
  baseModule.utils.timePeriodSelector(s1Descending, monthsList, yearsList, ROI)
).sort('system:time_start');


s1DescendingFinal = baseModule.s1_correction.terrainCorrection(s1DescendingFinal);

// export terrain corrected images
// print('s1DescendingFinal', s1DescendingFinal);
// var sizeImage = s1DescendingFinal.size().getInfo();

// var listImages = s1DescendingFinal.toList(sizeImage);
// for (var i = 0; i<sizeImage; ++i) {
//   var img = listImages.get(i);
//   Export.image.toAsset(img, 'sentinel1');
// }

// s1DescendingFinal = baseModule.s1_correction.refinedLee(s1DescendingFinal);

s1DescendingFinal = ee.ImageCollection(baseModule.utils.getIndices(listofDates, s1DescendingFinal, 'sentinel1'));

var s1DescendingFinalImage = s1DescendingFinal.toBands();
var s1DescendingFinalNewBandNames = baseModule.utils.bulkRenameBands(s1DescendingFinalImage.bandNames(), 'sentinel1', 'descend');
s1DescendingFinalImage = s1DescendingFinalImage.rename(s1DescendingFinalNewBandNames);
s1DescendingFinalImage = s1DescendingFinalImage.clip(ROI);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////  Ascend Dancing
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var s1AscendingFinal = ee.ImageCollection(
  baseModule.utils.timePeriodSelector(s1Ascending, monthsList, yearsList, ROI)
).sort('system:time_start');

s1AscendingFinal = baseModule.s1_correction.terrainCorrection(s1AscendingFinal);
// s1AscendingFinal = baseModule.s1_correction.refinedLee(s1AscendingFinal);

s1AscendingFinal = ee.ImageCollection(baseModule.utils.getIndices(listofDates, s1AscendingFinal, 'sentinel1'));

var s1AscendingFinalImage = s1AscendingFinal.toBands();
var s1AscendinggFinalNewBandNames = baseModule.utils.bulkRenameBands(s1AscendingFinalImage.bandNames(), 'sentinel1', 'ascend');
s1AscendingFinalImage = s1AscendingFinalImage.rename(s1AscendinggFinalNewBandNames);
s1AscendingFinalImage = s1AscendingFinalImage.clip(ROI);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////  Sentinel 1 ascending and descending merge Dancing
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var s1FinalImage = s1DescendingFinalImage.addBands(s1AscendingFinalImage);



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
//// Rice Mapping Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
Here's the test from the including both terrain correction and filtering with both   pass

both ascending and descending
a. both terrain correction and lee filtering --> User memory limit exceeded.
b. only terrain correction --> does not work (few training points)
c. only refined lee --> User memory limit exceeded.

descending only
a. both terrain correction and lee filtering --> User memory limit exceeded.
b. only terrain correction --> works fine
c. only refined lee --> User memory limit exceeded.

ascending only
a. both terrain correction and lee filtering --> Classifier training failed: 'Invalid minimum size of leaf nodes: 1' (masking issue).
b. only terrain correction --> Classifier training failed: 'Invalid minimum size of leaf nodes: 1' (masking issue).
c. only refined lee --> Classifier training failed: 'Only one class.'.(masking issue).
*/

var finalImagery = landsatIndicesImage.addBands([s2IndicesImage, l8ToaTcIndicesImage, s1DescendingFinalImage]);
finalImagery = finalImagery.float();
var bands = finalImagery.bandNames();

print('finalImagery', finalImagery);
print('training bands', bands);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////  Data points Dancing
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Map.addLayer(table1, {color: 'red'}, 'rice points table');
Map.addLayer(table2, {color: 'blue'}, 'rice points table2');

var table = table1.merge(table2);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////  Sampling Dancing
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var label = 'presence';
var training_sample = finalImagery.select(bands).sampleRegions({
  collection: table,
  properties: [label],
  scale: 30,
  // geometries: true,
}).randomColumn({seed: 7});
print('training_sample length', training_sample);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////  RF Model Dancing
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var rfClassifier = baseModule.model.randomForest(training_sample, bands, finalImagery, label);
var classifiedImage = finalImagery.select(bands).classify(rfClassifier);
var Random_Forest_Output_rice = classifiedImage.eq(1);
var Random_Forest_Output_rice_only = Random_Forest_Output_rice.updateMask(classifiedImage);
Map.addLayer(Random_Forest_Output_rice_only.clip(ROI),{min: 0, max: 1, palette: palette1}, 'rf rice layer');



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Export
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// var asset_dir = 'projects/servir-sco-assets/assets/Bhutan/baseModule/Model_Output_Temp_IC'
// //var asset_dir = 'projects/servir-sco-assets/assets/Bhutan/baseModule'
// var asset_name_extent = 'RF_Output_Temp';
// // export to assetpr
// var asset_name = asset_name_extent +"_" + month_date+ "_" + year_date
// var asset_id = asset_dir + '/' + asset_name;

// Export.image.toAsset({image: Random_Forest_Output_rice_only.copyProperties(s1_of_intrest.first(), ['system:time_start']), 
//                       description: asset_name, 
//                       assetId: asset_id, 
//                       region: ROI, 
//                       scale:10, 
//                       maxPixels:1e9,
//                       })