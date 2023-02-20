/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var table1 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/riceNonRicePoints_Filo"),
    table2 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Paro_gte4_Con80_Sample"),
    ic2020 = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Model_Output_Temp_IC_2020"),
    imageVisParam = {"opacity":0.01,"gamma":0.1};
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
////
////  ROI
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var ROI = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na','Bhutan'));
// Map.addLayer(ROI, {}, 'ROI');
// Map.centerObject(ROI, 9);



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
// var s1Descending =  ee.ImageCollection('COPERNICUS/S1_GRD')
//             .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
//             .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
//             .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
//             .filter(ee.Filter.eq('instrumentMode', 'IW'));

// var s1Ascending = ee.ImageCollection('COPERNICUS/S1_GRD')
//             .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
//             .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
//             .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
//             .filter(ee.Filter.eq('instrumentMode', 'IW'));


// var monthsListL72018Oct = [5, 6, 7, 8, 9];
// var monthsList = [5, 6, 7, 8, 9, 10];
var monthsList = [8, 9, 10];
// var monthsList = [5, 6];
var yearsList = [2021];

// export path
var exportPath = 'projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_' + yearsList[0];

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
    var startDate = ee.Date.fromYMD(yearsList[0], monthsList[i], 1);
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

l8FinalCollection = l8FinalCollection.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'QA_PIXEL']);

l8FinalCollection = l8FinalCollection.map(function (img) {
  return img.rename(['blue', 'green', 'red', 'nir', 'swir1', 'QA_PIXEL']);
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Landsat 7 Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 

var col = LS7.filterBounds(ROI).filter(
  ee.Filter.date(ee.Date.fromYMD(2018, 5, 1), ee.Date.fromYMD(2018, 5, 30))
);
print('col', col);

var l7FinalCollection = ee.ImageCollection(
  baseModule.utils.timePeriodSelector(LS7, monthsList, yearsList, ROI)
  // baseModule.utils.timePeriodSelector(LS7, monthsList, yearsList, ROI)
).sort('system:time_start');

l7FinalCollection = l7FinalCollection.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'QA_PIXEL']);

l7FinalCollection = l7FinalCollection.map(function (img) {
  return img.rename(['blue', 'green', 'red', 'nir', 'swir1', 'QA_PIXEL']);
});



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Landsat 7 and 8 Merge Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

print('l7FinalCollection', l7FinalCollection);
print('l8FinalCollection', l8FinalCollection);

var _landsatCollection = baseModule.routine.getL7L8ReducedImage(listofDates, l8FinalCollection, l7FinalCollection);
var landsatCollection = ee.ImageCollection(_landsatCollection);

var landsatImage = landsatCollection.median();
print('landsatImage', landsatImage);
var landsatIndices = baseModule.indices.calculateL7L8Indices(landsatImage).float();
landsatImage = landsatImage.select(['red', 'green', 'blue', 'nir', 'swir1']).float();

print('landsatImage', landsatImage);
print('landsatIndices', landsatIndices);
Map.addLayer(landsatImage.clip(ROI), {bands:['swir1', 'nir', 'red'], min:0.04, max:0.4}, 'landsatCollectionMedian');
Map.addLayer(landsatIndices.clip(ROI), {min:0.04, max:0.4}, 'landsatIndices');

baseModule.utils.exportImageAsset(landsatImage, 'LandsatComposite', ROI, 30, exportPath + '/LandsatComposite');
baseModule.utils.exportImageAsset(landsatIndices, 'LandsatCompositeIndices', ROI, 30, exportPath + '/LandsatIndices');


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
print('s2FinalCollection', s2FinalCollection);

s2FinalCollection = baseModule.routine.maskS2Collection(s2FinalCollection);
print('s2FinalCollection', s2FinalCollection);

var s2FinalImage = s2FinalCollection.median();
var s2Indices = baseModule.indices.calculateS2Indices(s2FinalImage).float();
s2FinalImage = s2FinalImage.select(['B4', 'B3', 'B2', 'B8', 'B11'], ['red', 'green', 'blue', 'nir', 'swir1']).float();

print('s2FinalImage', s2FinalImage);
print('s2Indices', s2Indices);
Map.addLayer(s2FinalImage.clip(ROI), {bands:['swir1', 'nir', 'red'], min:0.01, max:0.4}, 's2CollectionMedian');
Map.addLayer(s2Indices.clip(ROI), {}, 's2Indices');

baseModule.utils.exportImageAsset(s2FinalImage, 'S2Composite', ROI, 30, exportPath + '/S2Composite');
baseModule.utils.exportImageAsset(s2Indices, 'S2CompositeIndices', ROI, 30, exportPath + '/S2Indices');



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

print('l8ToaFinalCollection', l8ToaFinalCollection);

var l8ToaTcIndices = baseModule.indices.calculateL8ToaTasseledCapIndices(l8ToaFinalCollection).float();

print('l8ToaTcIndices', l8ToaTcIndices);

