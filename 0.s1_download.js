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



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////
////  Input Imagery
////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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


// Do months 5-10 (inclusive) individually
// Do 1 month at a time.
// if multiple month/year is added; baseModule.utils.timePeriodSelector will give you all
var monthsList = [5];    // <--- INPUT NEEDED: MONTH NUMBER
var yearsList = [2020];
var dateFormat = '2020-0' + monthsList[0] + '-01';


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

var s1DescendingFinal = ee.ImageCollection(
  baseModule.utils.timePeriodSelector(s1Descending, monthsList, yearsList, ROI)
).sort('system:time_start');

// Terrain Correction
s1DescendingFinal = baseModule.s1_correction.radiometricTerrainCorrection(s1DescendingFinal);
// Lee filter
s1DescendingFinal = baseModule.s1_correction.refinedLeeSpeckleFilter(s1DescendingFinal);

// Get a median composite for the filtered image
var s1DescendingFinalImg = s1DescendingFinal.select(['VV', 'VH']).median();
s1DescendingFinalImg = s1DescendingFinalImg.set('system:time_start', ee.Date(dateFormat));
print('s1DescendingFinalImg', s1DescendingFinalImg);

// Export Terrain corrected and Lee filtered image
// parameters to the function call are: image, description, region, scale, assetId
baseModule.utils.exportImageAsset(s1DescendingFinalImg, 's1DescendingFinalImg_' + dateFormat, ROI, 10,
'projects/servir-sco-assets/assets/Bhutan/Sentinel1Descending/Descending_' + dateFormat);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////  Ascend Dancing
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var s1AscendingFinal = ee.ImageCollection(
  baseModule.utils.timePeriodSelector(s1Ascending, monthsList, yearsList, ROI)
).sort('system:time_start');

// Terrain Correction
s1AscendingFinal = baseModule.s1_correction.radiometricTerrainCorrection(s1AscendingFinal);
// Lee Filter
s1AscendingFinal = baseModule.s1_correction.refinedLeeSpeckleFilter(s1AscendingFinal);

// Get a median composite for the filtered image
var s1AscendingFinalImg = s1AscendingFinal.select(['VV', 'VH']).median();
s1AscendingFinalImg = s1AscendingFinalImg.set('system:time_start', ee.Date(dateFormat));
print('s1AscendingFinalImg', s1AscendingFinalImg);

// Export Terrain corrected and Lee filtered image
// parameters to the function call are: image, description, region, scale, assetId
baseModule.utils.exportImageAsset(s1AscendingFinalImg, 's1AscendingFinalImg_' + dateFormat, ROI, 10,
'projects/servir-sco-assets/assets/Bhutan/Sentinel1Ascending/Ascending_' + dateFormat);
