////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  INPUT NEEDED BLOCK
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



var lte2 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte2_Sample"),
    labelZero = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/CEO_Points_4_Paper/ceo-New_Val_0_2020-plot-data-2022-10-18"),
    labelOne = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/CEO_Points_4_Paper/ceo-New_Val_1_2020-plot-data-2022-10-18"),
    hansenTreeCover = ee.Image("UMD/hansen/global_forest_change_2021_v1_9"),
    connectedriceMap = ee.Image("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/ConnectedPixels/connectedRice2020");


var year = 2020;
var points = lte2;
var label = 'presence_lte2';
var property = 'label';

var zeroLabelProperty = 'Land Cover Type?:Rice';
var oneLabelProperty = 'Land Cover Type? :Rice';

labelZero = labelZero.filter(ee.Filter.neq('flagged', true));
labelOne = labelOne.filter(ee.Filter.neq('flagged', true));


points = points.map(function (point) {
  var geometry = ee.Geometry.Point([ee.Number(point.get('lon')), ee.Number(point.get('lat'))]);
  return point.setGeometry(geometry);
});

var path = 'projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_' + year;

var exportPath = 'projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Test_Remove';

// model 555 in paper
// parameters with highest f1, recall, test accuracy, and test kappa
// numberOfTrees: 120,
// variablesPerSplit: null,
// minLeafPopulation: 3,
// bagFraction: 0.8,
// maxNodes: null,

