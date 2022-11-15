var routine = require("users/biplovbhandari/Rice_Mapping_Bhutan:routine.js");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Implementation by Andreas Vollrath (ESA), inspired by Johannes Reiche (Wageningen)
function _radiometricTerrainCorrection (image) { 
  var imgGeom = image.geometry();
  var srtm = ee.Image('USGS/SRTMGL1_003').clip(imgGeom); // 30m srtm 
  var sigma0Pow = ee.Image.constant(10).pow(image.divide(10.0));
 
  // Article ( numbers relate to chapters) 
  // 2.1.1 Radar geometry 
  var theta_i = image.select('angle');
  var phi_i = ee.Terrain.aspect(theta_i)
    .reduceRegion(ee.Reducer.mean(), theta_i.get('system:footprint'), 1000)
    .get('aspect');
 
  // 2.1.2 Terrain geometry
  var alpha_s = ee.Terrain.slope(srtm).select('slope');
  var phi_s = ee.Terrain.aspect(srtm).select('aspect');
 
  // 2.1.3 Model geometry
  // reduce to 3 angle
  var phi_r = ee.Image.constant(phi_i).subtract(phi_s);
 
  // convert all to radians
  var phi_rRad = phi_r.multiply(Math.PI / 180);
  var alpha_sRad = alpha_s.multiply(Math.PI / 180);
  var theta_iRad = theta_i.multiply(Math.PI / 180);
  var ninetyRad = ee.Image.constant(90).multiply(Math.PI / 180);
 
  // slope steepness in range (eq. 2)
  var alpha_r = (alpha_sRad.tan().multiply(phi_rRad.cos())).atan();
 
  // slope steepness in azimuth (eq 3)
  var alpha_az = (alpha_sRad.tan().multiply(phi_rRad.sin())).atan();
 
  // local incidence angle (eq. 4)
  var theta_lia = (alpha_az.cos().multiply((theta_iRad.subtract(alpha_r)).cos())).acos();
  var theta_liaDeg = theta_lia.multiply(180 / Math.PI);
  // 2.2 
  // Gamma_nought_flat
  var gamma0 = sigma0Pow.divide(theta_iRad.cos());
  var gamma0dB = ee.Image.constant(10).multiply(gamma0.log10());
  var ratio_1 = gamma0dB.select('VV').subtract(gamma0dB.select('VH'));
 
  // Volumetric Model
  var nominator = (ninetyRad.subtract(theta_iRad).add(alpha_r)).tan();
  var denominator = (ninetyRad.subtract(theta_iRad)).tan();
  var volModel = (nominator.divide(denominator)).abs();
 
  // apply model
  var gamma0_Volume = gamma0.divide(volModel);
  var gamma0_VolumeDB = ee.Image.constant(10).multiply(gamma0_Volume.log10());
 
  // we add a layover/shadow maskto the original implmentation
  // layover, where slope > radar viewing angle 
  var alpha_rDeg = alpha_r.multiply(180 / Math.PI);
  var layover = alpha_rDeg.lt(theta_i);
 
  // shadow where LIA > 90
  var shadow = theta_liaDeg.lt(85);
 
  // calculate the ratio for RGB vis
  var ratio = gamma0_VolumeDB.select('VV').subtract(gamma0_VolumeDB.select('VH'));
 
  var output = gamma0_VolumeDB.addBands(ratio).addBands(alpha_r).addBands(phi_s).addBands(theta_iRad)
    .addBands(layover).addBands(shadow).addBands(gamma0dB).addBands(ratio_1);
 
  return image.addBands(
    output.select(['VV', 'VH'], ['VV', 'VH']),
    null,
    true
  );
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function radiometricTerrainCorrection (imageCollection) {
  return imageCollection.map(_radiometricTerrainCorrection);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// The RL speckle filter
function _refinedLee(image) {
  
  var startTime = image.get('system:time_start');
  
  var bandNames = image.bandNames();
  image = routine.dbToPower(image);
  
  var result = ee.ImageCollection(bandNames.map(function (b) {
    var img = image.select([b]);
    
    // img must be in natural units, i.e. not in dB!
    // Set up 3x3 kernels 
    var weights3 = ee.List.repeat(ee.List.repeat(1,3),3);
    var kernel3 = ee.Kernel.fixed(3,3, weights3, 1, 1, false);
  
    var mean3 = img.reduceNeighborhood(ee.Reducer.mean(), kernel3);
    var variance3 = img.reduceNeighborhood(ee.Reducer.variance(), kernel3);
  
    // Use a sample of the 3x3 windows inside a 7x7 windows to determine gradients and directions
    var sample_weights = ee.List([[0,0,0,0,0,0,0], [0,1,0,1,0,1,0],[0,0,0,0,0,0,0], [0,1,0,1,0,1,0], [0,0,0,0,0,0,0], [0,1,0,1,0,1,0],[0,0,0,0,0,0,0]]);
  
    var sample_kernel = ee.Kernel.fixed(7,7, sample_weights, 3,3, false);
  
    // Calculate mean and variance for the sampled windows and store as 9 bands
    var sample_mean = mean3.neighborhoodToBands(sample_kernel); 
    var sample_var = variance3.neighborhoodToBands(sample_kernel);
  
    // Determine the 4 gradients for the sampled windows
    var gradients = sample_mean.select(1).subtract(sample_mean.select(7)).abs();
    gradients = gradients.addBands(sample_mean.select(6).subtract(sample_mean.select(2)).abs());
    gradients = gradients.addBands(sample_mean.select(3).subtract(sample_mean.select(5)).abs());
    gradients = gradients.addBands(sample_mean.select(0).subtract(sample_mean.select(8)).abs());
  
    // And find the maximum gradient amongst gradient bands
    var max_gradient = gradients.reduce(ee.Reducer.max());
  
    // Create a mask for band pixels that are the maximum gradient
    var gradmask = gradients.eq(max_gradient);
  
    // duplicate gradmask bands: each gradient represents 2 directions
    gradmask = gradmask.addBands(gradmask);
  
    // Determine the 8 directions
    var directions = sample_mean.select(1).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(7))).multiply(1);
    directions = directions.addBands(sample_mean.select(6).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(2))).multiply(2));
    directions = directions.addBands(sample_mean.select(3).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(5))).multiply(3));
    directions = directions.addBands(sample_mean.select(0).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(8))).multiply(4));
    // The next 4 are the not() of the previous 4
    directions = directions.addBands(directions.select(0).not().multiply(5));
    directions = directions.addBands(directions.select(1).not().multiply(6));
    directions = directions.addBands(directions.select(2).not().multiply(7));
    directions = directions.addBands(directions.select(3).not().multiply(8));
  
    // Mask all values that are not 1-8
    directions = directions.updateMask(gradmask);
  
    // "collapse" the stack into a singe band image (due to masking, each pixel has just one value (1-8) in it's directional band, and is otherwise masked)
    directions = directions.reduce(ee.Reducer.sum());  
  
    //var pal = ['ffffff','ff0000','ffff00', '00ff00', '00ffff', '0000ff', 'ff00ff', '000000'];
    //Map.addLayer(directions.reduce(ee.Reducer.sum()), {min:1, max:8, palette: pal}, 'Directions', false);
  
    var sample_stats = sample_var.divide(sample_mean.multiply(sample_mean));
  
    // Calculate localNoiseVariance
    var sigmaV = sample_stats.toArray().arraySort().arraySlice(0,0,5).arrayReduce(ee.Reducer.mean(), [0]);
  
    // Set up the 7*7 kernels for directional statistics
    var rect_weights = ee.List.repeat(ee.List.repeat(0,7),3).cat(ee.List.repeat(ee.List.repeat(1,7),4));
  
    var diag_weights = ee.List([[1,0,0,0,0,0,0], [1,1,0,0,0,0,0], [1,1,1,0,0,0,0], 
      [1,1,1,1,0,0,0], [1,1,1,1,1,0,0], [1,1,1,1,1,1,0], [1,1,1,1,1,1,1]]);
  
    var rect_kernel = ee.Kernel.fixed(7,7, rect_weights, 3, 3, false);
    var diag_kernel = ee.Kernel.fixed(7,7, diag_weights, 3, 3, false);
  
    // Create stacks for mean and variance using the original kernels. Mask with relevant direction.
    var dir_mean = img.reduceNeighborhood(ee.Reducer.mean(), rect_kernel).updateMask(directions.eq(1));
    var dir_var = img.reduceNeighborhood(ee.Reducer.variance(), rect_kernel).updateMask(directions.eq(1));
  
    dir_mean = dir_mean.addBands(img.reduceNeighborhood(ee.Reducer.mean(), diag_kernel).updateMask(directions.eq(2)));
    dir_var = dir_var.addBands(img.reduceNeighborhood(ee.Reducer.variance(), diag_kernel).updateMask(directions.eq(2)));
  
    // and add the bands for rotated kernels
    for (var i=1; i<4; i++) {
      dir_mean = dir_mean.addBands(img.reduceNeighborhood(ee.Reducer.mean(), rect_kernel.rotate(i)).updateMask(directions.eq(2*i+1)));
      dir_var = dir_var.addBands(img.reduceNeighborhood(ee.Reducer.variance(), rect_kernel.rotate(i)).updateMask(directions.eq(2*i+1)));
      dir_mean = dir_mean.addBands(img.reduceNeighborhood(ee.Reducer.mean(), diag_kernel.rotate(i)).updateMask(directions.eq(2*i+2)));
      dir_var = dir_var.addBands(img.reduceNeighborhood(ee.Reducer.variance(), diag_kernel.rotate(i)).updateMask(directions.eq(2*i+2)));
    }
  
    // "collapse" the stack into a single band image (due to masking, each pixel has just one value in it's directional band, and is otherwise masked)
    dir_mean = dir_mean.reduce(ee.Reducer.sum());
    dir_var = dir_var.reduce(ee.Reducer.sum());
  
    // A finally generate the filtered value
    var varX = dir_var.subtract(dir_mean.multiply(dir_mean).multiply(sigmaV)).divide(sigmaV.add(1.0));
  
    b = varX.divide(dir_var);
  
    return dir_mean.add(b.multiply(img.subtract(dir_mean)))
      .arrayProject([0])
      // Get a multi-band image bands.
      .arrayFlatten([['sum']])
      .float();
  })).toBands().rename(bandNames);
  return routine.powerToDb(result).set('system:time_start', startTime);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function refinedLeeSpeckleFilter (imageCollection) {
  return imageCollection.map(_refinedLeeSpeckleFilter);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function leeCorrection (imageCollection) {
  var terrainCorrection_IC = imageCollection.map(function(image){
    var startTime = image.get('system:time_start');
    var imgGeom = image.geometry();
    var srtm = ee.Image('USGS/SRTMGL1_003').clip(imgGeom); // 30m srtm 
    var sigma0Pow = ee.Image.constant(10).pow(image.divide(10.0));

    // Article ( numbers relate to chapters) 
    // 2.1.1 Radar geometry 
    var theta_i = image.select('angle');
    var phi_i = ee.Terrain.aspect(theta_i)
        .reduceRegion(ee.Reducer.mean(), theta_i.get('system:footprint'), 1000)
        .get('aspect');

    // 2.1.2 Terrain geometry
    var alpha_s = ee.Terrain.slope(srtm).select('slope');
    var phi_s = ee.Terrain.aspect(srtm).select('aspect');

    // 2.1.3 Model geometry
    // reduce to 3 angle
    var phi_r = ee.Image.constant(phi_i).subtract(phi_s);

    // convert all to radians
    var phi_rRad = phi_r.multiply(Math.PI / 180);
    var alpha_sRad = alpha_s.multiply(Math.PI / 180);
    var theta_iRad = theta_i.multiply(Math.PI / 180);
    var ninetyRad = ee.Image.constant(90).multiply(Math.PI / 180);
  
    // slope steepness in range (eq. 2)
    var alpha_r = (alpha_sRad.tan().multiply(phi_rRad.cos())).atan();
  
   // slope steepness in azimuth (eq 3)
    var alpha_az = (alpha_sRad.tan().multiply(phi_rRad.sin())).atan();
  
    // local incidence angle (eq. 4)
    var theta_lia = (alpha_az.cos().multiply((theta_iRad.subtract(alpha_r)).cos())).acos();
    var theta_liaDeg = theta_lia.multiply(180 / Math.PI);
    // 2.2 
    // Gamma_nought_flat
    var gamma0 = sigma0Pow.divide(theta_iRad.cos());
    var gamma0dB = ee.Image.constant(10).multiply(gamma0.log10());
    var ratio_1 = gamma0dB.select('VV').subtract(gamma0dB.select('VH'));
  
    // Volumetric Model
    var nominator = (ninetyRad.subtract(theta_iRad).add(alpha_r)).tan();
    var denominator = (ninetyRad.subtract(theta_iRad)).tan();
    var volModel = (nominator.divide(denominator)).abs();
  
    // apply model
    var gamma0_Volume = gamma0.divide(volModel);
    var gamma0_VolumeDB = ee.Image.constant(10).multiply(gamma0_Volume.log10());
  
    // we add a layover/shadow maskto the original implmentation
    // layover, where slope > radar viewing angle 
    var alpha_rDeg = alpha_r.multiply(180 / Math.PI);
    var layover = alpha_rDeg.lt(theta_i);

    // shadow where LIA > 90
    var shadow = theta_liaDeg.lt(85);

    // calculate the ratio for RGB vis
    var ratio = gamma0_VolumeDB.select('VV').subtract(gamma0_VolumeDB.select('VH'));

    var output = gamma0_VolumeDB.addBands(ratio).addBands(alpha_r).addBands(phi_s).addBands(theta_iRad)
        .addBands(layover).addBands(shadow).addBands(gamma0dB).addBands(ratio_1);
        
    return ee.Image(output.select(['VV', 'VH'], ['VV', 'VH']).set('system:time_start', startTime));
  });

  return terrainCorrection_IC;
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function refinedLeeCorrection (terrainCorrection_IC) {

  function refinedLee(image) { 
    var startTime = image.get('system:time_start');

    
    var bandNames = image.bandNames();
    image = routine.dbToPower(image);
    
    var result = ee.ImageCollection(bandNames.map(function (b) {
      var img = image.select([b]);
      
      // img must be in natural units, i.e. not in dB!
      // Set up 3x3 kernels 
      var weights3 = ee.List.repeat(ee.List.repeat(1,3),3);
      var kernel3 = ee.Kernel.fixed(3,3, weights3, 1, 1, false);
    
      var mean3 = img.reduceNeighborhood(ee.Reducer.mean(), kernel3);
      var variance3 = img.reduceNeighborhood(ee.Reducer.variance(), kernel3);
    
      // Use a sample of the 3x3 windows inside a 7x7 windows to determine gradients and directions
      var sample_weights = ee.List([[0,0,0,0,0,0,0], [0,1,0,1,0,1,0],[0,0,0,0,0,0,0], [0,1,0,1,0,1,0], [0,0,0,0,0,0,0], [0,1,0,1,0,1,0],[0,0,0,0,0,0,0]]);
    
      var sample_kernel = ee.Kernel.fixed(7,7, sample_weights, 3,3, false);
    
      // Calculate mean and variance for the sampled windows and store as 9 bands
      var sample_mean = mean3.neighborhoodToBands(sample_kernel); 
      var sample_var = variance3.neighborhoodToBands(sample_kernel);
    
      // Determine the 4 gradients for the sampled windows
      var gradients = sample_mean.select(1).subtract(sample_mean.select(7)).abs();
      gradients = gradients.addBands(sample_mean.select(6).subtract(sample_mean.select(2)).abs());
      gradients = gradients.addBands(sample_mean.select(3).subtract(sample_mean.select(5)).abs());
      gradients = gradients.addBands(sample_mean.select(0).subtract(sample_mean.select(8)).abs());
    
      // And find the maximum gradient amongst gradient bands
      var max_gradient = gradients.reduce(ee.Reducer.max());
    
      // Create a mask for band pixels that are the maximum gradient
      var gradmask = gradients.eq(max_gradient);
    
      // duplicate gradmask bands: each gradient represents 2 directions
      gradmask = gradmask.addBands(gradmask);
    
      // Determine the 8 directions
      var directions = sample_mean.select(1).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(7))).multiply(1);
      directions = directions.addBands(sample_mean.select(6).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(2))).multiply(2));
      directions = directions.addBands(sample_mean.select(3).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(5))).multiply(3));
      directions = directions.addBands(sample_mean.select(0).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(8))).multiply(4));
      // The next 4 are the not() of the previous 4
      directions = directions.addBands(directions.select(0).not().multiply(5));
      directions = directions.addBands(directions.select(1).not().multiply(6));
      directions = directions.addBands(directions.select(2).not().multiply(7));
      directions = directions.addBands(directions.select(3).not().multiply(8));
    
      // Mask all values that are not 1-8
      directions = directions.updateMask(gradmask);
    
      // "collapse" the stack into a singe band image (due to masking, each pixel has just one value (1-8) in it's directional band, and is otherwise masked)
      directions = directions.reduce(ee.Reducer.sum());  
    
      //var pal = ['ffffff','ff0000','ffff00', '00ff00', '00ffff', '0000ff', 'ff00ff', '000000'];
      //Map.addLayer(directions.reduce(ee.Reducer.sum()), {min:1, max:8, palette: pal}, 'Directions', false);
    
      var sample_stats = sample_var.divide(sample_mean.multiply(sample_mean));
    
      // Calculate localNoiseVariance
      var sigmaV = sample_stats.toArray().arraySort().arraySlice(0,0,5).arrayReduce(ee.Reducer.mean(), [0]);
    
      // Set up the 7*7 kernels for directional statistics
      var rect_weights = ee.List.repeat(ee.List.repeat(0,7),3).cat(ee.List.repeat(ee.List.repeat(1,7),4));
    
      var diag_weights = ee.List([[1,0,0,0,0,0,0], [1,1,0,0,0,0,0], [1,1,1,0,0,0,0], 
        [1,1,1,1,0,0,0], [1,1,1,1,1,0,0], [1,1,1,1,1,1,0], [1,1,1,1,1,1,1]]);
    
      var rect_kernel = ee.Kernel.fixed(7,7, rect_weights, 3, 3, false);
      var diag_kernel = ee.Kernel.fixed(7,7, diag_weights, 3, 3, false);
    
      // Create stacks for mean and variance using the original kernels. Mask with relevant direction.
      var dir_mean = img.reduceNeighborhood(ee.Reducer.mean(), rect_kernel).updateMask(directions.eq(1));
      var dir_var = img.reduceNeighborhood(ee.Reducer.variance(), rect_kernel).updateMask(directions.eq(1));
    
      dir_mean = dir_mean.addBands(img.reduceNeighborhood(ee.Reducer.mean(), diag_kernel).updateMask(directions.eq(2)));
      dir_var = dir_var.addBands(img.reduceNeighborhood(ee.Reducer.variance(), diag_kernel).updateMask(directions.eq(2)));
    
      // and add the bands for rotated kernels
      for (var i=1; i<4; i++) {
        dir_mean = dir_mean.addBands(img.reduceNeighborhood(ee.Reducer.mean(), rect_kernel.rotate(i)).updateMask(directions.eq(2*i+1)));
        dir_var = dir_var.addBands(img.reduceNeighborhood(ee.Reducer.variance(), rect_kernel.rotate(i)).updateMask(directions.eq(2*i+1)));
        dir_mean = dir_mean.addBands(img.reduceNeighborhood(ee.Reducer.mean(), diag_kernel.rotate(i)).updateMask(directions.eq(2*i+2)));
        dir_var = dir_var.addBands(img.reduceNeighborhood(ee.Reducer.variance(), diag_kernel.rotate(i)).updateMask(directions.eq(2*i+2)));
      }
    
      // "collapse" the stack into a single band image (due to masking, each pixel has just one value in it's directional band, and is otherwise masked)
      dir_mean = dir_mean.reduce(ee.Reducer.sum());
      dir_var = dir_var.reduce(ee.Reducer.sum());
    
      // A finally generate the filtered value
      var varX = dir_var.subtract(dir_mean.multiply(dir_mean).multiply(sigmaV)).divide(sigmaV.add(1.0));
    
      var b = varX.divide(dir_var);
    
      return dir_mean.add(b.multiply(img.subtract(dir_mean)))
        .arrayProject([0])
        // Get a multi-band image bands.
        .arrayFlatten([['sum']]).float();
    })).toBands().rename(bandNames);

    return routine.powerToDb(ee.Image(result)).set('system:time_start', startTime);
  }

  return terrainCorrection_IC.map(refinedLee);
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// exports.terrainCorrection = terrainCorrection
// exports.leeCorrection = leeCorrection;
// exports.refinedLeeCorrection = refinedLeeCorrection;
exports.radiometricTerrainCorrection = radiometricTerrainCorrection;
exports.refinedLeeSpeckleFilter = refinedLeeSpeckleFilter;

