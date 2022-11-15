/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var Zero_2019 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/CEO_Points_4_Paper/ceo-New_Val_0_2019-plot-data-2022-10-18"),
    One_2019 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/CEO_Points_4_Paper/ceo-New_Val_1_2019-plot-data-2022-10-18"),
    Zero_2020 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/CEO_Points_4_Paper/ceo-New_Val_0_2020-plot-data-2022-10-18"),
    One_2020 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/CEO_Points_4_Paper/ceo-New_Val_1_2020-plot-data-2022-10-18"),
    riceMap = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Prediction_4_Paper");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var property = 'label';

// 
var zero_property_2019 = 'Land Cover type?:Rice';
var zero_property_2020 = 'Land Cover Type?:Rice';
var one_property_2019 = 'Land Cover Type?:Rice';
var one_property_2020 = 'Land Cover Type? :Rice';

Zero_2019 = Zero_2019.filter(ee.Filter.neq('flagged', true));
One_2019 = One_2019.filter(ee.Filter.neq('flagged', true));
Zero_2020 = Zero_2020.filter(ee.Filter.neq('flagged', true));
One_2020 = One_2020.filter(ee.Filter.neq('flagged', true));

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

Map.addLayer(labels_2019.filter(ee.Filter.eq(property, 1)), {color: 'green'}, 'labels_2019_rice', false);
Map.addLayer(labels_2019.filter(ee.Filter.eq(property, 0)), {color: 'red'}, 'labels_2019_non_rice', false);

var rice2019 = riceMap.filterDate('2019-01-01', '2019-12-31').first();

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
// print('consumersAccuracy2019 (Precision)', confusionMatrix2019.consumersAccuracy());
print('consumersAccuracy2019 (Precision)', confusionMatrix2019.consumersAccuracy().get([0, 1]));
// print('producersAccuracy2019 (Recall)', confusionMatrix2019.producersAccuracy());
print('producersAccuracy2019 (Recall)', confusionMatrix2019.producersAccuracy().get([1, 0]));
// print('fscore2019', confusionMatrix2019.fscore());
print('fscore2019', confusionMatrix2019.fscore().get([1]));



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

print('labels_2020', labels_2020);

Map.addLayer(labels_2020.filter(ee.Filter.eq(property, 1)), {color: 'darkgreen'}, 'labels_2020_rice', false);
Map.addLayer(labels_2020.filter(ee.Filter.eq(property, 0)), {color: 'darkred'}, 'labels_2020_non_rice', false);


var rice2020 = riceMap.filterDate('2020-01-01', '2020-12-31').first();

var validationSample2020 = rice2020.sampleRegions({
  collection: labels_2020,
  properties: [property],
  scale: 30,
  geometries: true,
});

print('validationSample2020', validationSample2020);

var confusionMatrix2020 = validationSample2020.errorMatrix(property, 'classification');
print('confusionMatrix2020', confusionMatrix2020);
print('accuracy2020', confusionMatrix2020.accuracy());
print('consumersAccuracy2020 (Precision)', confusionMatrix2020.consumersAccuracy().get([0, 1]));
print('producersAccuracy2020 (Recall)', confusionMatrix2020.producersAccuracy().get([1, 0]));
print('fscore2020', confusionMatrix2020.fscore().get([1]));


