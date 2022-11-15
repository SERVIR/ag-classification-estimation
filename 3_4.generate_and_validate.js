/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var lte2 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Final_Bhutan_lte2_Sample"),
    Zero_2019 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/CEO_Points_4_Paper/ceo-New_Val_0_2019-plot-data-2022-10-18"),
    One_2019 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/CEO_Points_4_Paper/ceo-New_Val_1_2019-plot-data-2022-10-18"),
    Zero_2020 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/CEO_Points_4_Paper/ceo-New_Val_0_2020-plot-data-2022-10-18"),
    One_2020 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/CEO_Points_4_Paper/ceo-New_Val_1_2020-plot-data-2022-10-18");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var points = lte2;
var label = 'presence_lte2';
var property = 'label';

var zero_property_2019 = 'Land Cover type?:Rice';
var zero_property_2020 = 'Land Cover Type?:Rice';
var one_property_2019 = 'Land Cover Type?:Rice';
var one_property_2020 = 'Land Cover Type? :Rice';

Zero_2019 = Zero_2019.filter(ee.Filter.neq('flagged', true));
One_2019 = One_2019.filter(ee.Filter.neq('flagged', true));
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


Map.addLayer(finalImagery.clip(ROI), {}, 'finalImagery', false);


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ////  Data points Dancing
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var table = points; // table1.merge(table2);
table = table.filterBounds(ROI);
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


// SIngle RF runs
// use these from csv generated in step 2


// 2019

// parameters with highest f1, recall, test accuracy, and test kappa
var parameters2019_1 = ee.Dictionary({
  numberOfTrees: 100,
  variablesPerSplit: finalImagery.bandNames().size(),
  minLeafPopulation: 5,
  bagFraction: 0.6,
  maxNodes: null,
});

// parameters with highest precision
var parameters2019_2 = ee.Dictionary({
  numberOfTrees: 30,
  variablesPerSplit: null, // bandList.size(),
  minLeafPopulation: 2,
  bagFraction: 0.5,
  maxNodes: null,
});


// parameters with highest recall
var parameters2019_3 = ee.Dictionary({
  numberOfTrees: 120,
  variablesPerSplit: finalImagery.bandNames().size(),
  minLeafPopulation: 1,
  bagFraction: 1,
  maxNodes: null,
});


var classifier2019 = baseModule.model.randomForest(training_sample, bands, finalImagery, label, parameters2019_2);

var classifiedImage2019 = finalImagery.select(bands).classify(classifier2019);
var rice2019 = classifiedImage2019.eq(1);


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


var classifier2020 = baseModule.model.randomForest(training_sample, bands, finalImagery, label, parameters2020_1);
// print(classifier2020.explain());
// print(classifier2020.explain().get('importance'));

var classifiedImage2020 = finalImagery.select(bands).classify(classifier2020);
var rice2020 = classifiedImage2020.eq(1);


print('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
print('Validation Starts Here');
print('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');



print('##########################################');
print('Validation 2019');
print('##########################################');

// 2019
Zero_2019 = Zero_2019.map(function (f) {
  return f.set(property, ee.Algorithms.If(ee.Number(ee.Feature(f).get(zero_property_2019)).eq(100), ee.Number(1), ee.Number(0)));
});

One_2019 = One_2019.map(function (f) {
  return f.set(property, ee.Algorithms.If(ee.Number(ee.Feature(f).get(one_property_2019)).eq(100), ee.Number(1), ee.Number(0)));
});

var labels_2019 = Zero_2019.merge(One_2019);

// Generate the histogram data.
var histogram_2019 = ui.Chart.feature.histogram({
  features: labels_2019,
  property: property,
});
histogram_2019.setOptions({
  title: 'Histogram of Labels (2019)'
});

print(histogram_2019);

labels_2019 = labels_2019.map(function(f) {
  var geometry = ee.Geometry.Point([ee.Number(f.get('center_lon')), ee.Number(f.get('center_lat'))]);
  return f.setGeometry(geometry);
});

print('labels_2019', labels_2019);

var validationSample2019 = rice2019.sampleRegions({
  collection: labels_2019,
  properties: [property],
  scale: 30,
  geometries: true,
});

print('validationSample2019', validationSample2019);

var confusionMatrix2019 = validationSample2019.errorMatrix(property, 'classification');
print('confusionMatrix2019', confusionMatrix2019);
print('accuracy2019', confusionMatrix2019.accuracy());
print('consumersAccuracy2019 (Precision)', confusionMatrix2019.consumersAccuracy().get([0, 1]));
print('producersAccuracy2019 (Recall)', confusionMatrix2019.producersAccuracy().get([1, 0]));
print('fscore2019', confusionMatrix2019.fscore().get([1]));
print('kappa2019', confusionMatrix2019.kappa());


print('##########################################');
print('Validation 2020');
print('##########################################');


// 2020
Zero_2020 = Zero_2020.map(function (f) {
  return f.set(property, ee.Algorithms.If(ee.Number(ee.Feature(f).get(zero_property_2020)).eq(100), ee.Number(1), ee.Number(0)));
});

One_2020 = One_2020.map(function (f) {
  return f.set(property, ee.Algorithms.If(ee.Number(ee.Feature(f).get(one_property_2020)).eq(100), ee.Number(1), ee.Number(0)));
});

var labels_2020 = Zero_2020.merge(One_2020);

// Generate the histogram data.
var histogram_2020 = ui.Chart.feature.histogram({
  features: labels_2020,
  property: property,
});
histogram_2020.setOptions({
  title: 'Histogram of Labels (2020)'
});

print(histogram_2020);


labels_2020 = labels_2020.map(function(f) {
  var geometry = ee.Geometry.Point([ee.Number(f.get('center_lon')), ee.Number(f.get('center_lat'))]);
  return f.setGeometry(geometry);
});

Map.addLayer(labels_2020.filter(ee.Filter.eq(property, 1)), {color: 'darkgreen'}, 'labels_2020_rice', false);
Map.addLayer(labels_2020.filter(ee.Filter.eq(property, 0)), {color: 'darkred'}, 'labels_2020_non_rice', false);


var validationSample2020 = rice2020.sampleRegions({
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

