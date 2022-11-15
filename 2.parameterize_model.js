/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var table1 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/riceNonRicePoints_Filo"),
    table2 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Paro_gte4_Con80_Sample"),
    ic2020 = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Model_Output_Temp_IC_2020"),
    lte2 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte2_Sample"),
    lte3 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte3_Sample"),
    lte4 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte4_Sample"),
    lte5 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte5_Sample"),
    lte6 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte6_Sample"),
    lte7 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte7_Sample"),
    old_points = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/5_Dist_RP_gte4_Combined");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var year = 2020;

var table = lte2;
var label = 'presence_lte2';

table = table.map(function (point) {
  var geometry = ee.Geometry.Point([ee.Number(point.get('lon')), ee.Number(point.get('lat'))]);
  return point.setGeometry(geometry);
});

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

// var l1 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/BT_Admin_1");
// var samtse = l1.filter(ee.Filter.eq('ADM1_EN', 'Samtse'));
// var punakha = l1.filter(ee.Filter.eq('ADM1_EN', 'Punakha'));


Map.centerObject(ROI, 9);


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////
// //// Rice Mapping Dancing
// ////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var landsatIndicesImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_' + year + '/LandsatIndices');
var s2IndicesImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_' + year + '/S2Indices');
var l8TocIndicesImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_' + year + '/landsatTasseledCapIndices');
var s1AscendingImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_' + year + '/s1Ascending');
s1AscendingImage = s1AscendingImage.select(['VV', 'VH', 'ratio', 'ndratio'], ['vv_asc', 'vh_asc', 'ratio_asc', 'ndratio_asc']);
var s1DescendingImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_' + year + '/s1Descending');
s1DescendingImage = s1DescendingImage.select(['VV', 'VH', 'ratio', 'ndratio'], ['vv_desc', 'vh_desc', 'ratio_desc', 'ndratio_desc']);

var srtm = ee.Image("USGS/SRTMGL1_003");
var topo = ee.Algorithms.Terrain(srtm);
var slope = topo.select('slope').clip(ROI);
var elevation = srtm.clip(ROI);


var finalImagery = landsatIndicesImage.addBands([s2IndicesImage, l8TocIndicesImage, s1AscendingImage, s1DescendingImage, elevation, slope]);
finalImagery = finalImagery.float().clip(ROI);
var bands = finalImagery.bandNames();

print('finalImagery', finalImagery);
print('training bands', bands);


Map.addLayer(finalImagery.clip(ROI), {}, 'finalImagery', false);


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////  Data points Dancing
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

table = table.filterBounds(ROI);
print('Total Samples', table.size());

print('Rice Samples', table.filter(ee.Filter.eq(label, 1)).size());
print('Non-rice samples', table.filter(ee.Filter.eq(label, 0)).size());
print('Rice: Non-rice ratio', table.filter(ee.Filter.eq(label, 1)).size().divide(table.filter(ee.Filter.eq(label, 0)).size()));

Map.addLayer(table.filter(ee.Filter.eq(label, 0)), {color: 'red'}, 'rice 0', false);
Map.addLayer(table.filter(ee.Filter.eq(label, 1)), {color: 'green'}, 'rice 1', false);

// Generate the histogram data.
var histogram = ui.Chart.feature.histogram({
  features: table,
  property: label,
  maxBuckets: 2,
});
histogram.setOptions({
  title: 'Histogram of Labels (LTE 2)'
});

print(histogram);

// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////  Sampling Dancing
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var training_sample = finalImagery.select(bands).sampleRegions({
  collection: table,
  properties: [label],
  scale: 30,
  // geometries: true,
}).randomColumn({seed: 7});
print('training_sample length', training_sample.size());

// Export.table.toDrive(training_sample, 'training_sample');


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////  RF Model Dancing
// ///////////////////////s/////////////////////////////////////////////////////////////////////////////////////////////

var rfClassifiers = baseModule.model_tuner.randomForest(training_sample, bands, finalImagery, label);
rfClassifiers = ee.FeatureCollection(rfClassifiers.flatten());

Export.table.toDrive({
  collection: rfClassifiers,
  description: 'rf_models_lte2_' + year,
  folder: 'earthengine',
  fileNamePrefix: 'rf_models_lte2_' + year,
  fileFormat: 'CSV'
});


// // SIngle RF runs
// var classifier = baseModule.model.randomForest(training_sample, bands, finalImagery, label);
// print(classifier.explain())
// print(classifier.explain().get('importance'));

// var classifiedImage = finalImagery.select(bands).classify(classifier);
// var ricePrediction = classifiedImage.eq(1);
// var ricePredictionOnly = ricePrediction.updateMask(classifiedImage);
// Map.addLayer(ricePrediction.clip(ROI), {palette:["fee6ce","fdae6b","e6550d"], min:0, max:1}, 'rf rice layer');


// Export.image.toDrive({
//   image: ricePrediction,
//   description: 'rice_predictions_2019',
//   folder: 'earthengine',
//   fileNamePrefix: 'rice_predictions_2019',
//   region: ROI,
//   scale: 30,
//   maxPixels: 1E13,
// });


// Export.image.toAsset({
//   image: ricePrediction,
//   description: 'prediction_2019',
//   assetId: 'projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Prediction_4_Paper/prediction_2019',
//   region: ROI,
//   scale: 30,
//   maxPixels: 1E13,
// });


// Export.table.toDrive({
//   collection: table.filter(ee.Filter.eq(label, 1)),
//   description: 'rice_lte2',
//   folder: 'Bhutan_Rice_Mapping',
//   fileNamePrefix: 'rice_lte2',
//   fileFormat: 'SHP'
// });

// Export.table.toDrive({
//   collection: table.filter(ee.Filter.eq(label, 0)),
//   description: 'non_rice_lte2',
//   folder: 'Bhutan_Rice_Mapping',
//   fileNamePrefix: 'non_rice_lte2',
//   fileFormat: 'SHP'
// });