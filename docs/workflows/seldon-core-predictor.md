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
- it uploads the converted model to the same artifact store as the original model, in a different location (the converted model is stored in a subdirectory of the original model's location)
- it creates a Seldon Core prediction service to serve the model
- finally, it registers the Seldon Core prediction service with FuseML as an Application object. Information about the Application, such as the type and exposed inference URL can be retrieved [through the FuseML CLI](../cli.md#applications) or [through the REST API](../api.md).

The Seldon Core predictor has a single output: the URL where the prediction service can be accessed to process inference requests.

The Dockerfile and associated scripts that implement the Seldon Core predictor container image are available in the [FuseML extensions repository](https://github.com/fuseml/extensions/tree/main/images/inference-services/seldon-core).

The Seldon Core predictor is featured in a number of FuseML tutorials, such as:

- [Logistic Regression with MLFlow & Seldon-Core](../tutorials/seldon-core.md)
- [Benchmarking ML Models on Intel CPUs with Intel OpenVINO](../tutorials/openvino-mlflow.md)
## Using the Seldon Core Predictor Step


The recommended way to use the Seldon Core predictor step in a FuseML workflow is to have an MLflow trainer step part of the same workflow and to reference its output model as input to the Seldon Core predictor, as shown in the example below.

```yaml
name: mlflow-e2e
description: |
  End-to-end pipeline template that takes in an MLFlow compatible codeset,
  runs the MLFlow project to train a model, then uses Seldon Core to create prediction
  service that can be used to run predictions against the model.
inputs:
  - name: mlflow-codeset
    description: an MLFlow compatible codeset
    type: codeset
  - name: predictor
    description: type of predictor engine
    type: string
    default: auto
outputs:
  - name: prediction-url
    description: "The URL where the exposed prediction service endpoint can be contacted to run predictions."
    type: string
steps:
  - name: builder
    image: ghcr.io/fuseml/mlflow-builder:latest
    inputs:
      - name: mlflow-codeset
        codeset:
          name: "{{ inputs.mlflow-codeset }}"
          path: /project
    outputs:
      - name: image
  - name: trainer
    image: "{{ steps.builder.outputs.image }}"
    inputs:
      - name: mlflow-codeset
        codeset:
          name: "{{ inputs.mlflow-codeset }}"
          path: "/project"
    outputs:
      - name: mlflow-model-url
    extensions:
      - name: mlflow-tracking
        product: mlflow
        service_resource: mlflow-tracking
      - name: mlflow-store
        product: mlflow
        service_resource: s3
  - name: predictor
    image: ghcr.io/fuseml/seldon-core-predictor:latest
    inputs:
      - name: model
        value: '{{ steps.trainer.outputs.mlflow-model-url }}'
      - name: predictor
        value: '{{ inputs.predictor }}'
      - name: app_name
        value: "{{ inputs.mlflow-codeset.name }}-{{ inputs.mlflow-codeset.project }}"
    outputs:
      - name: prediction-url
    extensions:
      - name: mlflow-s3-store
        product: mlflow
        service_resource: s3
      - name: seldon-core
        service_resource: seldon-core-api
```

Aside from the mandatory input `model` parameter that needs to be a URL pointing to the location of a trained ML model saved in an MLflow artifact store, the Seldon Core predictor workflow step also accepts the following optional input parameters that can be used to customize how the prediction service is created and updated:

- `predictor`: this can be used to configure the type of Seldon Core predictor engine used for the prediction service. This can take the following values:

    - `auto`: if this value is used, the Seldon Core predictor will automatically detect the type of model from the MLflow metadata present in the artifact store and use the appropriate predictor engine: TensorFlow Serving for TensorFlow and Keras models and the the scikit-learn predictor for scikit-learn pickled models
    - `tensorflow`: use to serve models with the TensorFlow Serving engine. Only works with models trained with TensorFlow or Keras and saved using the TensorFlow saved_model model format.
    - `sklearn`: use to serve models trained with scikit-learn and saved in the sklearn pickled model format
    - `triton`: use the NVidia Triton prediction back-end. Works with models trained with TensorFlow or Keras and saved using the TensorFlow saved_model format and with models in ONNX format.

- `app_name`: use this to explicitly set the name of the FuseML application used to represent the Seldon Core prediction service. Its value also determines the prediction URL as well as the names of the Kubernetes resources created by the Seldon Core predictor. Our example uses an expression to dynamically set the `app_name` parameter to the name and project of the MLflow codeset used as workflow input. If not set, the application name is constructed by combining the workflow name with the name of an input codeset name and project, if one is provided as input. In the absence of an input codeset, the application name is generated by concatenating the workflow name with a randomly generated string.

    !!! note

        Choosing a value for the `app_name` parameter should be done with care, as it is used to uniquely identify a FuseML application and its associated Kubernetes resources (i.e. the name of the Seldon Core prediction service, prediction URL etc.). It can lead to a situation where the same Seldon Core prediction service is managed by more than one FuseML workflows. In this case, the results can be unpredictable, because multiple workflows will compete over managing the same application.
        
    !!! warning
    
        If an `app_name` value is not provided and the predictor step doesn't receive an input codeset, the generated application name will be random, which means that every workflow run will create a new application and prediction service. This should be avoided, as it easily lead to resource exhaustion.

- `verbose` - set to `true` to enable verbose logging in the predictor workflow step (default is `false`).

The Seldon Core runtime workflow step can also take in some environment variables that are used to configure the credentials of the remote MLflow artifact store where the input ML model is stored:

!!! note

    Some of these environment variables contain sensitive data, such as keys and passwords and should not be explicitly configured as workflow step env vars. Instead, they should be registered in the [FuseML Extension Registry](../extensions/extension-registry.md) and only referenced in the FuseML workflows as [extension requirements](../extensions/extension-registry.md#referencing-extensions-in-workflows).

- `MLFLOW_S3_ENDPOINT_URL` - required when the ML model is stored in a custom S3 compatible artifact store such as minio
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` - credentials for the AWS S3 and S3-compatible artifact store

Observe how the `mlflow-s3-store` extension requirement is used in the `predictor` step to reference an MLflow artifact store backend registered in the [FuseML Extension Registry](../extensions/extension-registry.md). This avoids having to configure credentials and other environment variables explicitly in the FuseML workflow. The FuseML workflow engine automatically resolves these references to matching records available in the FuseML Extension Registry and passes the configuration entries in the extension records as environment variables to the workflow step container (i.e. variables like `MLFLOW_S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`).

