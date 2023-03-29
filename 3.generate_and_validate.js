////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  INPUT NEEDED BLOCK
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



var lte2 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte2_Sample"),
    Zero_2020 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/CEO_Points_4_Paper/ceo-New_Val_0_2020-plot-data-2022-10-18"),
    One_2020 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/CEO_Points_4_Paper/ceo-New_Val_1_2020-plot-data-2022-10-18"),
    hansenTreeCover = ee.Image("UMD/hansen/global_forest_change_2021_v1_9"),
    connectedRice2020 = ee.Image("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/ConnectedPixels/connectedRice2020");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  INPUT NEEDED BLOCK
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


var points = lte2;
var label = 'presence_lte2';
var property = 'label';

var zero_property_2020 = 'Land Cover Type?:Rice';
var one_property_2020 = 'Land Cover Type? :Rice';

Zero_2020 = Zero_2020.filter(ee.Filter.neq('flagged', true));
One_2020 = One_2020.filter(ee.Filter.neq('flagged', true));


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


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////
// //// Rice Mapping Prep
// ////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var landsatIndicesImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2020/LandsatIndices');
var s2IndicesImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2020/S2Indices');
var l8TocIndicesImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2020/landsatTasseledCapIndices');
var s1AscendingImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2020/s1Ascending');
s1AscendingImage = s1AscendingImage.select(['VV', 'VH', 'ratio', 'ndratio'], ['vv_asc', 'vh_asc', 'ratio_asc', 'ndratio_asc']);
var s1DescendingImage = ee.Image('projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2020/s1Descending');
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

// parameters with highest f1, recall, test accuracy, and test kappa
var parameters2020_1 = ee.Dictionary({
  numberOfTrees: 120,
  variablesPerSplit: null, // bandList.size(),
  minLeafPopulation: 3,
  bagFraction: 0.8,
  maxNodes: null,
});

// parameters with highest precision
var parameters2020_2 = ee.Dictionary({
  numberOfTrees: 40,
  variablesPerSplit: null, // bandList.size(),
  minLeafPopulation: 2,
  bagFraction: 0.6,
  maxNodes: null,
});


var classifier2020 = baseModule.model.randomForest(trainingSample, bands, finalImagery, label, parameters2020_1);
print('trained classifier', classifier2020.explain());
print('variable importance', classifier2020.explain().get('importance'));

var classifiedImage2020 = finalImagery.select(bands).classify(classifier2020);
var rice2020 = classifiedImage2020.eq(1);


print('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
print('Independent Validation Starts Here');
print('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');


// some post processing before validation

// using RLCMS layer -> since RLCMS uses Handsen layer; Hansen is not added separately.

// 2020
var rlcms2020 = ee.Image('projects/servir-hkh/RLCMS/HKH/landcover/hkh_landcover-2020').clip(ROI);
Map.addLayer(rlcms2020, {min:1, max:10, palette: '005CE6,73DFFF,73DFFF,267300,2197FF,E60000,FFFF00,D7C29E,E8BEFF,BAFFA3'}, 'RLCMS-2020', false);

// 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
// water_body, snow, glacier, forest, riverbed, built_up,cropland, bare_soil, bare_rock, grassland, 
var rlcmsForest2020 = rlcms2020.eq(4);
Map.addLayer(rlcmsForest2020, {}, 'rlcmsForest2020');
rice2020 = rice2020.updateMask(rlcmsForest2020.eq(0)).unmask(0);
Map.addLayer(rice2020.selfMask(), {palette: 'red'}, 'rice2020_1', false);

// probably not a good idea to verify with crop layer
var rlcmsCrop2020 = rlcms2020.eq(7);
Map.addLayer(rlcmsCrop2020, {}, 'rlcmsCrop2020');
var sumRiceCrop2020 = rice2020.add(rlcmsCrop2020);
rice2020 = rice2020.updateMask(sumRiceCrop2020.eq(2));
Map.addLayer(rice2020.selfMask(), {palette: 'red'}, 'rice2020_2', false);


// connected pixels
// first export this image and then import it in line 15

// var connectedRice2020 = rice2020.eq(1).connectedPixelCount({
//   maxSize: 128, eightConnected: false
// });

// Export.image.toAsset({
//   image: connectedRice2020,
//   description: 'connectedRice2020',
//   assetId: 'projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/ConnectedPixels/connectedRice2020',
//   scale: 30,
//   region: ROI,
//   maxPixels: 1E13,
// });

// Get a pixel area image.
var pixelArea = ee.Image.pixelArea();


// 2020

var objectArea2020 = connectedRice2020.multiply(pixelArea);
// we want to mask anything which are not connected by 3 pixels area here
var areaMask2020 = objectArea2020.gte(3*30*30);

rice2020 = rice2020.updateMask(areaMask2020);

Map.addLayer(rice2020.selfMask(), {palette: 'blue'}, 'rice2020_3', false);

// 2020
Zero_2020 = Zero_2020.map(function (f) {
  return f.set(property, ee.Algorithms.If(ee.Number(ee.Feature(f).get(zero_property_2020)).eq(100), ee.Number(1), ee.Number(0)));
});

One_2020 = One_2020.map(function (f) {
  return f.set(property, ee.Algorithms.If(ee.Number(ee.Feature(f).get(one_property_2020)).eq(100), ee.Number(1), ee.Number(0)));
});

var labels_2020 = Zero_2020.merge(One_2020);

labels_2020 = labels_2020.map(function(f) {
  var geometry = ee.Geometry.Point([ee.Number(f.get('center_lon')), ee.Number(f.get('center_lat'))]);
  return f.setGeometry(geometry);
});


Map.addLayer(labels_2020.filter(ee.Filter.eq(property, 1)), {color: 'darkgreen'}, 'labels_2020_rice', false);
Map.addLayer(labels_2020.filter(ee.Filter.eq(property, 0)), {color: 'darkred'}, 'labels_2020_non_rice', false);


var validationSample2020 = rice2020.unmask(0).sampleRegions({
  collection: labels_2020,
  properties: [property],
  scale: 30,
  geometries: true,
});

var confusionMatrix2020 = validationSample2020.errorMatrix(property, 'classification');
print('confusionMatrix2020', confusionMatrix2020);
print('accuracy2020', confusionMatrix2020.accuracy());
print('consumersAccuracy2020 (Precision)', confusionMatrix2020.consumersAccuracy().get([0, 1]));
print('producersAccuracy2020 (Recall)', confusionMatrix2020.producersAccuracy().get([1, 0]));
print('fscore2020', confusionMatrix2020.fscore().get([0]));
print('kappa2020', confusionMatrix2020.kappa());

