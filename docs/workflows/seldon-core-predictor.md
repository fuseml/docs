# Seldon Core predictor extension for FuseML workflows

## Overview

The Seldon Core predictor workflow step can be used to create and manage [Seldon Core prediction services](https://docs.seldon.io/projects/seldon-core/en/latest/) to serve input ML models as part of the execution of FuseML workflows. The Seldon Core predictor is designed to work primarily with the following types of ML models that are trained and saved using the MLflow library:

- scikit-learn pickled models
- TensorFlow (saved_model) models
- ONNX models

The Seldon Core predictor step expects a model URL to be supplied as input, pointing to the location in an MLflow artifact store where the model is stored. Currently, S3 is the only protocol supported for the MLflow artifact store back-end.

The predictor performs the following tasks:

- downloads the model locally from the MLflow artifact store
- if so instructed, it auto-detects the model format based on the information stored in the MLflow artifact store and decides which type of Seldon Core predictor server to use for it. Otherwise, it validates the model format against the type of predictor server specified as input.
- it performs some minor conversion tasks required to adapt the input MLflow model directory layout to the one required by Seldon Core
- it creates a Seldon Core prediction service to serve the model
- finally, it registers the Seldon Core prediction service with FuseML as an Application object. Information about the Application, such as the type and exposed inference URL can be retrieved at any time using the FuseML API and CLI.

## Using the Seldon Core Predictor Step

TBD

