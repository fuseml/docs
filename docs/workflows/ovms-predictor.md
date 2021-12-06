# OpenVINO Model Server predictor extension for FuseML workflows

## Overview

The OVMS predictor workflow step can be used to create and manage [OpenVINO Model Server inference servers](https://docs.openvino.ai/latest/openvino_docs_ovms.html) to serve input ML models as part of the execution of FuseML workflows. The OVMS predictor only accepts models in IR (Intermediate Representation) format as input. The [OVMS converter](ovms-converter.md) workflow extension can be used to convert models to IR format.

The OVMS predictor step expects a model URL to be supplied as input, pointing to the location in a remote artifact store where the model is stored. The protocols supported for the remote artifact store are the same as [those supported by the OVMS implementation](https://github.com/openvinotoolkit/model_server/tree/v2021.3/deploy#model-repository): 

- AWS S3 or S3 compatible
- GCS (authentication credentials not supported)
- Azure Blob Storage (authentication credentials not supported)

The predictor performs the following tasks:

- it creates an OVMS prediction service instance to serve the model, and an Istio virtualservice that exposes the prediction service
- it registers the OVMS prediction service with FuseML as an Application object. Information about the Application, such as the type and exposed inference URL can be retrieved at any time using the FuseML API and CLI.

The OVMS predictor has a single output: the URL where the prediction service can be accessed to process inference requests.

The Dockerfile and associated scripts that implement the OVMS predictor container image are available in the [FuseML extensions repository](https://github.com/fuseml/extensions/tree/release-0.3/images/inference-services/ovms).

The OVMS predictor is featured in a number of FuseML tutorials, such as:

- [Benchmarking ML Models on Intel CPUs with Intel OpenVINO](../tutorials/openvino-mlflow.md)
- [FuseML Extension Development Use-Case - OpenVINO](../tutorials/openvino-extensions.md)

## Using the OVMS Predictor Step

The workflow example below shows how to create a FuseML workflow that uses the OVMS predictor step to serve a model from a remote artifact store. The model is already in IR (Intermediate Representation) format. For models that are not in IR format, the [OVMS converter step](ovms-converter.md) can be used as part of the same workflow to convert the model before it is served with OVMS.

```yaml
name: ovms-workflow
description: |
  Workflow that takes in a URL containing one of more OVMS models in IR format
  then uses OVMS to deploy a prediction service that can be used to run predictions
  against the model.
inputs:
  - name: model
    description: URL where an IR model is stored
    type: string
    default: gs://ovms-public-eu/resnet50-binary
outputs:
  - name: prediction-url
    description: "The URL where the exposed prediction service endpoint can be contacted to run predictions."
    type: string
steps:
  - name: ovms-predictor
    image: ghcr.io/fuseml/ovms-predictor:v0.3.0
    inputs:
      - name: model
        value: '{{ inputs.model }}'
      - name: app_name
        value: resnet50-ovms
      - name: resources
        value: '{"requests": {"cpu": 1}}'
      - name: verbose
        value: false
    outputs:
      - name: prediction-url
    extensions:
      - name: ovms-operator
        service_resource: ovms-operator
```

Aside from the mandatory `model` input parameter that needs to be a URL pointing to the location of a trained ML model in IR format saved in an artifact store, the OVMS predictor workflow step also accepts the following optional input parameters that can be used to customize how the prediction service is created and updated:

- `model_name`: the name used to identify the model in the OVMS prediction API (default value is: `default`)
- `ovms_image_tag`: the version of the OVMS container image to use (default value is: `2021.4.1`)
- `loglevel`, `nireq`, `plugin_config`, `batch_size`, `shape`, `target_device` and `layout` are parameters that are mapped to the corresponding OVMS deployment parameters. See the [OVMS documentation](https://github.com/openvinotoolkit/model_server/tree/main/deploy#helm-options-references) for a description of these parameters.
- `replicas`: number of replicas for the OVMS prediction service
- `resources`: can be used to configure Kubernetes resource requests and limits for the OVMS prediction service
- `prediction_type`: determines [the type of TensorFlow Serving prediction requests](https://www.tensorflow.org/tfx/serving/api_rest#classify_and_regress_api) that the returned prediction URL is made for: `classify`, `regress` or `predict`. The default value is `predict`.
- `app_name`: use this to explicitly set the name of the FuseML application used to represent the OVMS prediction service. Its value also determines the prediction URL as well as the names of the Kubernetes resources created by the OVMS predictor. If not set explicitly, the application name is constructed by combining the workflow name with the name of an input codeset name and project, if one is provided as input. In the absence of an input codeset, the application name is generated by concatenating the workflow name with a randomly generated string.

    !!! note

        Choosing a value for the `app_name` parameter should be done with care, as it is used to uniquely identify a FuseML application and its associated Kubernetes resources (i.e. the name of the OVMS prediction service, prediction URL etc.). It can lead to a situation where the same OVMS prediction service is managed by more than one FuseML workflows. In this case, the results can be unpredictable, because multiple workflows will compete over managing the same application.
        
    !!! warning
    
        If an `app_name` value is not provided and the predictor step doesn't receive an input codeset, the generated application name will be random, which means that every workflow run will create a new application and prediction service. This should be avoided, as it easily lead to resource exhaustion.

- `resources_limits` - use to set the Kubernetes resource limits to allocate hardware resources to the prediction service. E.g:

    ```yaml
         - name: resources_limits
           value: '{nvidia.com/gpu: 1}'
    ```

- `verbose` - set to `true` to enable verbose logging in the predictor workflow step (default is `false`).

The OVMS runtime workflow step can also take in some environment variables that are used to configure the credentials of the remote artifact store where the input ML model is stored:

!!! note

    Some of these environment variables contain sensitive data, such as keys and passwords and should not be explicitly configured as workflow step env vars. Instead, they should be registered in the [FuseML Extension Registry](../extensions/extension-registry.md) and only referenced in the FuseML workflows as [extension requirements](../extensions/extension-registry.md#referencing-extensions-in-workflows).

- `S3_ENDPOINT` - required when the ML model is stored in a custom S3 compatible artifact store such as minio
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` - credentials for the AWS S3 and S3-compatible artifact store


