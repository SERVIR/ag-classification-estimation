////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function randomForest(FeatureCollection, bandList, image, label, parameterSpace) {
    
  var split = 0.75;
  var training = FeatureCollection.filter(ee.Filter.lt('random', split));
  var testing = FeatureCollection.filter(ee.Filter.gte('random', split));
  
  print('training samples', training.size());
  
  print('Training Rice Samples', training.filter(ee.Filter.eq(label, 1)).size());
  print('Training Non-rice samples', training.filter(ee.Filter.eq(label, 0)).size());
  print('TrainingRice: Non-rice ratio', training.filter(ee.Filter.eq(label, 1)).size().divide(training.filter(ee.Filter.eq(label, 0)).size()));


  // Generate the histogram data.
  var trainingHistogram = ui.Chart.feature.histogram({
    features: training,
    property: label,
    maxBuckets: 2,
  });
  trainingHistogram.setOptions({
    title: 'Histogram of Training Points Using LTE2'
  });
  
  print(trainingHistogram);

  
  print();
  print('testing samples', testing.size());

  print('Testing Rice Samples', testing.filter(ee.Filter.eq(label, 1)).size());
  print('Testing Non-rice samples', testing.filter(ee.Filter.eq(label, 0)).size());
  print('Testing: Non-rice ratio', testing.filter(ee.Filter.eq(label, 1)).size().divide(testing.filter(ee.Filter.eq(label, 0)).size()));

  
  parameterSpace = ee.Dictionary(parameterSpace);
  var numberOfTrees = ee.List(parameterSpace.get('numberOfTrees'));
  var variablesPerSplit = ee.List(parameterSpace.get('variablesPerSplit'));
  var minLeafPopulation = ee.List(parameterSpace.get('minLeafPopulation'));
  var bagFraction = ee.List(parameterSpace.get('bagFraction'));
  var maxNodes = ee.List(parameterSpace.get('maxNodes'));
  
  var randomForests = numberOfTrees.map(function (_numberOfTrees) {
    
    return variablesPerSplit.map(function (_variablesPerSplit) {
      
      return minLeafPopulation.map(function (_minLeafPopulation) {
        
        return bagFraction.map(function (_bagFraction) {
          
          return maxNodes.map(function (_maxNodes) {
            
            var rfModel = ee.Classifier.smileRandomForest({
              numberOfTrees: _numberOfTrees,
              variablesPerSplit: _variablesPerSplit,
              minLeafPopulation: _minLeafPopulation,
              bagFraction: _bagFraction,
              maxNodes: _maxNodes,
              seed: 7,
            }).train({
              features: training,
              classProperty: label,
              inputProperties: bandList,
              subsamplingSeed: 7,
            });
            
            var explainRF = rfModel.explain();
            var importanceRF = ee.Dictionary(explainRF).get('importance');
  
            // Classify the test FeatureCollection.
            var testingClassified = testing.classify(rfModel);
          
            // Confusion matrix.
            var errorMatrix = testingClassified.errorMatrix(label, 'classification');
            var testAcc = errorMatrix.accuracy();
            var testKappa = errorMatrix.kappa();
            var testRecallProducerAccuracy = errorMatrix.producersAccuracy().get([1, 0]);
            var testPrecisionConsumerAccuracy = errorMatrix.consumersAccuracy().get([0, 1]);
            var f1 = errorMatrix.fscore().get([1]);

            return ee.Feature(null, {
              'model': 'RandomForest',
              'numberOfTrees': _numberOfTrees,
              'variablesPerSplit': _variablesPerSplit,
              'minLeafPopulation': _minLeafPopulation,
              'bagFraction': _bagFraction,
              'maxNodes': _maxNodes,
              'importance': importanceRF,
              'testAccuracy': testAcc,
              'testKappa': testKappa,
              'precision': testPrecisionConsumerAccuracy,
              'recall': testRecallProducerAccuracy,
              'f1_score': f1,
            });
          
          });
          
        });
        
      });
      
    });
    
  });
  
  return randomForests;

}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.randomForest = randomForest;
