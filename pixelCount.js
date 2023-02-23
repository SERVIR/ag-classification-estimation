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
var l1 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/BT_Admin_1");
var paro = l1.filter(ee.Filter.eq('ADM1_EN', 'Paro'));

Map.addLayer(ROI, {color: 'red'}, 'ROI');
Map.centerObject(ROI, 9.5);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Input Imagery
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var LS7 = ee.ImageCollection("LANDSAT/LE07/C02/T2_L2");
var LS8 = ee.ImageCollection("LANDSAT/LC08/C02/T2_L2");
var LS9 = ee.ImageCollection("LANDSAT/LC09/C02/T2_L2");

var S2 = ee.ImageCollection('COPERNICUS/S2_SR');


var planet = ee.ImageCollection("projects/planet-nicfi/assets/basemaps/asia");


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


// var monthsList = [4, 5, 6, 7, 8, 9, 10];
var monthsList = [10, 11, 12];
var yearsList = [2021];

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  How many 30m pixel
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var img = ee.Image(1);
// reduceRegion(reducer, geometry, scale, crs, crsTransform, bestEffort, maxPixels, tileScale)
var countReducer = img.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: ROI,
  scale: 30,
  maxPixels: 1E13
});
print('Total No. of 30-m pixels:', countReducer.get('constant'));


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
l7FinalCollection = l7FinalCollection.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'QA_PIXEL']);

l7FinalCollection = l7FinalCollection.map(function (img) {
  return img.rename(['blue', 'green', 'red', 'nir', 'swir1', 'QA_PIXEL']);
});

l7FinalCollection = l7FinalCollection.map(baseModule.routine.applyScaleFactorsL7L8).map(baseModule.routine.maskL7L8);
print('l7FinalCollection', l7FinalCollection);

var l7FinalImage = l7FinalCollection.median();

Map.addLayer(l7FinalImage, {bands: ['red','green','blue']}, 'l7FinalImage', true);

var countReducer = l7FinalImage.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: ROI.geometry(),
  scale: 30,
  maxPixels: 1E13
});
print('Total No. of Landsat 7 pixels:', countReducer.get('red'));


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Landsat 8 Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var l8FinalCollection =  ee.ImageCollection(
  baseModule.utils.timePeriodSelector(LS8, monthsList, yearsList, ROI)
).sort('system:time_start');

l8FinalCollection = l8FinalCollection.select(['SR_B.', 'QA_PIXEL']);

l8FinalCollection = l8FinalCollection.sort('system:time_start', true);

l8FinalCollection = l8FinalCollection.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'QA_PIXEL']);

l8FinalCollection = l8FinalCollection.map(function (img) {
  return img.rename(['blue', 'green', 'red', 'nir', 'swir1', 'QA_PIXEL']);
});

l8FinalCollection = l8FinalCollection.map(baseModule.routine.applyScaleFactorsL7L8).map(baseModule.routine.maskL7L8);
print('l8FinalCollection', l8FinalCollection);

var l8FinalImage = l8FinalCollection.median();

Map.addLayer(l8FinalImage, {bands: ['red','green','blue']}, 'l8FinalImage', true);

var countReducer = l8FinalImage.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: ROI.geometry(),
  scale: 30,
  maxPixels: 1E13
});
print('Total No. of Landsat 8 pixels:', countReducer.get('red'));


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


s2FinalCollection = baseModule.routine.maskS2Collection(s2FinalCollection);
print('s2FinalCollection', s2FinalCollection);

var s2FinalImage = s2FinalCollection.median();
var s2Indices = baseModule.indices.calculateS2Indices(s2FinalImage).float();
s2FinalImage = s2FinalImage.select(['B4', 'B3', 'B2', 'B8', 'B11'], ['red', 'green', 'blue', 'nir', 'swir1']).float();

// Map.addLayer(s2FinalImage.clip(ROI), {bands:['swir1', 'nir', 'red'], min:0.01, max:0.4}, 's2CollectionMedian', false);

var countReducer = s2FinalImage.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: ROI.geometry(),
  scale: 30,
  maxPixels: 1E13
});
print('Total No. of Sentinel 2 pixels:', countReducer.get('red'));


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Planet Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var planetFinalCollection =  ee.ImageCollection(
  baseModule.utils.timePeriodSelector(planet, monthsList, yearsList, ROI)
).sort('system:time_start');

print('planetFinalCollection', planetFinalCollection);

var planetFinalImage = planetFinalCollection.median();
print('planetFinalImage', planetFinalImage);

// Map.addLayer(planetFinalImage.clip(ROI), {bands:['R', 'G', 'B'], min: -200, max: 2000}, 'planet Median', false);

var countReducer = planetFinalImage.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: ROI.geometry(),
  scale: 30,
  maxPixels: 1E13
});
print('Total No. of planet pixels:', countReducer.get('R'));


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  NDVI Stats
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var reducers = ee.Reducer.mean()
  .combine({reducer2: ee.Reducer.min(), sharedInputs: true})
  .combine({reducer2: ee.Reducer.max(), sharedInputs: true})
  .combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true})
  .combine({reducer2: ee.Reducer.percentile([25, 50, 75], ['Q1', 'Q2', 'Q3']), sharedInputs: true});
print('reducers', reducers);


/////
////
// s2

var s2NDVI = s2FinalImage.normalizedDifference(['nir', 'red']);
s2FinalImage = s2FinalImage.addBands(s2NDVI.rename('NDVI'));

// collection, reducer, scale, crs, crsTransform, tileScale
var s2NdviReducer = s2NDVI.reduceRegions({
  collection: paro,
  reducer: reducers,
  scale: 30,
});
print('s2 NdviReducer');

print('Avg = ' + s2NdviReducer.first().get('mean').getInfo() + 
      ', Min = ' + s2NdviReducer.first().get('min').getInfo() +
      ', Max = ' + s2NdviReducer.first().get('max').getInfo());

print('Q1  = ' + s2NdviReducer.first().get('Q1').getInfo() + 
      ', Q2  = ' + s2NdviReducer.first().get('Q2').getInfo() +
      ', Q3  = ' + s2NdviReducer.first().get('Q3').getInfo());

print();



Map.addLayer(s2FinalImage.clip(ROI), {bands:['swir1', 'nir', 'red'], min:0.01, max:0.4}, 's2CollectionMedian', false);



/////
///
//  planet

var planetNDVI = planetFinalImage.normalizedDifference(['N', 'R']);
planetFinalImage = planetFinalImage.addBands(planetNDVI.rename('NDVI'));

// collection, reducer, scale, crs, crsTransform, tileScale
var planetNdviReducer = planetNDVI.reduceRegions({
  collection: paro,
  reducer: reducers,
  scale: 30,
});
print('planet NdviReducer');

print('Avg = ' + planetNdviReducer.first().get('mean').getInfo() + 
      ', Min = ' + planetNdviReducer.first().get('min').getInfo() +
      ', Max = ' + planetNdviReducer.first().get('max').getInfo());

print('Q1  = ' + planetNdviReducer.first().get('Q1').getInfo() + 
      ', Q2  = ' + planetNdviReducer.first().get('Q2').getInfo() +
      ', Q3  = ' + planetNdviReducer.first().get('Q3').getInfo());

print();

Map.addLayer(planetFinalImage.clip(ROI), {bands:['R', 'G', 'B'], min: -200, max: 2000}, 'planet Median', false);






