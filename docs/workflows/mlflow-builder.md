# MLflow runtime environment builder extension for FuseML workflows

## Overview

The [MLFlow Project format](https://www.mlflow.org/docs/latest/projects.html) is a flexible way of configuring how to package and execute python ML code in a reproducible way. It allows developers to declaratively specify python package requirements and code execution entry points.

The MLflow builder workflow step leverages the MLflow Project conventions to automate building MLflow runtime environments: container images used for the execution of MLflow augmented python code within a FuseML workflow. The MLflow builder works with any codeset that meets the following requirements and conventions:

- an `MLproject` file is present the codeset's root directory
- python requirements are specified using a `conda.yaml` file or a `requirements.txt` file, also present in the codeset's root directory
- the `MLproject` file describes one or more entry points for the codeset's python code, as well as a list of parameters that are passed to the entry points. The entry points are specified using the `entry_points` key in the `MLproject` file. At a minimum, a `main` entrypoint is required, which will be used as the default entry point when executing the codeset code, unless overridden by workflow input parameters. An example `MLproject` file and a corresponding `conda.yaml` file are shown below:

    ```yaml
    name: my_keras_model
    conda_env: conda.yaml
    entry_points:
      main:
        parameters:
          epochs: {type: int, default: 2}
          batch_size: {type: int, default: 64}
        command: "python train.py --epochs={epochs} --batch_size={batch_size}"
    ```

    ```yaml
    name: my_test_env
    channels:
      - conda-forge
    dependencies:
      - python=3.6
      - pip
      - pip:
        - mlflow
        - tensorflow==2.0.0
    ```

The MLflow builder has a single output: the container registry repository and the image tag where the built MLflow environment container image is stored. This output can be used in subsequent workflow steps to run the MLflow code from the same codeset as the one used as input. The most common use for the resulted container image is executing code that trains and validates ML models. For this reason, the output container image is often referred to as a "trainer" workflow step.

The Dockerfile and associated scripts that implement the MLflow builder container image are available in the [FuseML extensions repository](https://github.com/fuseml/extensions/tree/main/images/builders/mlflow).

The MLflow builder is featured in a number of FuseML tutorials, such as:

- [Logistic Regression with MLFlow & KServe](../tutorials/kserve-basic.md)
- [Logistic Regression with MLFlow & Seldon-Core](../tutorials/seldon-core.md)
- [Training & Serving ML Models on GPU with NVIDIA Triton](../tutorials/kserve-triton-gpu.md)
- [Benchmarking ML Models on Intel CPUs with Intel OpenVINO](../tutorials/openvino-mlflow.md)

## Using the MLflow Builder Step

Here is an example of a FuseML workflow that builds an MLflow runtime environment container image out of an MLflow compatible codeset and returns the location where it's stored in the internal FuseML container registry:

```yaml
name: build_mlflow_env
description: |
  Example workflow that builds a MLflow environment container image
  out of an MLflow compatible codeset."
inputs:
  - name: mlflow-codeset
    description: an MLFlow compatible codeset
    type: codeset
outputs:
  - name: mlflow-runtime-image
    description: "The location of the built MLflow runtime environment container image."
    type: string
steps:
  - name: builder
    image: ghcr.io/fuseml/mlflow-builder:latest
    inputs:
      - name: mlflow-codeset
        codeset:
          name: '{{ inputs.mlflow-codeset }}'
          path: /project
    outputs:
      - name: mlflow-runtime-image
```

Aside from the mandatory codeset input, the MLflow builder workflow step also accepts the following optional input parameters that can be used to customize how the ML python environment container image is being built and published:

- `registry` - the container registry hostname that is used by the builder step when pushing the built MLflow environment image to the container registry. The default value is `registry.fuseml-registry`, which points to the FuseML builtin container registry. 
- `pull_registry` - the container registry hostname used by consumers that need to pull the built MLflow environment image (e.g. the container runtime instances running on the Kubernetes cluster nodes where the FuseML workflow is executed). In most cases, this is the same as the `registry` parameter. However, sometimes, this value needs to be different than `registry`, for example when the container registry is accessed through different endpoints by the builder step and by the kubernetes cluster itself. In particular, when using the default internal FuseML registry, we need to reference the repository using the node's localhost address (see https://github.com/fuseml/fuseml/issues/65). The default value is `127.0.0.1:30500`, which is how the FuseML builtin container registry is exposed internally to the Kubernetes cluster. If not set, or set to an empty value, the `registry` parameter value will be used instead.
- `repository` - the container registry repository name that is used by the builder step when pushing the built MLflow environment image to the container registry. The default value is `mlflow/trainer`.
- `miniconda_version` - the version (tag) of the `continuumio/miniconda3` base container image to use when building MLflow environment container images based on conda (i.e. when a `conda.yaml` file is included in the codeset). If not specified, the builder will default to `4.10.3`.
- `base_image` - the base image to use when building MLflow environment container images based on pip (i.e. when a pip `requirements.txt` file is included in the codeset). If not specified, the builder will default to `python:3.6.13`.
- `verbose` - set to `true` to enable verbose logging in the builder workflow step (default is `false`).
- `compressed_caching` - use this parameter to control the compressed caching feature used by [Kaniko](https://github.com/GoogleContainerTools/kaniko) when building container images. Compressed caching is set to false by default to reduce memory usage with larger images and avoid OOM problems. Set this flag to true to enable compressed caching and reduce the image build time.


## Using the MLflow Runtime Environment Step

The container image built by the MLflow builder workflow step can itself be used as a FuseML workflow step. The same codeset used as input for the MLflow builder must be supplied as input to the MLflow runtime environment. The MLflow runtime environment workflow step executes the MLflow code present in the codeset and returns the URL where one or more MLflow artifacts are stored during the execution. Depending on how the MLflow code is configured to run, this can be a local path or a URL pointing to a remote MLflow artifact store.

The MLflow runtime environment container image also accepts the following optional workflow input parameters that can be used to customize how the MLflow code is executed:

- `mlflow_experiment` - the experiment ID to use when running the MLflow code. If not specified, the experiment name is derived from the codeset name and project used as input
- `mlflow_entrypoint` - controls which of the MLflow entrypoints configured in the `MLproject` file used to build the image is executed. If not specified, `main` is used as the default entrypoint.
- `mlflow_entrypoint_args` - space or comma-separated list of additional MLflow run entrypoint arguments in the form `name=value`. These arguments are passed to the MLflow entrypoint as keyword arguments. For example, a value of `epochs=2,batch_size=64` will pass the arguments `epochs=2` and `batch_size=64` to the MLflow entrypoint.
- `mlflow_artifact_path` - sub-path under the MLflow artifact repository that should be returned as output. By default, the `model` sub-directory is returned, because this is where MLflow stores the ML models.
- `verbose` - set to `true` to enable verbose logging in the MLflow runtime step (default is `false`).

The MLflow runtime workflow step can also take in additional environment variables that are passed transparently to the MLflow runtime and used to configure how the MLflow runtime can access a remote MLflow tracking server and artifact store. For more information on what variables are available and how they can be used, please refer to the [relevant section in the official MLflow documentation](https://www.mlflow.org/docs/latest/tracking.html#logging-to-a-tracking-server). Only a subset of the available variables are listed here:

!!! note

    Some of these environment variables contain sensitive data, such as keys and passwords and should not be explicitly configured as workflow step env vars. Instead, they should be registered in the [FuseML Extension Registry](../extensions/extension-registry.md) and only referenced in the FuseML workflows as [extension requirements](../extensions/extension-registry.md#referencing-extensions-in-workflows).

- `MLFLOW_TRACKING_URI` - the URL of a remote MLflow tracking server to use.
- `MLFLOW_TRACKING_USERNAME` and `MLFLOW_TRACKING_PASSWORD` - username and password to use with HTTP Basic authentication to authenticate with the remote MLflow tracking server.
- `MLFLOW_S3_ENDPOINT_URL` - store artifacts in a custom S3 compatible artifact store (e.g. minio)
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` - credentials for a AWS S3 and S3-compatible artifact store

The recommended way to use an MLflow runtime step in a FuseML workflow is to have the MLflow builder step part of the same workflow and to reference its output as input to the MLflow runtime step, as shown in the example below. The MLflow builder workflow step is optimized to skip rebuilding the MLflow runtime environment container image during subsequent workflow executions if the software requirements haven't changed.

```yaml
name: train_mlflow_model
description: |
  Example workflow that builds a MLflow environment container image
  out of an MLflow compatible codeset and then uses it to run the MLflow
  code in the codeset to train and save a ML model."
inputs:
  - name: mlflow-codeset
    description: an MLFlow compatible codeset
    type: codeset
outputs:
  - name: model-url
    description: "The URL where the model is saved in the MLflow artifact store."
    type: string
steps:
  - name: builder
    image: ghcr.io/fuseml/mlflow-builder:latest
    inputs:
      - name: mlflow-codeset
        codeset:
          name: '{{ inputs.mlflow-codeset }}'
          path: /project
    outputs:
      - name: mlflow-runtime
  - name: trainer
    image: "{{ steps.builder.outputs.image }}"
    inputs:
      - name: mlflow-codeset
        codeset:
          name: "{{ inputs.mlflow-codeset }}"
          path: "/project"
    outputs:
      - name: model-url
    extensions:
      - name: mlflow-tracking
        product: mlflow
        service_resource: mlflow-tracking
      - name: mlflow-store
        product: mlflow
        service_resource: s3
```

Note how the `builder` step output is referenced as the image value for the `trainer` step and how both steps use the same `mlflow-codeset` codeset as input. The builder workflow step creates the MLflow environment container image and the trainer step uses it to execute the MLflow code and train the ML model.

Also observe how the `mlflow-tracking` and `mlflow-store` extensions are used in the `trainer` step to reference an MLflow tracking server and an artifact store backend configured in the [FuseML Extension Registry](../extensions/extension-registry.md). This avoids having to configure credentials and other environment variables explicitly in the FuseML workflow. The FuseML workflow engine automatically resolves these references to matching records available in the FuseML Extension Registry and passes the configuration entries in the extension records as environment variables to the workflow step container (i.e. variables like `MLFLOW_TRACKING_URI` , `MLFLOW_S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`).

