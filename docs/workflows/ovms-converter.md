# OpenVINO Model Server converter extension for FuseML workflows

## Overview

The OVMS converter workflow step can be used to convert input ML models to the IR (Intermediate Representation) format supported by the [OpenVINO Model Server](https://docs.openvino.ai/latest/openvino_docs_ovms.html). It is normally used in combination with the [OVMS predictor workflow step](ovms-predictor.md) in FuseML workflows to serve input ML models with the OpenVINO Model Server. The OVMS converter workflow extension is implemented using the [OpenVINO Model Optimizer](https://docs.openvino.ai/latest/openvino_docs_MO_DG_Deep_Learning_Model_Optimizer_DevGuide.html).

The OVMS converter step expects a model URL to be supplied as input, pointing to the location in a remote model store where the model is stored. The protocols currently supported for the remote artifact store are: 

- AWS S3 or S3 compatible
- GCS
- plain HTTP/HTTPs remote location

The model formats of the input models that the OVMS converter is able to convert into IR format are:

- TensorFlow (saved_model) models
- ONNX models

The converter performs the following tasks:

- downloads the model locally from the remote artifact store.
- if the model is stored in an MLflow remote store and if so instructed, it auto-detects the format of the input model based on the information stored in the MLflow artifact store.
- it converts/optimizes the model using the provided OpenVINO Model Optimizer tools.
- it uploads the converted model to an artifact store. It can be the same artifact store as the original model, or a different one.

The OVMS converter has a single output: the URL where the converted ML model is stored.

The Dockerfile and associated scripts that implement the OVMS converter container image are available in the [FuseML extensions repository](https://github.com/fuseml/extensions/tree/main/images/converters/ovms).

The OVMS converter is featured in a number of FuseML tutorials, such as:

- [Benchmarking ML Models on Intel CPUs with Intel OpenVINO](../tutorials/openvino-mlflow.md)
- [FuseML Extension Development Use-Case - OpenVINO](../tutorials/openvino-extensions.md)

## Using the OVMS Converter Step

The following is a step in a FuseML workflow that is used to convert a model stored in an MLFlow artifact store to the IR format supported by the OpenVINO Model Server.

```yaml
steps:
  [...]
  - name: converter
    image: ghcr.io/fuseml/ovms-converter:latest
    inputs:
      - name: input_model
        value: '{{ steps.trainer.outputs.mlflow-model-url }}'
      - name: output_model
        value: '{{ steps.trainer.outputs.mlflow-model-url }}/ovms'
      - name: input_format
        value: '{{ inputs.model-format }}'
      - name: batch
        value: 1 # OpenVINO cannot work with undefined input dimensions
      - name: extra_args
        # Disabling the implicit transpose transformation allows the input model shape
        # to be consistent with those used by other serving platforms
        value: "--disable_nhwc_to_nchw"
    outputs:
      - name: ovms-model-url
    extensions:
      - name: mlflow-store
        product: mlflow
        service_resource: s3
    env:
      - name: S3_ENDPOINT
        value: '{{ extensions.mlflow-store.cfg.MLFLOW_S3_ENDPOINT_URL }}'
  [...]
```

Aside from the mandatory input `input_model` parameter that needs to be a URL pointing to the location of a trained ML model saved in a remote artifact store or object storage service, the OVMS converter workflow step also accepts the following optional input parameters that can be used to customize how the input ML model is converted and stored:

- `input_format`: specifies the format for the input ML model. This can take the following values:

    - if set to `auto` (default), the OVMS converter expects the model to be stored in an MLflow artifact store. It will attempt to automatically detect the model format from the MLflow metadata present in the artifact store.
    - `tensorflow.saved_model`: TensorFlow saved_model model format.
    - `onnx`: ONNX model format

- `input_shape`, `scale`, `reverse_input_channels`, `log_level`, `input`, `output`, `mean_values`, `scale_values`, `data_type`, `batch` and `static_shape` correspond to [OpenVINO Model Optimizer generic conversion parameters](https://docs.openvino.ai/latest/openvino_docs_MO_DG_prepare_model_convert_model_Converting_Model.html#general-conversion-parameters) that can be configured to customize the conversion process.
- `extra_args`: additional command line arguments that are passed to the OpenVINO Model Optimizer utility.

The OVMS converter workflow step can also take in some environment variables that are used to configure the credentials of the remote artifact store(s) where the input and output ML models are stored:

!!! note

    Some of these environment variables contain sensitive data, such as keys and passwords and should not be explicitly configured as workflow step env vars. Instead, they should be registered in the [FuseML Extension Registry](../extensions/extension-registry.md) and only referenced in the FuseML workflows as [extension requirements](../extensions/extension-registry.md#referencing-extensions-in-workflows).

- `S3_ENDPOINT` - required when the ML model is stored in a custom S3 compatible artifact store such as minio
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` - credentials for the AWS S3 and S3-compatible artifact store
- `OUTPUT_S3_ENDPOINT` - required when the output ML model must be uploaded in an S3 artifact store that is different from the input artifact store
- `OUTPUT_AWS_ACCESS_KEY_ID` and `OUTPUT_AWS_SECRET_ACCESS_KEY` - credentials for the S3 output artifact store, when different than the input artifact store

Observe how the `s3-storage` extension is used in the `converter` step to reference an MLflow artifact store backend registered in the [FuseML Extension Registry](../extensions/extension-registry.md). This avoids having to configure credentials and other environment variables explicitly in the FuseML workflow. The FuseML workflow engine automatically resolves these references to matching records available in the FuseML Extension Registry and passes the configuration entries in the extension records as environment variables to the workflow step container (i.e. variables like `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`). Other environment variables need to be explicitly mapped to the workflow step container using the `env` parameter (i.e. `MLFLOW_S3_ENDPOINT_URL` is mapped to `S3_ENDPOINT`).