var changeTheseParameters = ee.Dictionary({
  numberOfTrees: 230,
  variablesPerSplit: 6,
  minLeafPopulation: 5,
  bagFraction: 0.3,
  maxNodes: 8,
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


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////
// //// Rice Mapping Prep
// ////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var landsatIndicesImage = ee.Image(path + '/LandsatIndices_' + year);
var s2IndicesImage = ee.Image(path + '/S2Indices_' + year);
var l8TocIndicesImage = ee.Image(path + '/landsatTasseledCapIndices_' + year);
var s1AscendingImage = ee.Image(path + '/s1Ascending_' + year);
s1AscendingImage = s1AscendingImage.select(['VV', 'VH', 'ratio', 'ndratio'], ['vv_asc', 'vh_asc', 'ratio_asc', 'ndratio_asc']);
var s1DescendingImage = ee.Image(path + '/s1Descending_' + year);
s1DescendingImage = s1DescendingImage.select(['VV', 'VH', 'ratio', 'ndratio'], ['vv_desc', 'vh_desc', 'ratio_desc', 'ndratio_desc']);

var srtm = ee.Image("USGS/SRTMGL1_003");
var topo = ee.Algorithms.Terrain(srtm);
var slope = topo.select('slope').clip(ROI);
var elevation = srtm.clip(ROI);


var finalImagery = landsatIndicesImage.addBands([s2IndicesImage, l8TocIndicesImage, s1AscendingImage, s1DescendingImage, elevation, slope]);
finalImagery = finalImagery.float().clip(ROI);
var bands = finalImagery.bandNames();

print('finalImagery', finalImagery);


Map.addLayer(finalImagery.clip(ROI), {}, 'finalImagery', false);


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////  Sampling Dancing
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var trainingSample = finalImagery.select(bands).sampleRegions({
  collection: points,
  properties: [label],
  scale: 30,
  // geometries: true,
}).randomColumn({seed: 7});


// SIngle RF runs
// use these from csv generated in step 2


// 2020

var parameters = ee.Dictionary({
  numberOfTrees: changeTheseParameters.get('numberOfTrees'),
  variablesPerSplit: changeTheseParameters.get('variablesPerSplit'),
  minLeafPopulation: changeTheseParameters.get('minLeafPopulation'),
  bagFraction: changeTheseParameters.get('bagFraction'),
  maxNodes: changeTheseParameters.get('maxNodes'),
});


var classifier = baseModule.model.randomForest(trainingSample, bands, finalImagery, label, parameters);
print('trained classifier', classifier.explain());
print('variable importance', classifier.explain().get('importance'));

var classifiedImage = finalImagery.select(bands).classify(classifier);
var riceMap = classifiedImage.eq(1);


print('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
print('Independent Validation Starts Here');
print('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');


// some post processing before validation

// using RLCMS layer -> since RLCMS uses Handsen layer; Hansen is not added separately.

// 2020
var rlcms = ee.Image('projects/servir-hkh/RLCMS/HKH/landcover/hkh_landcover-' + year).clip(ROI);
Map.addLayer(rlcms, {min:1, max:10, palette: '005CE6,73DFFF,73DFFF,267300,2197FF,E60000,FFFF00,D7C29E,E8BEFF,BAFFA3'}, 'RLCMS-2020', false);

// 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
// water_body, snow, glacier, forest, riverbed, built_up,cropland, bare_soil, bare_rock, grassland, 
var rlcmsForest = rlcms.eq(4);
Map.addLayer(rlcmsForest, {}, 'rlcmsForest');
riceMap = riceMap.updateMask(rlcmsForest.eq(0)).unmask(0);
Map.addLayer(riceMap.selfMask(), {palette: 'red'}, 'riceMap_1', false);

// probably not a good idea to verify with crop layer
var rlcmsCrop = rlcms.eq(7);
Map.addLayer(rlcmsCrop, {}, 'rlcmsCrop');
var sumRiceCrop2020 = riceMap.add(rlcmsCrop);
riceMap = riceMap.updateMask(sumRiceCrop2020.eq(2));
Map.addLayer(riceMap.selfMask(), {palette: 'red'}, 'riceMap_2', false);


// connected pixels
// first export this image and then import it in line 15

// var connectedriceMap = riceMap.eq(1).connectedPixelCount({
//   maxSize: 128, eightConnected: false
// });

// Export.image.toAsset({
//   image: connectedriceMap,
//   description: 'connectedriceMap',
//   assetId: 'projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/ConnectedPixels/connectedriceMap',
//   scale: 30,
//   region: ROI,
//   maxPixels: 1E13,
// });

// Get a pixel area image.
var pixelArea = ee.Image.pixelArea();


// 2020
var objectArea = connectedriceMap.multiply(pixelArea);
// we want to mask anything which are not connected by 3 pixels area here
var areaMask2020 = objectArea.gte(3*30*30);

riceMap = riceMap.updateMask(areaMask2020);

Map.addLayer(riceMap.selfMask(), {palette: 'blue'}, 'riceMap_3', false);

// 2020
labelZero = labelZero.map(function (f) {
  return f.set(property, ee.Algorithms.If(ee.Number(ee.Feature(f).get(zeroLabelProperty)).eq(100), ee.Number(1), ee.Number(0)));
});

labelOne = labelOne.map(function (f) {
  return f.set(property, ee.Algorithms.If(ee.Number(ee.Feature(f).get(oneLabelProperty)).eq(100), ee.Number(1), ee.Number(0)));
});

var labels = labelZero.merge(labelOne);

labels = labels.map(function(f) {
  var geometry = ee.Geometry.Point([ee.Number(f.get('center_lon')), ee.Number(f.get('center_lat'))]);
  return f.setGeometry(geometry);
});


Map.addLayer(labels.filter(ee.Filter.eq(property, 1)), {color: 'darkgreen'}, 'labels_rice', false);
Map.addLayer(labels.filter(ee.Filter.eq(property, 0)), {color: 'darkred'}, 'labels_non_rice', false);


var validationSample = riceMap.unmask(0).sampleRegions({
  collection: labels,
  properties: [property],
  scale: 30,
  geometries: true,
});

var confusionMatrix = validationSample.errorMatrix(property, 'classification');
print('confusionMatrix', confusionMatrix);
print('accuracy', confusionMatrix.accuracy());
print('consumersAccuracy (Precision)', confusionMatrix.consumersAccuracy().get([0, 1]));
print('producersAccuracy (Recall)', confusionMatrix.producersAccuracy().get([1, 0]));
print('fscore', confusionMatrix.fscore().get([0]));
print('kappa', confusionMatrix.kappa());

// export the rice map
var startDate = ee.Date.fromYMD(year, 1, 1);
var endDate = ee.Date.fromYMD(year, 12, 31);
riceMap = riceMap.set('system:time_start', startDate.millis(), 'system:time_end', endDate.millis());
baseModule.utils.exportImageAsset (riceMap, 'Rice_'+ year, ROI, 30, exportPath + '/Rice_' + year);