Map.addLayer(l8ToaTcIndices.clip(ROI), {}, 'l8ToaTcIndices');

baseModule.utils.exportImageAsset(l8ToaTcIndices, 'l8ToaTcIndices', ROI, 30, exportPath + '/landsatTasseledCapIndices');


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

var s1DescendingFinal = ee.ImageCollection('projects/servir-sco-assets/assets/Bhutan/Sentinel1Descending2018');
s1DescendingFinal = s1DescendingFinal.filterDate(yearsList[0] + '-05-01', yearsList[0] + '-11-01');

s1DescendingFinal = baseModule.indices.calculateS1Indices(s1DescendingFinal).float();

print('s1DescendingFinal', s1DescendingFinal);

Map.addLayer(s1DescendingFinal.clip(ROI), {}, 's1DescendingFinal');

baseModule.utils.exportImageAsset(s1DescendingFinal, 's1DescendingFinal', ROI, 30, exportPath + '/s1Descending');



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////  Ascend Dancing
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var s1AscendingFinal = ee.ImageCollection('projects/servir-sco-assets/assets/Bhutan/Sentinel1Ascending2018');
s1AscendingFinal = s1AscendingFinal.filterDate(yearsList[0] + '-05-01', yearsList[0] + '-11-01');

s1AscendingFinal = baseModule.indices.calculateS1Indices(s1AscendingFinal).float();

print('s1AscendingFinal', s1AscendingFinal);

Map.addLayer(s1AscendingFinal.clip(ROI), {}, 's1AscendingFinal');

baseModule.utils.exportImageAsset(s1AscendingFinal, 's1AscendingFinal', ROI, 30, exportPath + '/s1Ascending');



// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////  Sentinel 1 ascending and descending merge Dancing
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// var s1FinalImage = s1DescendingFinalImage.addBands(s1AscendingFinalImage);



// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////
// //// Rice Mapping Dancing
// ////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// /*
// Here's the test from the including both terrain correction and filtering with both   pass

// both ascending and descending
// a. both terrain correction and lee filtering --> User memory limit exceeded.
// b. only terrain correction --> does not work (few training points)
// c. only refined lee --> User memory limit exceeded.

// descending only
// a. both terrain correction and lee filtering --> User memory limit exceeded.
// b. only terrain correction --> works fine
// c. only refined lee --> User memory limit exceeded.

// ascending only
// a. both terrain correction and lee filtering --> Classifier training failed: 'Invalid minimum size of leaf nodes: 1' (masking issue).
// b. only terrain correction --> Classifier training failed: 'Invalid minimum size of leaf nodes: 1' (masking issue).
// c. only refined lee --> Classifier training failed: 'Only one class.'.(masking issue).
// */

// var finalImagery = landsatIndicesImage.addBands([s2IndicesImage, l8ToaTcIndicesImage, s1DescendingFinalImage]);
// finalImagery = finalImagery.float();
// var bands = finalImagery.bandNames();

// print('finalImagery', finalImagery);
// print('training bands', bands);


// Map.addLayer(finalImagery.clip(ROI), {}, 'finalImagery');


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////  Data points Dancing
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Map.addLayer(table1, {color: 'red'}, 'rice points table');
// Map.addLayer(table2, {color: 'blue'}, 'rice points table2');

// var table = table1.merge(table2);


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////  Sampling Dancing
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// var label = 'presence';
// var training_sample = finalImagery.select(bands).sampleRegions({
//   collection: table,
//   properties: [label],
//   scale: 30,
//   // geometries: true,
// }).randomColumn({seed: 7});
// print('training_sample length', training_sample);


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////  RF Model Dancing
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// var rfClassifier = baseModule.model.randomForest(training_sample, bands, finalImagery, label);
// var classifiedImage = finalImagery.select(bands).classify(rfClassifier);
// var Random_Forest_Output_rice = classifiedImage.eq(1);
// var Random_Forest_Output_rice_only = Random_Forest_Output_rice.updateMask(classifiedImage);
// Map.addLayer(Random_Forest_Output_rice_only.clip(ROI),{min: 0, max: 1, palette: palette1}, 'rf rice layer');



// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////
// ////  Export
// ////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// // var asset_dir = 'projects/servir-sco-assets/assets/Bhutan/baseModule/Model_Output_Temp_IC'
// // //var asset_dir = 'projects/servir-sco-assets/assets/Bhutan/baseModule'
// // var asset_name_extent = 'RF_Output_Temp';
// // // export to assetpr
// // var asset_name = asset_name_extent +"_" + month_date+ "_" + year_date
// // var asset_id = asset_dir + '/' + asset_name;

// // Export.image.toAsset({image: Random_Forest_Output_rice_only.copyProperties(s1_of_intrest.first(), ['system:time_start']), 
// //                       description: asset_name, 
// //                       assetId: asset_id, 
// //                       region: ROI, 
// //                       scale:10, 
// //                       maxPixels:1e9,
// //                       })
