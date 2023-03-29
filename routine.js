////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function maskL7L8(image) {
  //Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = (1 << 4);
  var cloudsBitMask = (1 << 3);
  // Get the pixel QA band.
  var qa = image.select('QA_PIXEL');
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
               .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function maskS2Collection(imageCollection) {
  
  function maskS2clouds(image) {
    var qa = image.select('QA60');
  
    // Bits 10 and 11 are clouds and cirrus, respectively.
    var cloudBitMask = 1 << 10;
    var cirrusBitMask = 1 << 11;
  
    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
                 .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  
    var prop = image.toDictionary();
    var system_time_index = image.get('system:time_start');
  
    var returnImage = image.updateMask(mask).divide(10000);
    // returnImage = returnImage.set(prop).copyProperties(image, ['system:time_start', 'system:footprint']);
    returnImage = returnImage.set(prop).set('system:time_start', system_time_index);
    return ee.Image(returnImage);
  }
  
  return ee.ImageCollection(imageCollection).map(maskS2clouds);
  
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function applyScaleFactorsL7L8 (image) {
  var opticalBands = image.select(['green', 'red', 'nir', 'swir1']).multiply(0.0000275).add(-0.2);
  return image.addBands(opticalBands, null, true);
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// This function gets a reduced image via mosaic
// you can also do median, but that would mean your spatial extent are limited
function getL7L8ReducedImage(listofDates, LS8, LS7) {
  
  LS8 = LS8.map(applyScaleFactorsL7L8).map(maskL7L8);
  LS7 = LS7.map(applyScaleFactorsL7L8).map(maskL7L8);
  return listofDates.map(function (ld) {
    var icL8 = ee.ImageCollection(LS8.filterDate(ee.Dictionary(ld).get('startDate'), ee.Dictionary(ld).get('endDate')));
    var icL7 = ee.ImageCollection(LS7.filterDate(ee.Dictionary(ld).get('startDate'), ee.Dictionary(ld).get('endDate')));
    var lc = icL8.merge(icL7);
    // return lc.median();
    return lc.mosaic();
  });
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function powerToDb(img){
  return ee.Image(10).multiply(img.log10());
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function dbToPower(img){
  return ee.Image(10).pow(img.divide(10));
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.getL7L8ReducedImage = getL7L8ReducedImage;
exports.applyScaleFactorsL7L8 = applyScaleFactorsL7L8;
exports.maskS2Collection = maskS2Collection;
exports.maskL7L8 = maskL7L8;
exports.powerToDb = powerToDb;
exports.dbToPower = dbToPower;
