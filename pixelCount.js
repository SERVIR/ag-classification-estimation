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
Map.addLayer(ROI, {color: 'red'}, 'ROI');
Map.centerObject(ROI, 8);

Export.table.toDrive({
  collection: ROI,
   description: 'bhutan_shapefile',
   folder: 'Bhutan_Rice_Mapping',
   fileNamePrefix: 'bhutan_shapefile',
   fileFormat: 'SHP'
});



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


// var monthsList = [5, 6, 7, 8, 9, 10];
var monthsList = [5];
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

l8FinalCollection = l8FinalCollection.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'QA_PIXEL']);

l8FinalCollection = l8FinalCollection.map(function (img) {
  return img.rename(['blue', 'green', 'red', 'nir', 'swir1', 'QA_PIXEL']);
});

var l8size = l8FinalCollection.size().getInfo();

var l8List = l8FinalCollection.toList(l8size);

var ids = ee.List([]);
var uniqueIndices = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

for (var i = 0; i < l8size; i++) {
  var image = ee.Image(l8List.get(i));
  var id = image.get('LANDSAT_SCENE_ID').getInfo();
  if (uniqueIndices.indexOf(i) != -1) {
   ids = ids.add(id); 
  }
  // Map.addLayer(image.geometry(), {}, 'Image_' + i + '_' + id, false);
}

print('ids', ids);
// 1, 4, 11
// var l8ImagesID = ['LC81370412020138LGN00', 'LC81380412020129LGN00', 'LC81370412020122LGN00'];

// var l8Images = l8FinalCollection.filter(ee.Filter.inList('LANDSAT_SCENE_ID', l8ImagesID));
// print('l8Images', l8Images);

// var l8ImagesSize = l8Images.size().getInfo();

// var l8ImagesSizeList = l8Images.toList(l8size);

// for (var i = 0; i < l8ImagesSize; i++) {
//   var image = ee.Image(l8ImagesSizeList.get(i));
//   var id = image.get('LANDSAT_SCENE_ID').getInfo();
//   Map.addLayer(image.geometry(), {}, 'Image_' + i + '_' + id, false);
// }

// unique footprint
var l8ImagesID = [
  'LC81380412020129LGN00', 'LC81380422020129LGN00', 'LC81360412020131LGN00', 'LC81360422020131LGN00',
  'LC81390402020136LGN00', 'LC81390412020136LGN00', 'LC81370402020138LGN00', 'LC81370412020138LGN00',
  'LC81370422020138LGN00', 'LC81380402020145LGN00'
];

var l8Images = l8FinalCollection.filter(ee.Filter.inList('LANDSAT_SCENE_ID', l8ImagesID));
print('l8Images', l8Images);

var l8ImagesSize = l8Images.size().getInfo();

var l8ImagesSizeList = l8Images.toList(l8size);

var l8footprint = ee.List([]);

for (var i = 0; i < l8ImagesSize; i++) {
  var image = ee.Image(l8ImagesSizeList.get(i));
  var id = image.get('LANDSAT_SCENE_ID').getInfo();
  Map.addLayer(image.geometry(), {}, 'Image_' + i + '_' + id, false);
  l8footprint = l8footprint.add(ee.Feature(image.geometry()));
}

var fc = ee.FeatureCollection(l8footprint);
print(fc);
Map.addLayer(fc.geometry(), {}, 'footprint');

Export.table.toDrive({
  collection: fc,
   description: 'image_footprints',
   folder: 'Bhutan_Rice_Mapping',
   fileNamePrefix: 'image_footprints',
   fileFormat: 'SHP'
});

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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Landsat 7 and 8 Merge Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

print('l7FinalCollection', l7FinalCollection);
print('l8FinalCollection', l8FinalCollection);

// var _landsatCollection = baseModule.routine.getL7L8ReducedImage(listofDates, l8FinalCollection, l7FinalCollection);
// var landsatCollection = ee.ImageCollection(_landsatCollection);

// var landsatImage = landsatCollection.median();
// var landsatIndices = baseModule.indices.calculateL7L8Indices(landsatImage).float();
// landsatImage = landsatImage.select(['red', 'green', 'blue', 'nir', 'swir1']).float();

// print('landsatImage', landsatImage);
// print('landsatIndices', landsatIndices);
// Map.addLayer(landsatImage.clip(ROI), {bands:['swir1', 'nir', 'red'], min:0.04, max:0.4}, 'landsatCollectionMedian');
// Map.addLayer(landsatIndices.clip(ROI), {min:0.04, max:0.4}, 'landsatIndices');

// baseModule.utils.exportImageAsset(landsatImage, 'LandsatComposite', ROI, 30, 'projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2020/LandsatComposite');
// baseModule.utils.exportImageAsset(landsatIndices, 'LandsatCompositeIndices', ROI, 30, 'projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2020/LandsatIndices');


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Sentinel 2 Dancing
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// var s2FinalCollection =  ee.ImageCollection(
//   baseModule.utils.timePeriodSelector(S2, monthsList, yearsList, ROI)
// ).sort('system:time_start');

// s2FinalCollection = baseModule.routine.maskS2Collection(s2FinalCollection);
// print('s2FinalCollection', s2FinalCollection);

// var s2FinalImage = s2FinalCollection.median();
// var s2Indices = baseModule.indices.calculateS2Indices(s2FinalImage).float();
// s2FinalImage = s2FinalImage.select(['B4', 'B3', 'B2', 'B8', 'B11'], ['red', 'green', 'blue', 'nir', 'swir1']).float();

// print('s2FinalImage', s2FinalImage);
// print('s2Indices', s2Indices);
// Map.addLayer(s2FinalImage.clip(ROI), {bands:['swir1', 'nir', 'red'], min:0.01, max:0.4}, 's2CollectionMedian');
// Map.addLayer(s2Indices.clip(ROI), {}, 's2Indices');

// baseModule.utils.exportImageAsset(s2FinalImage, 'S2Composite', ROI, 30, 'projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2020/S2Composite');
// baseModule.utils.exportImageAsset(s2Indices, 'S2CompositeIndices', ROI, 30, 'projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Composite_2020/S2Indices');

