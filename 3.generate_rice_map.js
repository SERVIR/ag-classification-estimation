/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var ic2020 = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Model_Output_Temp_IC_2020"),
    composites2020 = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2020"),
    lte2 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte2_Sample"),
    composites2019 = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2019");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var points = lte2;
var label = 'presence_lte2'; 

points = points.map(function (point) {
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
// Map.addLayer(ROI, {}, 'ROI');
// Map.centerObject(ROI, 9);

var l1 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/BT_Admin_1");
var samtse = l1.filter(ee.Filter.eq('ADM1_EN', 'Samtse'));
var punakha = l1.filter(ee.Filter.eq('ADM1_EN', 'Punakha'));

// var ROI = punakha;

Map.centerObject(ROI, 9);


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////
// //// Rice Mapping Dancing
// ////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var landsatIndicesImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2019/LandsatIndices');
var s2IndicesImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2019/S2Indices');
var l8TocIndicesImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2019/landsatTasseledCapIndices');
var s1AscendingImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2019/s1Ascending');
s1AscendingImage = s1AscendingImage.select(['VV', 'VH', 'ratio', 'ndratio'], ['vv_asc', 'vh_asc', 'ratio_asc', 'ndratio_asc']);
var s1DescendingImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2019/s1Descending');
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

var table = points; // table1.merge(table2);
table = table.filterBounds(ROI);
print('table', table.size());

print('presence', table.filter(ee.Filter.eq(label, 1)).size());
print('not presence', table.filter(ee.Filter.eq(label, 0)).size());

Map.addLayer(table.filter(ee.Filter.eq(label, 0)), {color: 'red'}, 'rice 0', false);
Map.addLayer(table.filter(ee.Filter.eq(label, 1)), {color: 'green'}, 'rice 1', false);

// Generate the histogram data.
var histogram = ui.Chart.feature.histogram({
  features: table,
  property: label,
  maxBuckets: 2,
});
histogram.setOptions({
  title: 'Histogram of LTE_2'
});

print(histogram);


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////  Sampling Dancing
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// var label = 'presence';
var training_sample = finalImagery.select(bands).sampleRegions({
  collection: table,
  properties: [label],
  scale: 30,
  // geometries: true,
}).randomColumn({seed: 7});
print('training_sample length', training_sample.size());

// Export.table.toDrive(training_sample, 'training_sample');

// SIngle RF runs
// use these from csv generated in step 2
var parameters = ee.Dictionary({
  numberOfTrees: 50,
  variablesPerSplit: null, // bandList.size(),
  minLeafPopulation: 1,
  bagFraction: 1,
  maxNodes: null,
});


var classifier = baseModule.model.randomForest(training_sample, bands, finalImagery, label, parameters);
print(classifier.explain());
print(classifier.explain().get('importance'));

var classifiedImage = finalImagery.select(bands).classify(classifier);
var ricePrediction = classifiedImage.eq(1);
var ricePredictionOnly = ricePrediction.updateMask(classifiedImage);
Map.addLayer(ricePrediction.clip(ROI), {palette:["fee6ce","fdae6b","e6550d"], min:0, max:1}, 'rf rice layer');


Export.image.toDrive({
  image: ricePrediction,
  description: 'rice_predictions_2019',
  folder: 'earthengine',
  fileNamePrefix: 'rice_predictions_2019',
  region: ROI,
  scale: 30,
  maxPixels: 1E13,
});


Export.image.toAsset({
  image: ricePrediction,
  description: 'prediction_2019',
  assetId: 'projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Prediction_4_Paper/prediction_2019',
  region: ROI,
  scale: 30,
  maxPixels: 1E13,
});


Export.table.toDrive({
  collection: table.filter(ee.Filter.eq(label, 1)),
   description: 'rice_lte2',
   folder: 'Bhutan_Rice_Mapping',
   fileNamePrefix: 'rice_lte2',
   fileFormat: 'SHP'
});

Export.table.toDrive({
  collection: table.filter(ee.Filter.eq(label, 0)),
   description: 'non_rice_lte2',
   folder: 'Bhutan_Rice_Mapping',
   fileNamePrefix: 'non_rice_lte2',
   fileFormat: 'SHP'
});