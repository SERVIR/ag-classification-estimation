////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function randomForestParameterSpace(FeatureCollection, bandList, image, label, parameterSpace) {
    
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

function randomForest(FeatureCollection, bandList, image, label, parameters) {
  
  parameters = ee.Dictionary(parameters);
  print('parameters', parameters);
  
  var split = 0.75;
  var training = FeatureCollection.filter(ee.Filter.lt('random', split));
  var testing = FeatureCollection.filter(ee.Filter.gte('random', split));
  
  print('training samples', training);
  print('testing samples', testing);
  
  // Make a Random Forest classifier and train it.
  var trainedClassifier = ee.Classifier.smileRandomForest({
    numberOfTrees: parameters.get('numberOfTrees'),
    variablesPerSplit: parameters.get('variablesPerSplit'),
    minLeafPopulation: parameters.get('minLeafPopulation'),
    bagFraction: parameters.get('bagFraction'),
    maxNodes: parameters.get('maxNodes'),
    seed:7
  }).train({
    features: training,
    classProperty: label,
    inputProperties: bandList,
    subsamplingSeed: 7,
  });
  
  var dict_RF = trainedClassifier.explain();
  var variable_importance_RF = ee.Feature(null, ee.Dictionary(dict_RF).get('importance'));
  var chart_variable_importance_RF =
    ui.Chart.feature.byProperty(variable_importance_RF)
    .setChartType('ColumnChart')
    .setOptions({
    title: 'Random Forest Variable Importance',
    legend: {position: 'none'},
    hAxis: {title: 'Bands'},
    vAxis: {title: 'Importance'}
    });
  print("chart_variable_importance_RF", chart_variable_importance_RF);   
  
  
  // Classify the test FeatureCollection.
  var testingClassified = testing.classify(trainedClassifier);

  // Print the confusion matrix.
  var errorMatrix = testingClassified.errorMatrix(label, 'classification');
  print('Error Matrix', errorMatrix);
  print('Test accuracy: ', errorMatrix.accuracy());
  print('Test kappa: ', errorMatrix.kappa());
  print('recall', errorMatrix.producersAccuracy().get([1, 0]));
  print('precision', errorMatrix.consumersAccuracy().get([0, 1]));
  print('f1_score', errorMatrix.fscore().get([1]));
  
  return trainedClassifier;
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.randomForest = randomForest;

exports.randomForestParameterSpace = randomForestParameterSpace;
