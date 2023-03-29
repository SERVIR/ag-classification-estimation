var routine = require("users/biplov/bhutan-aces-v-1:routine.js");

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function calculateL7L8Indices (imageCollection) {

  var image = ee.Image(ee.Algorithms.If(
    ee.Algorithms.ObjectType(imageCollection).equals('Image'),
    ee.Image(imageCollection),
    ee.ImageCollection(imageCollection).median())
  );

  var NDVI = image.normalizedDifference(['nir', 'red']).rename('NDVI');
  
  var NDWI = image.normalizedDifference(['green', 'nir']).rename('NDWI');

  var MNDWI = image.normalizedDifference(['green', 'swir1']).rename('MNDWI');
  
  var SAVI = image.expression('((NIR - RED) / (NIR + RED + 0.5))*(1.5)', {
                                  'NIR': image.select('nir'),
                                  'RED': image.select('red')}).rename('SAVI');
        
  var NDMI = image.normalizedDifference(['nir', 'swir1']).rename('NDMI');
    
  var NDBI = image.normalizedDifference(['swir1', 'nir']).rename('NDBI');

  return NDVI.addBands([NDWI, MNDWI, SAVI, NDMI, NDBI]).float();
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function calculateL8ToaTasseledCapIndices(imageCollection) {

  imageCollection = imageCollection.map(routine.maskL7L8);

  var image = imageCollection.median();

  var bands = image.select('blue', 'green', 'red', 'nir', 'swir1', 'swir2');
  //Coefficients are only for Landsat 8 TOA
  var brightness_coefficents= ee.Image([0.3029, 0.2786, 0.4733, 0.5599, 0.508, 0.1872]);
  var greenness_coefficents= ee.Image([-0.2941, -0.243, -0.5424, 0.7276, 0.0713, -0.1608]);
  var wetness_coefficents= ee.Image([0.1511, 0.1973, 0.3283, 0.3407, -0.7117, -0.4559]);
  var fourth_coefficents= ee.Image([-0.8239, 0.0849, 0.4396, -0.058, 0.2013, -0.2773]);
  var fifth_coefficents= ee.Image([-0.3294, 0.0557, 0.1056, 0.1855, -0.4349, 0.8085]);
  var sixth_coefficents= ee.Image([0.1079, -0.9023, 0.4119, 0.0575, -0.0259, 0.0252]);

  var brightness = image.expression('(bands * BRIGHTNESS)',{'bands': bands, 'BRIGHTNESS': brightness_coefficents});
  var greenness = image.expression('(bands * GREENNESS)',{'bands': bands,'GREENNESS': greenness_coefficents});
  var wetness = image.expression('(bands * WETNESS)', {'bands': bands,'WETNESS': wetness_coefficents});
  var fourth = image.expression('(bands * FOURTH)', {'bands': bands,'FOURTH': fourth_coefficents});
  var fifth = image.expression( '(bands * FIFTH)', {'bands': bands,'FIFTH': fifth_coefficents });
  var sixth = image.expression('(bands * SIXTH)', {'bands': bands,'SIXTH': sixth_coefficents });
  
  brightness = brightness.reduce(ee.call('Reducer.sum'));
  greenness = greenness.reduce(ee.call('Reducer.sum'));
  wetness = wetness.reduce(ee.call('Reducer.sum'));
  fourth = fourth.reduce(ee.call('Reducer.sum'));
  fifth = fifth.reduce(ee.call('Reducer.sum'));
  sixth = sixth.reduce(ee.call('Reducer.sum'));
  return ee.Image(brightness).addBands([greenness, wetness, fourth, fifth, sixth])
                             .rename(['brightness','greenness','wetness','fourth','fifth','sixth']);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// not recommended
function _calculateS2Indices(imageCollection) {

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

  imageCollection = imageCollection.map(maskS2clouds);

  var S2_NDVI = imageCollection.map(function(image) { 
    var conv =  image.normalizedDifference(['B8', 'B4']).rename('S2_NDVI');
    return  ee.Image(conv.copyProperties(image)).set('system:time_start', image.get('system:time_start'));
  }).median();
  
  var S2_NDWI = imageCollection.map(function(image) { 
    var conv =  image.normalizedDifference(['B3', 'B8']).rename('S2_NDWI');
    return  ee.Image(conv.copyProperties(image)).set('system:time_start', image.get('system:time_start'));
  }).median();

  var S2_MNDWI = imageCollection.map(function(image) { 
    var conv =  image.normalizedDifference(['B3', 'B11']).rename('S2_MNDWI');
    return  ee.Image(conv.copyProperties(image)).set('system:time_start', image.get('system:time_start'));
  }).median();
  
  var S2_SAVI = imageCollection.map(function(image) { 
    var conv =  image.expression('((NIR - RED) / (NIR + RED + 0.5))*(1.5)', {
                                  'NIR': image.select('B8'),
                                  'RED': image.select('B4')}).rename("S2_SAVI");
    return  ee.Image(conv.copyProperties(image)).set('system:time_start', image.get('system:time_start'));
  }).median();
        
  var S2_NDMI = imageCollection.map(function(image) { 
    var conv =  image.normalizedDifference(['B8', 'B11']).rename('S2_NDMI');
    return  ee.Image(conv.copyProperties(image)).set('system:time_start', image.get('system:time_start'));
  }).median();
    
  var S2_NDBI  = imageCollection.map(function(image) { 
    var conv =  image.normalizedDifference(['B11', 'B8']).rename('S2_NDBI');
    return  ee.Image(conv.copyProperties(image)).set('system:time_start', image.get('system:time_start'));
  }).median();
  
  return S2_NDVI.addBands([S2_NDWI, S2_MNDWI, S2_SAVI, S2_NDMI, S2_NDBI]);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function calculateS2Indices(imageCollection){
  
  var image = ee.Image(ee.Algorithms.If(
    ee.Algorithms.ObjectType(imageCollection).equals('Image'),
    ee.Image(imageCollection),
    routine.maskS2Collection(imageCollection).median())
  );

  var S2_NDVI = image.normalizedDifference(['B8', 'B4']).rename('S2_NDVI');

  var S2_EVI = image.expression (
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      'NIR': image.select('B8'),
      'RED': image.select('B4'),
      'BLUE': image.select('B2')
  }).rename('S2_EVI');
  
  var S2_NDWI = image.normalizedDifference(['B3', 'B8']).rename('S2_NDWI');

  var S2_MNDWI = image.normalizedDifference(['B3', 'B11']).rename('S2_MNDWI');
  
  var S2_SAVI = image.expression('((NIR - RED) / (NIR + RED + 0.5))*(1.5)', {
                                  'NIR': image.select('B8'),
                                  'RED': image.select('B4')}).rename('S2_SAVI');
        
  var S2_NDMI = image.normalizedDifference(['B8', 'B11']).rename('S2_NDMI');
    
  var S2_NDBI = image.normalizedDifference(['B11', 'B8']).rename('S2_NDBI');
  
  return S2_NDVI.addBands([S2_NDWI, S2_EVI, S2_MNDWI, S2_SAVI, S2_NDMI, S2_NDBI]).float();
    
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function calculateS1Indices(ImageCollection) {

  var VV = ImageCollection.select('VV').median();
  var VH = ImageCollection.select('VH').median();
  var S1_ratio = VV.divide(VH).rename('ratio');
  var S1_ndratio = VV.subtract(VH).divide(VV.add(VH)).rename('ndratio');

  return VV.addBands([VH, S1_ratio, S1_ndratio]);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getIndices(listofDates, imageCollection, type) {
  
  if (type == 'landsat') {
    return listofDates.map(function (ld) {
      var ic = ee.ImageCollection(imageCollection.filterDate(ee.Dictionary(ld).get('startDate'), ee.Dictionary(ld).get('endDate')));
      return indices.calculateL7L8Indices(ic);
    });
  } else if (type == 'sentinel2') {
    return listofDates.map(function (ld) {
      var ic = ee.ImageCollection(imageCollection.filterDate(ee.Dictionary(ld).get('startDate'), ee.Dictionary(ld).get('endDate')));
      return indices.calculateS2Indices(ic);
    });
  } else if (type == 'tc') {
    return listofDates.map(function (ld) {
      var ic = ee.ImageCollection(imageCollection.filterDate(ee.Dictionary(ld).get('startDate'), ee.Dictionary(ld).get('endDate')));
      return indices.calculateL8ToaTasseledCapIndices(ic);
    });
  } else if (type == 'sentinel1') {
    return listofDates.map(function (ld) {
      var ic = ee.ImageCollection(imageCollection.filterDate(ee.Dictionary(ld).get('startDate'), ee.Dictionary(ld).get('endDate')));
      return indices.calculateS1Indices(ic);
    });
  } else if (type == 'combinedLandsat') {
    return imageCollection.map(function (image) {
      return indices.calculateL7L8Indices(image);
    });
  }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
exports.calculateL7L8Indices = calculateL7L8Indices;
exports.calculateL8ToaTasseledCapIndices = calculateL8ToaTasseledCapIndices;
exports.calculateS2Indices = calculateS2Indices;
exports.calculateS1Indices = calculateS1Indices;
exports.getIndices = getIndices;
