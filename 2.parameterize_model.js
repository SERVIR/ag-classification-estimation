var lte2 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte2_Sample"),
    lte3 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte3_Sample"),
    lte4 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte4_Sample"),
    lte5 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte5_Sample"),
    lte6 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte6_Sample"),
    lte7 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte7_Sample");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  INPUT NEEDED BLOCK
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


var year = 2020;

// which table to use?
var table = lte2;
// what's the name of the label in that table?
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

var baseModule = require('users/biplov/bhutan-aces-v-1:main.js');



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  ROI
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var ROI = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na','Bhutan'));


Map.centerObject(ROI, 9);


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////
////// Prep final composite from list of composites
//////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var landsatIndicesImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_' + year + '/LandsatIndices');
var s2IndicesImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_' + year + '/S2Indices');
var l8TocIndicesImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_' + year + '/landsatTasseledCapIndices');
var s1AscendingImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_' + year + '/s1Ascending');
s1AscendingImage = s1AscendingImage.select(['VV', 'VH', 'ratio', 'ndratio'], ['vv_asc', 'vh_asc', 'ratio_asc', 'ndratio_asc']);
var s1DescendingImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_' + year + '/s1Descending');
s1DescendingImage = s1DescendingImage.select(['VV', 'VH', 'ratio', 'ndratio'], ['vv_desc', 'vh_desc', 'ratio_desc', 'ndratio_desc']);

// topographic variables
var srtm = ee.Image('USGS/SRTMGL1_003');
var topo = ee.Algorithms.Terrain(srtm);
var slope = topo.select('slope').clip(ROI);
var elevation = srtm.clip(ROI);


var finalImagery = landsatIndicesImage.addBands([s2IndicesImage, l8TocIndicesImage, s1AscendingImage, s1DescendingImage, elevation, slope]);
finalImagery = finalImagery.float().clip(ROI);
var bands = finalImagery.bandNames();

print('finalImagery', finalImagery);
print('training bands', bands);


Map.addLayer(finalImagery.clip(ROI), {}, 'finalImagery', false);


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////  Data points Dancing
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

table = table.filterBounds(ROI);
print('Total Samples', table.size());

print('Rice Samples', table.filter(ee.Filter.eq(label, 1)).size());
print('Non-rice samples', table.filter(ee.Filter.eq(label, 0)).size());
print('Rice: Non-rice ratio', table.filter(ee.Filter.eq(label, 1)).size().divide(table.filter(ee.Filter.eq(label, 0)).size()));

Map.addLayer(table.filter(ee.Filter.eq(label, 0)), {color: 'red'}, 'Non-rice');
Map.addLayer(table.filter(ee.Filter.eq(label, 1)), {color: 'green'}, 'Rice');

// Generate the histogram data.
var histogram = ui.Chart.feature.histogram({
  features: table,
  property: label,
  maxBuckets: 2,
});
histogram.setOptions({
  title: 'Histogram of Labels' + label
});

print(histogram);


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////  Sampling
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var trainingSample = finalImagery.select(bands).sampleRegions({
  collection: table,
  properties: [label],
  scale: 30,
  // geometries: true,
}).randomColumn({seed: 7});
print('trainingSample length', trainingSample.size());


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////  Your generalized grid searched RF Models
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// let's create the parameter space
var numberOfTrees = ee.List.sequence(40, 120, 10);
var variablesPerSplit = ee.List([null, bands.size()]);
var minLeafPopulation = ee.List.sequence(1, 5, 1);
var bagFraction = ee.List.sequence(0.5, 1.0, 0.1);
var maxNodes = ee.List([null]);
// We are using null as the max nodes
// ideally you could also have them in the list as below.
// var maxNodes1 = ee.List.sequence(10, 100, 10);
// var maxNodes = maxNodes1.cat(ee.List([null]));

var nRFModels = numberOfTrees.size().multiply(variablesPerSplit.size())
                  .multiply(minLeafPopulation.size()).multiply(bagFraction.size())
                  .multiply(maxNodes.size());
print('You are training ' + nRFModels.getInfo() + ' models. Brace Yourself!');

var parameterSpace = ee.Dictionary({
  numberOfTrees: numberOfTrees,
  variablesPerSplit: variablesPerSplit,
  minLeafPopulation: minLeafPopulation,
  bagFraction: bagFraction,
  maxNodes: maxNodes,
});

var rfClassifiers = baseModule.modelTuner.randomForest(trainingSample, bands, finalImagery, label, parameterSpace);
rfClassifiers = ee.FeatureCollection(rfClassifiers.flatten());

// This is exported to your google drive in the earthengine folder
Export.table.toDrive({
  collection: rfClassifiers,
  description: 'rf_models_' + label + '_' + year,
  folder: 'earthengine',
  fileNamePrefix: 'rf_models_' + label + '_' + year,
  fileFormat: 'CSV'
});

