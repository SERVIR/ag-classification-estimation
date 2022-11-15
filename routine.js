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
  
    return image.updateMask(mask).divide(10000);
  }
  
  return ee.ImageCollection(imageCollection).map(maskS2clouds);
  
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function applyScaleFactorsL7L8(image) {
  // var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  // var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  // return image.addBands(opticalBands, null, true)
  //             .addBands(thermalBands, null, true);
  var opticalBands = image.select(['green', 'red', 'nir', 'swir1']).multiply(0.0000275).add(-0.2);
  return image.addBands(opticalBands, null, true);
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

// needs fixing?
function maskL8ToaClouds (image) {

  function getQABits (image, start, end, newName) {
    // Compute the bits we need to extract.
    var pattern = 0;
    for (var i = start; i <= end; i++) {
       pattern += Math.pow(2, i);
    }
    // Return a single band image of the extracted QA bits, giving the band
    // a new name.
    return image.select([0], [newName])
                  .bitwiseAnd(pattern)
                  .rightShift(start);
  }

  // A function to mask out cloudy pixels.
  function cloud_shadows (image) {
    // Select the QA band.
    var QA = image.select(['QA_PIXEL']);
    // Get the internal_cloud_algorithm_flag bit.
    return getQABits(QA, 7, 8, 'Cloud_shadows').eq(1);
    // Return an image masking out cloudy areas.
  }
  
  // A function to mask out cloudy pixels.
  function clouds (image) {
    // Select the QA band.
    var QA = image.select(['BQA']);
    // Get the internal_cloud_algorithm_flag bit.
    return getQABits(QA, 4, 4, 'Cloud').eq(0);
    // Return an image masking out cloudy areas.
  }

  var cs = cloud_shadows(image);
  var c = clouds(image);
  image = image.updateMask(cs);
  return image.updateMask(c);
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
exports.maskS2Collection = maskS2Collection;
exports.maskL7L8 = maskL7L8;
exports.maskL8ToaClouds = maskL8ToaClouds;
exports.powerToDb = powerToDb;
exports.dbToPower = dbToPower;
