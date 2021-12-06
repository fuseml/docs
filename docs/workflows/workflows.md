# FuseML Workflows

FuseML workflows are automation processes built out of individual, reusable steps, connected together to form a pipeline. They are a way to automate the process of creating and deploying ML models. Running a workflow results in launching a number of jobs and services that are created and executed in the correct order to produce the desired outputs. Each step in a workflow is represented by a container image that implements a particular function in the MLOps lifecycle.

Workflow steps can also be thought of as integration mechanisms, especially if they connect to 3rd party services and/or act as adapters for 3rd party APIs. FuseML already features [a collection of workflow step container images](#fuseml-workflow-extensions) that implement a variety of ML functions, such as training and serving ML models.

FuseML workflows are configured using a declarative YAML syntax. The following is a simple example of a workflow that trains a model and then serves it. More workflow examples can be found in the [FuseML examples repository](https://github.com/fuseml/examples/tree/main/workflows).


```yaml
name: mlflow-e2e
description: |
  End-to-end pipeline template that takes in an MLFlow compatible codeset,
  runs the MLFlow project to train a model, then creates a KServe prediction
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
    image: ghcr.io/fuseml/kserve-predictor:latest
    inputs:
      - name: model
        value: "{{ steps.trainer.outputs.mlflow-model-url }}"
      - name: predictor
        value: "{{ inputs.predictor }}"
      - name: mlflow-codeset
        codeset:
          name: "{{ inputs.mlflow-codeset }}"
          path: "/project"
    outputs:
      - name: prediction-url
    extensions:
      - name: s3-storage
        service_resource: s3
      - name: kserve
        service_resource: kserve-api
```

Let's analyze the workflow definition section by section and explore what it all means.


```yaml
name: mlflow-e2e
description: |
  End-to-end pipeline template that takes in an MLFlow compatible codeset,
  runs the MLFlow project to train a model, then creates a KServe prediction
  service that can be used to run predictions against the model.
```

The workflow `name` is used to identify the workflow in all subsequent workflow operations, such as assigning codesets to it or listing its executions. The `description` is used to describe the workflow.

```yaml
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
```

This is where the workflow's global parameters, inputs and outputs are declared. Currently, the only type of supported input for FuseML workflows and steps is the codeset. In this example:

- the `mlflow-codeset` input is a codeset that contains python code that will be executed in this workflow to train a ML model. For this particular example, the codeset must include an MLflow project that meets the [MLFlow builder workflow extension requirements](mlflow-builder.md#overview), given that it is consumed by an MLflow builder step that is part of this workflow.
- the `predictor` parameter is used to specify the type of predictor engine used for the KServe prediction service that will be used to serve the model. It has a default value of `auto`, which will instruct the workflow to automatically select the predictor engine that best fits the trained model.
- the `prediction-url` output is the URL where the prediction service endpoint can be accessed to run prediction requests against the trained model.

The inputs, parameters and outputs declared globally are available to all steps in the workflow. In the next sections, we'll see how inputs, parameters and outputs are declared for individual steps and how they are connected to the ones declared globally.

```yaml
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
```

The `steps` section declares the individual steps that will be executed in the workflow. Steps are executed in the order in which they are listed here.

The first step in the example workflow is an [MLFlow builder step](mlflow-builder.md). Its function is to build a container image that has all the necessary software requirements installed and is able to run the code in the MLflow codeset. The step has the following attributes:

- `name`: uniquely identifies this step in the workflow. This can also be used to reference the step in other places throughout the workflow, for example to consume its output in the next step.
- `image`: the container image implementing the workflow step. In our case, this is the [MLFlow builder step](mlflow-builder.md) container image that is maintained by the FuseML team.
- `mlflow-codeset` input: the codeset that contains the MLflow project and code that will be used to train the ML model. Note how this input references the global input with the same name.
- `image` output: the MLflow runtime container image built by this step that is used at the next step to train the ML model.

```yaml
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
```

The second step in the workflow is responsible for executing the ML code in the input codeset to train a ML model and return the location where the trained model is stored in the MLflow artifact store. The step has the following attributes:

- `name`: uniquely identifies this step in the workflow.
- `image`: the container image implementing the workflow step. The expression `{{ steps.builder.outputs.image }}` is used to reference the image built by the previous step.
- `mlflow-codeset` input: the codeset that contains the MLflow project and code that will be used to train the ML model. Note how this input references the global input with the same name.
- `mlflow-model-url` output: the URL where the trained model is stored in the MLflow artifact store. This value is used as input in the next step to create the prediction service that serves the trained model.
- `extensions` is used as a way to reference 3rd party tools and services that are registered with the FuseML Extension Registry. In our example, the MLflow code needs to access a remote MLflow Tracking service to store logs and metrics and the S3 back-end of its artifact store. The FuseML workflow engine will automatically resolve these references and provide the configuration values necessary to access the services in the form of environment variables.

```yaml
  - name: predictor
    image: ghcr.io/fuseml/kserve-predictor:latest
    inputs:
      - name: model
        value: "{{ steps.trainer.outputs.mlflow-model-url }}"
      - name: predictor
        value: "{{ inputs.predictor }}"
      - name: app_name
        value: "{{ inputs.mlflow-codeset.name }}-{{ inputs.mlflow-codeset.project }}"
    outputs:
      - name: prediction-url
    extensions:
      - name: s3-storage
        service_resource: s3
      - name: kserve
        service_resource: kserve-api
```

The third and final step in the workflow is responsible for creating a KServe prediction service that can be used to run predictions against the model trained and stored at the previous step. The service instance will be recorded by FuseML in the form of a FuseML Application. The step has the following attributes:

- `name`: uniquely identifies this step in the workflow.
- `image`: the container image implementing the workflow step. In our case, this is the [KServe predictor step](kserve-predictor.md) container image that is maintained by the FuseML team.
- `predictor` parameter: this is a KServe predictor specific parameter that can be used to configure the type of KServe predictor engine used for the prediction service.
- `app_name` parameter: this is another KServe predictor specific parameter. It determines the name of the FuseML application used to represent the KServe prediction service. Its value also determines the prediction URL as well as the names of the Kubernetes resources created by the KServe predictor. Our example uses an expression to dynamically sets the `app_name` parameter to the name and project of the MLflow codeset used as workflow input.
- `prediction-url` output: the URL exposed by the KServe prediction service where prediction requests can be sent to the served ML model.
- `extensions` is used as a way to reference 3rd party tools and services that are registered with the FuseML Extension Registry. In our example, the KServe prediction step needs access to a cluster where KServe is installed. The FuseML workflow engine will automatically resolve this reference and provide the configuration values necessary to access the KServe API services in the form of environment variables to the workflow step container image.

## FuseML Workflow Extensions

A set of container images implementing various workflow extensions are maintained by the FuseML team. If you are interested in using a specific workflow extension, you can find the container image implementing it in the [FuseML extensions repository](https://github.com/fuseml/extensions/tree/main/images). They can be used in FuseML workflows to easily integrate with 3rd party tools and services providing features like ML experiment tracking, artifact storage, prediction services, and more: 

- [MLFlow builder](mlflow-builder.md) - builds python runtime environment container images for codesets that are structured according to the [MLFlow Project format](https://www.mlflow.org/docs/latest/projects.html).
- [KServe predictor](kserve-predictor.md) - deploys models using the [KServe inference platform](https://kserve.github.io/website/).
- [Seldon Core predictor](seldon-core-predictor.md) - deploys ML models using the [Seldon Core MLOps platform](https://docs.seldon.io/projects/seldon-core/en/latest/).
- [OVMS converter](ovms-converter.md) and [predictor](ovms-predictor.md) - can be used to optimize and convert ML models into the Intel IR format with the [OpenVINO Model Optimizer](https://docs.openvino.ai/latest/openvino_docs_MO_DG_Deep_Learning_Model_Optimizer_DevGuide.html) and then deploy them using the [OpenVINO Model Server](https://docs.openvino.ai/latest/openvino_docs_ovms.html).

