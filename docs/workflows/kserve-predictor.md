# KServe predictor extension for FuseML workflows

## Overview

The KServe predictor workflow step can be used to create and manage [KServe prediction services](https://kserve.github.io/website/) to serve input ML models as part of the execution of FuseML workflows. The KServe predictor is designed to work primarily with the following types of ML models that are trained and saved using the MLflow library:

- scikit-learn pickled models
- TensorFlow (saved_model) models
- ONNX models

The KServe predictor step expects a model URL to be supplied as input, pointing to the location in an MLflow artifact store where the model is stored. Currently, S3 is the only protocol supported for the MLflow artifact store back-end.

The predictor performs the following tasks:

- downloads the model locally from the MLflow artifact store
- if so instructed, it auto-detects the model format based on the information stored in the MLflow artifact store and decides which KServe predictor engine to use for it. Otherwise, it validates the model format against the type of predictor engine specified as input.
- it performs some minor conversion tasks required to adapt the input MLflow model directory layout to the one required by KServe
- it creates a KServe prediction service to serve the model
- finally, it registers the KServe prediction service with FuseML as an Application object. Information about the Application, such as the type and exposed inference URL can be retrieved at any time using the FuseML API and CLI.

## Using the KServe Predictor Step

TBD

